
const prisma = require('../config/prisma');
const companyAccountService = require('./companyAccount.service');
const currencyService = require('./currency.service');

const getAdminCurrency = async () => ({
    currencyCode: 'AUD',
    rate: await currencyService.getRate('AUD'),
});

const getCompanyAccount = async () => {
    const [account, currency] = await Promise.all([
        companyAccountService.getOrCreateCompanyAccount(),
        getAdminCurrency(),
    ]);

    return {
        ...account,
        display: currencyService.attachDisplay(account, ['totalBalance'], currency).display,
    };
};

const getAllTransactions = async ({ page = 1, limit = 10 }) => {
    const [results, total, currency] = await Promise.all([
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
        getAdminCurrency(),
    ]);

    const displayFields = ['amount', 'commissionBuyer', 'commissionSeller'];
    return {
        results: results.map((transaction) => ({
            ...transaction,
            display: currencyService.attachDisplay(transaction, displayFields, currency).display,
        })),
        currency: currency.currencyCode,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

const getCommissionLogs = async ({ page = 1, limit = 10 }) => {
    const where = { type: 'TRADE_COMMISSION' };

    const [results, total, currency] = await Promise.all([
        prisma.feeLog.findMany({
            where,
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.feeLog.count({ where }),
        getAdminCurrency(),
    ]);

    return {
        results: results.map((log) => ({
            ...log,
            display: currencyService.attachDisplay(log, ['amount'], currency).display,
        })),
        currency: currency.currencyCode,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

const getDashboardStats = async () => {
    const [totalUsers, pendingUsers, totalTransactions, totalListings, companyAccount] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.transaction.count(),
        prisma.listing.count(),
        companyAccountService.getOrCreateCompanyAccount(),
    ]);

    const currency = await getAdminCurrency();
    return {
        currency: currency.currencyCode,
        totalUsers,
        pendingUsers,
        totalTransactions,
        totalListings,
        companyBalance: currencyService.convertWithRate(
            companyAccount.totalBalance,
            currency.rate,
            currency.currencyCode,
        ),
    };
};

const getSalesChart = async (days = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
        where: { createdAt: { gte: startDate }, status: 'SUCCESS' },
        select: { amount: true, commissionBuyer: true, commissionSeller: true, createdAt: true },
    });

    // Build one bucket per day so days with zero trades still show up
    const buckets = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        buckets.push({
            date: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            volume: 0,
            revenue: 0,
            trades: 0,
        });
    }

    transactions.forEach((t) => {
        const key = t.createdAt.toISOString().slice(0, 10);
        const bucket = buckets.find((b) => b.date === key);
        if (!bucket) return;
        bucket.volume += Number(t.amount);
        bucket.revenue += Number(t.commissionBuyer) + Number(t.commissionSeller);
        bucket.trades += 1;
    });

    const currency = await getAdminCurrency();
    return buckets.map((bucket) => ({
        ...bucket,
        volume: currencyService.convertWithRate(bucket.volume, currency.rate, currency.currencyCode),
        revenue: currencyService.convertWithRate(bucket.revenue, currency.rate, currency.currencyCode),
        currency: currency.currencyCode,
    }));
};

module.exports = { getCompanyAccount, getAllTransactions, getCommissionLogs, getDashboardStats, getSalesChart };