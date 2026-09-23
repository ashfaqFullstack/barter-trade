const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const getUserCurrency = async (userId, client = prisma) => {
    const user = await client.user.findUnique({
        where: { id: userId },
        select: {
            country: true,
            businessProfile: { select: { country: true } },
            customerProfile: { select: { country: true } },
        },
    });

    const country = user?.country || user?.businessProfile?.country || user?.customerProfile?.country;
    if (!country) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Please set your country before transferring Trade Dollars');
    }

    const currency = await client.countryCurrencyRate.findUnique({ where: { countryName: country } });
    if (!currency) {
        throw new ApiError(httpStatus.BAD_REQUEST, `No currency rate configured for ${country}`);
    }

    return currency;
};

// Rates are quoted as units of a currency per USD. Convert through USD.
const convertAmount = (amount, fromRate, toRate) => {
    return Number((Number(amount) * Number(toRate) / Number(fromRate)).toFixed(2));
};

const getAllRates = async () => {
    return prisma.countryCurrencyRate.findMany({ orderBy: { countryName: 'asc' } });
};

const createRate = async (adminId, data) => {
    const existing = await prisma.countryCurrencyRate.findUnique({ where: { countryName: data.countryName } });
    if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'A rate for this country already exists');
    }

    return prisma.countryCurrencyRate.create({
        data: { ...data, source: 'ADMIN', updatedById: adminId },
    });
};

const updateRate = async (adminId, rateId, data) => {
    const existing = await prisma.countryCurrencyRate.findUnique({ where: { id: rateId } });
    if (!existing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Currency rate not found');
    }

    return prisma.countryCurrencyRate.update({
        where: { id: rateId },
        data: { ...data, source: 'ADMIN', updatedById: adminId },
    });
};

const deleteRate = async (rateId) => {
    const existing = await prisma.countryCurrencyRate.findUnique({ where: { id: rateId } });
    if (!existing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Currency rate not found');
    }
    await prisma.countryCurrencyRate.delete({ where: { id: rateId } });
};

module.exports = { getAllRates, createRate, updateRate, deleteRate, getUserCurrency, convertAmount };