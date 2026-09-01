const prisma = require('../config/prisma');
const { UserModel } = require('../models');
const ApiError = require('../utils/ApiError');
const { userService, tokenService } = require('.');
const httpStatus = require('http-status').default;
const { tokenTypes } = require('../config/tokens');

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailandPassword = async (email, password) => {
    const user = await userService.getUserByEmail(email);
    if (!user || !(await UserModel.isPasswordMatch(password, user.password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect credentials');
    }
    return user;
};

/**
 * Logout: delete the refresh token from DB
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
    const refreshTokenDoc = await prisma.token.findFirst({
        where: { token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false },
    });
    if (!refreshTokenDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
    }
    await prisma.token.delete({ where: { id: refreshTokenDoc.id } });
};

/**
 * Refresh auth tokens
 * @param {string} token - refresh token
 * @returns {Promise<Tokens>}
 */
const refreshAuth = async (token) => {
    try {
        const refreshTokenDoc = await tokenService.verifyToken(token, tokenTypes.REFRESH);
        const user = await userService.getUserById(refreshTokenDoc.userId);
        if (!user) {
            throw new Error();
        }
        await prisma.token.delete({ where: { id: refreshTokenDoc.id } });
        return tokenService.generateAuthTokens(user);
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
};

module.exports = {
    loginUserWithEmailandPassword,
    logout,
    refreshAuth,
};
