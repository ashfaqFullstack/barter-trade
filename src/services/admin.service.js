const { cloudinaryService, emailService } = require('.');
const config = require('../config/config');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status').default;


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

const rejectUser = async (userId, reason) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (user.status !== 'PENDING') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending users can be rejected');
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: 'REJECTED', rejectionReason: reason },
    });

    await emailService.sendRejectionEmail(updatedUser.email, updatedUser.name, reason);

    return updatedUser;
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
            rejectionReason: true
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
const getAllUsers = async (filters) => {
    const { role, status, search, page = 1, limit = 10 } = filters;

    const where = {
        ...(role && { role }),
        ...(status && { status }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [results, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                country: true,
                createdAt: true,
                businessProfile: { select: { businessName: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.user.count({ where }),
    ]);

    return {
        results,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

const blockUser = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    if (user.role === 'ADMIN') throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot block an admin account');
    if (user.status === 'BLOCKED') throw new ApiError(httpStatus.BAD_REQUEST, 'User is already blocked');

    // Blocking should also kill any active sessions immediately.
    await prisma.token.deleteMany({ where: { userId } });

    return prisma.user.update({ where: { id: userId }, data: { status: 'BLOCKED' } });
};

const unblockUser = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    if (user.status !== 'BLOCKED') throw new ApiError(httpStatus.BAD_REQUEST, 'User is not blocked');

    return prisma.user.update({ where: { id: userId }, data: { status: 'APPROVED' } });
};

const companyAccountService = require('./companyAccount.service');

const fundAdminWallet = async (adminId, amount) => {
    const companyAccount = await companyAccountService.getOrCreateCompanyAccount();

    if (Number(companyAccount.totalBalance) < amount) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient company account balance');
    }

    return prisma.$transaction(async (tx) => {
        await tx.companyAccount.update({
            where: { id: companyAccountService.ACCOUNT_ID },
            data: { totalBalance: { decrement: amount } },
        });

        const wallet = await tx.wallet.upsert({
            where: { userId: adminId },
            create: { userId: adminId, balance: amount, creditLimit: 0 },
            update: { balance: { increment: amount } },
        });

        await tx.companyFundingLog.create({
            data: { adminId, amount },
        });

        return wallet;
    });
};

module.exports = {
    getPendingUsers,
    approveUser,
    rejectUser,
    getUserDetails,
    getAllUsers,
    blockUser,
    unblockUser,
    fundAdminWallet,
};