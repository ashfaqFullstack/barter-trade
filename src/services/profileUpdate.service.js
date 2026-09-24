const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const createRequest = async (userId, data) => {
    const existing = await prisma.profileUpdateRequest.findFirst({
        where: { userId, status: 'PENDING' },
    });
    if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You already have a profile update pending review');
    }

    return prisma.profileUpdateRequest.create({
        data: {
            userId,
            proposedData: data.proposedData,
            documentsToAdd: data.documentsToAdd || [],
            documentIdsToRemove: data.documentIdsToRemove || [],
        },
    });
};

const getMyPendingRequest = async (userId) => {
    return prisma.profileUpdateRequest.findFirst({
        where: { userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
    });
};

module.exports = { createRequest, getMyPendingRequest };