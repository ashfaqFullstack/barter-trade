const { cloudinaryService, emailService } = require('.');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');


const getPendingUsers = async (filter, options) => {
    const { role, limit = 10, page = 1 } = { ...filter, ...options };

    const where = {
        status: 'PENDING',
        AND: [
            { role: { not: 'ADMIN' } },
            ...(role ? [{ role }] : []),
        ],
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                country: true,
                status: true,
                createdAt: true,
                businessProfile: { include: { documents: true } },
                customerProfile: true,
            },
            skip: (page - 1) * limit,
            take: Number(limit),
            orderBy: { createdAt: 'asc' },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        results: users,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};


const approveUser = async (userId, creditLimit) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status !== 'PENDING') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending users can be approved');
    }

    const startingLimit = creditLimit ?? config.wallet.defaultCreditLimit;

    const updatedUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
            where: { id: userId },
            data: { status: 'APPROVED' },
        });

        await tx.wallet.create({
            data: { userId, balance: 0, creditLimit: startingLimit },
        });

        if (user.role === 'BUSINESS') {
            await tx.businessProfile.updateMany({
                where: { userId },
                data: { verificationStatus: 'APPROVED', verifiedAt: new Date() },
            });
        }

        return updated;
    });

    await emailService.sendApprovalEmail(updatedUser.email, updatedUser.name);

    return updatedUser;
};

const rejectUser = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status !== 'PENDING') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending users can be rejected');
    }

    return prisma.user.update({
        where: { id: userId },
        data: { status: 'REJECTED' },
    });
};

const getUserDetails = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            country: true,
            status: true,
            createdAt: true,
            businessProfile: { include: { documents: true } },
            customerProfile: true,
        },
    });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.businessProfile?.documents) {
        user.businessProfile.documents = user.businessProfile.documents.map((doc) => ({
            ...doc,
            viewUrl: cloudinaryService.generateSignedViewUrl(doc.publicId),
        }));
    }

    return user;
};

module.exports = { getPendingUsers, approveUser, rejectUser, getUserDetails };

