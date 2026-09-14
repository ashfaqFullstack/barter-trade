const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const walletService = require('./wallet.service');
const companyAccountService = require('./companyAccount.service');

const sendTransaction = async (senderId, receiverId, amount, pin) => {
    if (senderId === receiverId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot send trade dollars to yourself');
    }

    // 1. Verify PIN first — before touching any balance.
    await walletService.verifyPin(senderId, pin);

    const [senderWallet, receiverWallet] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId: senderId } }),
        prisma.wallet.findUnique({ where: { userId: receiverId } }),
    ]);

    if (!senderWallet) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Your wallet is not set up yet');
    }
    if (!receiverWallet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Receiver wallet not found');
    }

    const commissionPercent = config.trade.commissionPercent;
    const commissionBuyer = (amount * commissionPercent) / 100;
    const commissionSeller = (amount * commissionPercent) / 100;
    const netAmountToSeller = amount - commissionSeller;
    const totalDebit = amount + commissionBuyer;

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

        await companyAccountService.creditCompanyAccount(tx, commissionBuyer + commissionSeller);

        const transaction = await tx.transaction.create({
            data: {
                senderId,
                receiverId,
                amount,
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