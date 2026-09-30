
const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');
const companyAccountService = require('./companyAccount.service');
const emailService = require('./email.service');
const currencyService = require('./currency.service');
const { roundUsd } = require('../utils/money');

const ORDER_DISPLAY_FIELDS = ['amount', 'commissionBuyer', 'commissionSeller', 'netAmountToSeller'];

const createOrder = async (buyerId, listingId, pin) => {
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { business: { select: { id: true } } },
    });

    if (!listing || listing.status !== 'ACTIVE') {
        throw new ApiError(httpStatus.NOT_FOUND, 'Listing not available');
    }
    if (listing.businessId === buyerId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot order your own listing');
    }

    await walletService.verifyPin(buyerId, pin);

    const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyerId } });
    if (!buyerWallet) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Your wallet is not set up yet');
    }

    const buyerCurrency = await currencyService.getUserCurrency(buyerId);

    // Listing price is already USD — the buyer just sees it converted, the ledger uses USD.
    const amount = Number(listing.price);
    const commissionPercent = config.trade.commissionPercent;
    const commissionBuyer = roundUsd((amount * commissionPercent) / 100);
    const commissionSeller = roundUsd((amount * commissionPercent) / 100);
    const netAmountToSeller = roundUsd(amount - commissionSeller);
    const totalDebit = roundUsd(amount + commissionBuyer);

    const projectedBalance = Number(buyerWallet.balance) - totalDebit;
    if (projectedBalance < -Number(buyerWallet.creditLimit)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance / credit limit for this order');
    }

    const order = await prisma.$transaction(async (tx) => {
        // Debit buyer now — funds are "held" (not yet credited to seller/company)
        await tx.wallet.update({
            where: { userId: buyerId },
            data: { balance: { decrement: totalDebit } },
        });

        // Prevent double-ordering the same item while it's in escrow
        await tx.listing.update({ where: { id: listingId }, data: { status: 'PAUSED' } });

        return tx.order.create({
            data: {
                listingId,
                buyerId,
                sellerId: listing.businessId,
                amount,
                buyerCurrency: buyerCurrency.currencyCode,
                buyerRate: buyerCurrency.rate,
                commissionBuyer,
                commissionSeller,
                netAmountToSeller,
                status: 'ESCROW_HELD',
            },
        });
    });

    const [buyer, seller] = await Promise.all([
        prisma.user.findUnique({ where: { id: order.buyerId }, select: { email: true } }),
        prisma.user.findUnique({ where: { id: order.sellerId }, select: { email: true } }),
    ]);
    await Promise.all([
        emailService.sendOrderPlacedEmail(buyer.email),
        emailService.sendNewOrderReceivedEmail(seller.email),
    ]);

    return currencyService.attachDisplay(order, ORDER_DISPLAY_FIELDS, buyerCurrency);
};

const completeOrder = async (buyerId, orderId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    if (order.buyerId !== buyerId) throw new ApiError(httpStatus.FORBIDDEN, 'You do not own this order');
    if (order.status !== 'ESCROW_HELD') throw new ApiError(httpStatus.BAD_REQUEST, 'Order is not in escrow');

    const completed = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: order.sellerId },
            data: { balance: { increment: order.netAmountToSeller } },
        });

        // Company ledger is always USD.
        await companyAccountService.creditCompanyAccount(
            tx,
            roundUsd(Number(order.commissionBuyer) + Number(order.commissionSeller)),
        );

        const transaction = await tx.transaction.create({
            data: {
                senderId: order.buyerId,
                receiverId: order.sellerId,
                amount: order.amount,
                inputCurrency: order.buyerCurrency,
                exchangeRate: order.buyerRate,
                commissionBuyer: order.commissionBuyer,
                commissionSeller: order.commissionSeller,
                netAmountToSeller: order.netAmountToSeller,
                status: 'SUCCESS',
            },
        });

        await tx.monthlyFeeLog.createMany({
            data: [
                { userId: order.buyerId, amount: order.commissionBuyer, type: 'TRADE_COMMISSION' },
                { userId: order.sellerId, amount: order.commissionSeller, type: 'TRADE_COMMISSION' },
            ],
        });

        await tx.listing.update({ where: { id: order.listingId }, data: { status: 'TRADED' } });

        return tx.order.update({
            where: { id: orderId },
            data: { status: 'COMPLETED', completedAt: new Date(), receiptId: transaction.receiptId },
        });
    });

    const viewerCurrency = await currencyService.getUserCurrency(buyerId);
    return currencyService.attachDisplay(completed, ORDER_DISPLAY_FIELDS, viewerCurrency);
};

const cancelOrder = async (userId, orderId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not part of this order');
    }
    if (order.status !== 'ESCROW_HELD') throw new ApiError(httpStatus.BAD_REQUEST, 'Order cannot be cancelled');

    const refundAmount = roundUsd(Number(order.amount) + Number(order.commissionBuyer));

    return prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: order.buyerId },
            data: { balance: { increment: refundAmount } },
        });

        await tx.listing.update({ where: { id: order.listingId }, data: { status: 'ACTIVE' } });

        return tx.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
    }).then(async (cancelled) => {
        const viewerCurrency = await currencyService.getUserCurrency(userId);
        return currencyService.attachDisplay(cancelled, ORDER_DISPLAY_FIELDS, viewerCurrency);
    });
};
const profileSelect = {
    select: {
        id: true,
        name: true,
        role: true,
        businessProfile: { select: { businessName: true, streetNumber: true, streetName: true, city: true, state: true, postcode: true } },
        customerProfile: { select: { city: true, address: true } },
    },
};

// Every order/listing amount is shown in the VIEWER's own currency (buyer or seller).
const withViewerDisplay = async (userId, orders) => {
    const viewerCurrency = await currencyService.getUserCurrency(userId);
    return orders.map((order) => ({
        ...currencyService.attachDisplay(order, ORDER_DISPLAY_FIELDS, viewerCurrency),
        listing: order.listing ? currencyService.attachDisplay(order.listing, ['price'], viewerCurrency) : order.listing,
    }));
};

const getMyOrders = async (buyerId) => {
    const orders = await prisma.order.findMany({
        where: { buyerId },
        include: { listing: true, seller: profileSelect },
        orderBy: { createdAt: 'desc' },
    });
    return withViewerDisplay(buyerId, orders);
};

const getReceivedOrders = async (sellerId) => {
    const orders = await prisma.order.findMany({
        where: { sellerId },
        include: { listing: true, buyer: profileSelect },
        orderBy: { createdAt: 'desc' },
    });
    return withViewerDisplay(sellerId, orders);
};

module.exports = { createOrder, completeOrder, cancelOrder, getMyOrders, getReceivedOrders };