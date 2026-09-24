const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');
const companyAccountService = require('./companyAccount.service');
const emailService = require('./email.service');
const currencyService = require('./currency.service');
const { notificationService } = require('.');

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

    const [buyerCurrency, sellerCurrency] = await Promise.all([
        currencyService.getUserCurrency(buyerId),
        currencyService.getUserCurrency(listing.businessId),
    ]);
    const amount = Number(listing.price);
    const buyerAmount = currencyService.convertAmount(amount, sellerCurrency.rate, buyerCurrency.rate);
    const commissionPercent = config.trade.commissionPercent;
    const commissionBuyer = (buyerAmount * commissionPercent) / 100;
    const commissionSeller = (amount * commissionPercent) / 100;
    const netAmountToSeller = amount - commissionSeller;
    const totalDebit = buyerAmount + commissionBuyer;

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
                buyerAmount,
                buyerCurrency: buyerCurrency.currencyCode,
                sellerCurrency: sellerCurrency.currencyCode,
                buyerRate: buyerCurrency.rate,
                sellerRate: sellerCurrency.rate,
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


    await notificationService.sendPushToUser(listing.businessId, {
        title: 'New Order Received',
        body: `New order for "${listing.title}" — $${amount}`,
        url: '/dashboard/orders/received',
    });

    return order;
};

const completeOrder = async (buyerId, orderId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    if (order.buyerId !== buyerId) throw new ApiError(httpStatus.FORBIDDEN, 'You do not own this order');
    if (order.status !== 'ESCROW_HELD') throw new ApiError(httpStatus.BAD_REQUEST, 'Order is not in escrow');

    return prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: order.sellerId },
            data: { balance: { increment: order.netAmountToSeller } },
        });

        const sellerCurrency = order.sellerRate
            ? { rate: order.sellerRate }
            : await currencyService.getUserCurrency(order.sellerId, tx);
        const buyerCurrency = order.buyerRate
            ? { rate: order.buyerRate }
            : await currencyService.getUserCurrency(order.buyerId, tx);
        const companyCommission = Number(order.commissionBuyer) + currencyService.convertAmount(
            order.commissionSeller,
            sellerCurrency.rate,
            buyerCurrency.rate,
        );
        await companyAccountService.creditCompanyAccount(tx, companyCommission);

        const transaction = await tx.transaction.create({
            data: {
                senderId: order.buyerId,
                receiverId: order.sellerId,
                amount: order.buyerAmount ?? order.amount,
                convertedAmount: order.amount,
                senderCurrency: order.buyerCurrency,
                receiverCurrency: order.sellerCurrency,
                senderRate: order.buyerRate,
                receiverRate: order.sellerRate,
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
};

const cancelOrder = async (userId, orderId) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not part of this order');
    }
    if (order.status !== 'ESCROW_HELD') throw new ApiError(httpStatus.BAD_REQUEST, 'Order cannot be cancelled');

    const refundAmount = Number(order.buyerAmount ?? order.amount) + Number(order.commissionBuyer);

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
    });
};
const profileSelect = {
    select: {
        id: true,
        name: true,
        role: true,
        businessProfile: { select: { businessName: true, city: true, address: true } },
        customerProfile: { select: { city: true, address: true } },
    },
};

const getMyOrders = async (buyerId) => {
    return prisma.order.findMany({
        where: { buyerId },
        include: { listing: true, seller: profileSelect },
        orderBy: { createdAt: 'desc' },
    });
};

const getReceivedOrders = async (sellerId) => {
    return prisma.order.findMany({
        where: { sellerId },
        include: { listing: true, buyer: profileSelect },
        orderBy: { createdAt: 'desc' },
    });
};

module.exports = { createOrder, completeOrder, cancelOrder, getMyOrders, getReceivedOrders };