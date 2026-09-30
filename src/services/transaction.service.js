
const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');
const companyAccountService = require('./companyAccount.service');
const currencyService = require('./currency.service');
const notificationService = require('./notification.service');
const logger = require('../config/logger');
const { roundUsd, formatMoney } = require('../utils/money');

const TX_DISPLAY_FIELDS = ['amount', 'commissionBuyer', 'commissionSeller', 'netAmountToSeller'];

// `amount` is what the SENDER typed, in the sender's own currency.
// Everything is converted to USD once (live rate) and the ledger only ever sees USD.
const sendTransaction = async (senderId, receiverId, amount, pin) => {
    if (senderId === receiverId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot send money to yourself');
    }

    // 1. Verify PIN first — before touching any balance.
    await walletService.verifyPin(senderId, pin);

    const [senderWallet, receiverWallet, senderCurrency] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId: senderId } }),
        prisma.wallet.findUnique({ where: { userId: receiverId } }),
        currencyService.getUserCurrency(senderId),
    ]);

    if (!senderWallet) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Your wallet is not set up yet');
    }
    if (!receiverWallet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Receiver wallet not found');
    }

    // Sender's typed amount (e.g. 280 PKR) -> USD base, using the live rate right now.
    const usdAmount = roundUsd(Number(amount) / senderCurrency.rate);
    if (usdAmount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Amount is too small');
    }

    const commissionPercent = config.trade.commissionPercent;
    const commissionBuyer = roundUsd((usdAmount * commissionPercent) / 100);
    const commissionSeller = roundUsd((usdAmount * commissionPercent) / 100);
    const netAmountToSeller = roundUsd(usdAmount - commissionSeller);
    const totalDebit = roundUsd(usdAmount + commissionBuyer);

    const projectedBalance = Number(senderWallet.balance) - totalDebit;
    const creditLimit = Number(senderWallet.creditLimit);

    if (projectedBalance < -creditLimit) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance / credit limit for this transaction');
    }

    const transaction = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: senderId },
            data: { balance: { decrement: totalDebit } },
        });

        await tx.wallet.update({
            where: { userId: receiverId },
            data: { balance: { increment: netAmountToSeller } },
        });

        // Company ledger is always USD.
        await companyAccountService.creditCompanyAccount(tx, roundUsd(commissionBuyer + commissionSeller));

        const created = await tx.transaction.create({
            data: {
                senderId,
                receiverId,
                amount: usdAmount,
                inputAmount: amount,
                inputCurrency: senderCurrency.currencyCode,
                exchangeRate: senderCurrency.rate,
                commissionBuyer,
                commissionSeller,
                netAmountToSeller,
                status: 'SUCCESS',
            },
        });

        // Audit trail — commission portions logged per side.
        await tx.monthlyFeeLog.createMany({
            data: [
                { userId: senderId, amount: commissionBuyer, type: 'TRADE_COMMISSION' },
                { userId: receiverId, amount: commissionSeller, type: 'TRADE_COMMISSION' },
            ],
        });

        return created;
    });

    // Notifications show each person's amount in THEIR OWN currency.
    const receiverCurrency = await currencyService.getUserCurrency(receiverId);
    const receivedText = formatMoney(
        currencyService.convertWithRate(transaction.netAmountToSeller, receiverCurrency.rate, receiverCurrency.currencyCode),
        receiverCurrency.currencyCode,
    );
    const sentText = formatMoney(amount, senderCurrency.currencyCode);

    const notificationResults = await Promise.allSettled([
        notificationService.sendPushToUser(receiverId, {
            title: 'Payment Received',
            body: `You received ${receivedText}.`,
            url: '/dashboard/wallet/history',
        }),
        notificationService.sendPushToUser(senderId, {
            title: 'Payment Sent',
            body: `You sent ${sentText}.`,
            url: '/dashboard/wallet/history',
        }),
    ]);

    for (const result of notificationResults) {
        if (result.status === 'rejected') {
            logger.error(`Trade notification failed: ${result.reason.message}`);
        }
    }

    return currencyService.attachDisplay(transaction, TX_DISPLAY_FIELDS, senderCurrency);
};

const getReceipt = async (userId, receiptId) => {
    const transaction = await prisma.transaction.findUnique({
        where: { receiptId },
        include: {
            sender: { select: { id: true, name: true, email: true } },
            receiver: { select: { id: true, name: true, email: true } },
        },
    });

    if (!transaction) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Receipt not found');
    }
    if (transaction.senderId !== userId && transaction.receiverId !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this receipt');
    }

    const viewerCurrency = await currencyService.getUserCurrency(userId);
    return currencyService.attachDisplay(transaction, TX_DISPLAY_FIELDS, viewerCurrency);
};

const getMyTransactions = async (userId, { page = 1, limit = 10 }) => {
    const where = { OR: [{ senderId: userId }, { receiverId: userId }] };
    const viewerCurrency = await currencyService.getUserCurrency(userId);

    const [results, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.transaction.count({ where }),
    ]);

    return {
        results: results.map((t) => currencyService.attachDisplay(t, TX_DISPLAY_FIELDS, viewerCurrency)),
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

module.exports = { sendTransaction, getReceipt, getMyTransactions };