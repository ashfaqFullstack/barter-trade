const prisma = require('../config/prisma');
const { UserModel } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status').default;
const dns = require('dns').promises;

/**
 * Create a user (validates email domain via DNS MX lookup)
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
    if (await UserModel.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }

    const domain = userBody.email.split('@')[1];
    let mxRecords;
    try {
        mxRecords = await dns.resolveMx(domain);
    } catch (error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The email domain does not exist or is invalid');
    }

    if (!mxRecords || mxRecords.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'The provided email domain cannot receive emails');
    }

    const hashedPassword = await UserModel.hashPassword(userBody.password);

    const user = await prisma.user.create({
        data: {
            ...userBody,
            password: hashedPassword,
        },
    });

    return UserModel.sanitizeUser(user);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
const getUserByEmail = async (email) => {
    return prisma.user.findUnique({ where: { email } });
};

/**
 * Get user by UUID
 * @param {string} userId
 * @returns {Promise<User|null>}
 */
const getUserById = async (userId) => {
    return prisma.user.findUnique({ where: { id: userId } });
};

/**
 * Paginated query for admin user listing
 * @param {Object} filter - Prisma where clause
 * @param {Object} options - { sortBy, limit, page }
 * @returns {Promise<PaginatedResult>}
 */
const queryUsers = async (filter, options) => {
    return UserModel.paginate(filter, options);
};

/**
 * Update user by UUID
 * @param {string} userId
 * @param {Object} userData
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, userData) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User with associated id not found');
    }

    if (userData.email && (await UserModel.isEmailTaken(userData.email, userId))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'This email is already reserved by another user');
    }

    // Hash password if it's being updated
    if (userData.password) {
        userData.password = await UserModel.hashPassword(userData.password);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userData,
    });

    return UserModel.sanitizeUser(updatedUser);
};

/**
 * Delete user by UUID
 * @param {string} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    await prisma.user.delete({ where: { id: userId } });

    return UserModel.sanitizeUser(user);
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    queryUsers,
    updateUserById,
    deleteUserById,
};
