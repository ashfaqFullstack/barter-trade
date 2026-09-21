const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

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

module.exports = { getAllRates, createRate, updateRate, deleteRate };