const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const completeCustomerProfile = async (userId, body) => {
    const existing = await prisma.customerProfile.findUnique({ where: { userId } });
    if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Customer profile already exists');
    }
    return prisma.customerProfile.create({ data: { userId, ...body } });
};

const getMyCustomerProfile = async (userId) => {
    const profile = await prisma.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Customer profile not found');
    }
    return profile;
};

const updateCustomerProfile = async (userId, body) => {
    const existing = await prisma.customerProfile.findUnique({ where: { userId } });
    if (!existing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Complete your profile first');
    }
    return prisma.customerProfile.update({ where: { userId }, data: body });
};

module.exports = { completeCustomerProfile, getMyCustomerProfile, updateCustomerProfile };