const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

/**
 * Check if an email is already taken
 * @param {string} email
 * @param {string} [excludeUserId]
 * @returns {Promise<boolean>}
 */
const isEmailTaken = async (email, excludeUserId) => {
    const user = await prisma.user.findFirst({
        where: {
            email,
            ...(excludeUserId && { id: { not: excludeUserId } }),
        },
    });
    return !!user;
};

/**
 * Check if a plain password matches the stored hash
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const isPasswordMatch = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

/**
 * Hash a plain-text password
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, 8);
};

/**
 * Strip the password field from a user object
 * @param {Object} user
 * @returns {Object}
 */
const sanitizeUser = (user) => {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
};

/**
 * Paginate users
 * @param {Object} filter - Prisma where clause
 * @param {Object} options - { sortBy, limit, page }
 * @returns {Promise<{ results, page, limit, totalPages, totalResults }>}
 */
const paginate = async (filter, options) => {
    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Parse sortBy: "name:asc,email:desc" → { name: 'asc', email: 'desc' }
    let orderBy = [{ createdAt: 'asc' }];
    if (options.sortBy) {
        orderBy = options.sortBy.split(',').map((sortOption) => {
            const [key, direction] = sortOption.split(':');
            return { [key]: direction === 'desc' ? 'desc' : 'asc' };
        });
    }

    const [totalResults, users] = await Promise.all([
        prisma.user.count({ where: filter }),
        prisma.user.findMany({
            where: filter,
            skip,
            take: limit,
            orderBy,
            omit: { password: true },
        }),
    ]);

    return {
        results: users,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
    };
};

module.exports = {
    isEmailTaken,
    isPasswordMatch,
    hashPassword,
    sanitizeUser,
    paginate,
};
