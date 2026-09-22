const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const VALID_PERIODS = [7, 30, 90];

const normalizePeriod = (period) => {
    const normalizedPeriod = period === undefined ? 7 : Number(period);

    if (!Number.isInteger(normalizedPeriod) || !VALID_PERIODS.includes(normalizedPeriod)) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Period must be one of 7, 30, or 90'
        );
    }

    return normalizedPeriod;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getStartDate = (period) => {
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (period - 1));
    return startDate;
};

const buildSalesChart = (orders, startDate, period, dateField) => {
    const buckets = new Map();

    for (let index = 0; index < period; index += 1) {
        const date = new Date(startDate);
        date.setUTCDate(date.getUTCDate() + index);
        buckets.set(toDateKey(date), { date: toDateKey(date), amount: 0, orders: 0 });
    }

    orders.forEach((order) => {
        const date = toDateKey(order[dateField]);
        const bucket = buckets.get(date);
        if (!bucket) return;

        bucket.amount += Number(order.amount);
        bucket.orders += 1;
    });

    return Array.from(buckets.values()).map((bucket) => ({
        ...bucket,
        amount: Number(bucket.amount.toFixed(2)),
    }));
};

const getCurrency = async (client, user) => {
    if (!user.country) return 'USD';

    const currencyRate = await client.countryCurrencyRate.findUnique({
        where: { countryName: user.country },
        select: { currencyCode: true },
    });

    return currencyRate?.currencyCode || 'USD';
};

const createDashboardService = (client = prisma) => ({
    async getSummary(user) {
        if (!['CUSTOMER', 'BUSINESS'].includes(user.role)) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Dashboard is only available to customers and businesses');
        }



        const orderWhere = user.role === 'BUSINESS' ? { sellerId: user.id } : { buyerId: user.id };
        const barterWhere = { OR: [{ offererId: user.id }, { targetOwnerId: user.id }] };

        const [totalOrders, totalBarterOffers, totalListings, sales] = await Promise.all([
            client.order.count({ where: orderWhere }),
            client.barterOffer.count({ where: barterWhere }),
            client.listing.count({ where: { businessId: user.id } }),
            user.role === 'BUSINESS'
                ? client.order.aggregate({
                    where: { sellerId: user.id, status: 'COMPLETED' },
                    _sum: { amount: true },
                })
                : Promise.resolve({ _sum: { amount: null } }),
        ]);

        const summary = { totalOrders, totalBarterOffers, totalListings };
        if (user.role === 'BUSINESS') {
            summary.totalSales = Number(sales._sum.amount || 0);
        }

        return summary;
    },

    async getSalesChart(user, period = 7) {
        if (!['CUSTOMER', 'BUSINESS'].includes(user.role)) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                'Dashboard is only available to customers and businesses'
            );
        }

        const normalizedPeriod = normalizePeriod(period);
        const startDate = getStartDate(normalizedPeriod);
        const dateField = user.role === 'BUSINESS' ? 'completedAt' : 'createdAt';

        const where = user.role === 'BUSINESS'
            ? {
                sellerId: user.id,
                status: 'COMPLETED',
                completedAt: { gte: startDate },
            }
            : {
                buyerId: user.id,
                createdAt: { gte: startDate },
            };

        const [orders, currency] = await Promise.all([
            client.order.findMany({
                where,
                select: {
                    amount: true,
                    [dateField]: true,
                },
            }),
            getCurrency(client, user),
        ]);

        return {
            period: normalizedPeriod,
            currency,
            data: buildSalesChart(
                orders,
                startDate,
                normalizedPeriod,
                dateField
            ),
        };
    }
});

const dashboardService = createDashboardService();

module.exports = {
    ...dashboardService,
    createDashboardService,
    buildSalesChart,
    getStartDate,
    normalizePeriod,
    VALID_PERIODS,
};