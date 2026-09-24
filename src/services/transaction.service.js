const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');
const companyAccountService = require('./companyAccount.service');
const currencyService = require('./currency.service');
const notificationService = require('./notification.service');

const sendTransaction = async (senderId, receiverId, amount, pin) => {
    if (senderId === receiverId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot send trade dollars to yourself');
    }

    // 1. Verify PIN first — before touching any balance.
    await walletService.verifyPin(senderId, pin);

    const [senderWallet, receiverWallet, senderCurrency, receiverCurrency] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId: senderId } }),
        prisma.wallet.findUnique({ where: { userId: receiverId } }),
        currencyService.getUserCurrency(senderId),
        currencyService.getUserCurrency(receiverId),
    ]);

    if (!senderWallet) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Your wallet is not set up yet');
    }
    if (!receiverWallet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Receiver wallet not found');
    }

    const convertedAmount = currencyService.convertAmount(amount, senderCurrency.rate, receiverCurrency.rate);
    const commissionPercent = config.trade.commissionPercent;
    const commissionBuyer = (Number(amount) * commissionPercent) / 100;
    const commissionSeller = (convertedAmount * commissionPercent) / 100;
    const netAmountToSeller = convertedAmount - commissionSeller;
    const totalDebit = Number(amount) + commissionBuyer;

    const projectedBalance = Number(senderWallet.balance) - totalDebit;
    const creditLimit = Number(senderWallet.creditLimit);

    if (projectedBalance < -creditLimit) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance / credit limit for this transaction');
    }

    return prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { userId: senderId },
            data: { balance: { decrement: totalDebit } },
        });

        await tx.wallet.update({
            where: { userId: receiverId },
            data: { balance: { increment: netAmountToSeller } },
        });

        // Keep the single company ledger in the sender's currency.
        const companyCommission = commissionBuyer + currencyService.convertAmount(
            commissionSeller,
            receiverCurrency.rate,
            senderCurrency.rate,
        );
        await companyAccountService.creditCompanyAccount(tx, companyCommission);

        const transaction = await tx.transaction.create({
            data: {
                senderId,
                receiverId,
                amount,
                convertedAmount,
                senderCurrency: senderCurrency.currencyCode,
                receiverCurrency: receiverCurrency.currencyCode,
                senderRate: senderCurrency.rate,
                receiverRate: receiverCurrency.rate,
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

        await notificationService.sendPushToUser(receiverId, {
            title: 'Trade Dollars Received',
            body: `You received $${transaction.netAmountToSeller} trade dollars.`,
            url: '/dashboard/wallet/history',
        });

        return transaction;
    });
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

    return transaction;
};

const getMyTransactions = async (userId, { page = 1, limit = 10 }) => {
    const where = { OR: [{ senderId: userId }, { receiverId: userId }] };

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
        results,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

module.exports = { sendTransaction, getReceipt, getMyTransactions };