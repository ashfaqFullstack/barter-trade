const config = require('../config/config');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { tokenTypes } = require('../config/tokens');
const moment = require('moment');
const { userService } = require('.');

/**
 * Generate a signed JWT
 * @param {string} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

/**
 * Persist a token in the DB via Prisma
 * @param {string} token
 * @param {string} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
    return prisma.token.create({
        data: {
            token,
            userId,
            expires: expires.toDate(),
            type,
            blacklisted,
        },
    });
};

/**
 * Generate access + refresh token pair
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
    const accessTokenExp = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateToken(user.id, accessTokenExp, tokenTypes.ACCESS);

    const refreshTokenExp = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateToken(user.id, refreshTokenExp, tokenTypes.REFRESH);
    await saveToken(refreshToken, user.id, refreshTokenExp, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExp.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExp.toDate(),
        },
    };
};

/**
 * Generate reset-password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        const ApiError = require('../utils/ApiError');
        const httpStatus = require('http-status').default;
        throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
    }
    const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
    const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
    await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
    return resetPasswordToken;
};

/**
 * Verify a token and return the token document
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await prisma.token.findFirst({
        where: {
            token,
            type,
            userId: payload.sub,
            blacklisted: false,
        },
    });
    if (!tokenDoc) {
        throw new Error('Token not found');
    }
    return tokenDoc;
};

module.exports = {
    generateToken,
    saveToken,
    generateAuthTokens,
    generateResetPasswordToken,
    verifyToken,
};
