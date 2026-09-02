const prisma = require('../config/prisma');

const getPendingUsers = async (filter, options) => {
    const { role, limit = 10, page = 1 } = { ...filter, ...options };

    const where = { status: 'PENDING', ...(role && { role }) };

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

module.exports = { getPendingUsers };