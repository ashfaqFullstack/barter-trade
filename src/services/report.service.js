const prisma = require('../config/prisma');
const companyAccountService = require('./companyAccount.service');

const getCompanyAccount = async () => {
    return companyAccountService.getOrCreateCompanyAccount();
};

const getAllTransactions = async ({ page = 1, limit = 10 }) => {
    const [results, total] = await Promise.all([
        prisma.transaction.findMany({
            include: {
                sender: { select: { id: true, name: true, email: true } },
                receiver: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.transaction.count(),
    ]);

    return { results, page: Number(page), limit: Number(limit), totalResults: total, totalPages: Math.ceil(total / limit) };
};

const getFeeLogs = async ({ type, page = 1, limit = 10 }) => {
    const where = type ? { type } : {};

    const [results, total] = await Promise.all([
        prisma.monthlyFeeLog.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.monthlyFeeLog.count({ where }),
    ]);

    return { results, page: Number(page), limit: Number(limit), totalResults: total, totalPages: Math.ceil(total / limit) };
};

const getDashboardStats = async () => {
    const [totalUsers, pendingUsers, totalTransactions, totalListings, companyAccount] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.transaction.count(),
        prisma.listing.count(),
        companyAccountService.getOrCreateCompanyAccount(),
    ]);

    return {
        totalUsers,
        pendingUsers,
        totalTransactions,
        totalListings,
        companyBalance: companyAccount.totalBalance,
    };
};

module.exports = { getCompanyAccount, getAllTransactions, getFeeLogs, getDashboardStats };