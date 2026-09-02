const prisma = require('../config/prisma');
const { UserModel } = require('../models');
const ApiError = require('../utils/ApiError');
const { userService, tokenService } = require('.');
const emailService = require('../services/email.service')
const httpStatus = require('http-status').default;
const { tokenTypes } = require('../config/tokens');
const bcrypt = require('bcrypt');

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


const forgotPassword = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No user found with this email');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const hashedOtp = await bcrypt.hash(otp, 8);

    await prisma.passwordResetOtp.create({
        data: {
            userId: user.id,
            otp: hashedOtp,
            expires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        },
    });

    await emailService.sendOtpEmail(email, otp);
};

const resetPassword = async (email, otp, newPassword) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No user found with this email');
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
        where: { userId: user.id, used: false, expires: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || !(await bcrypt.compare(otp, otpRecord.otp))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
    }

    const hashedPassword = await UserModel.hashPassword(newPassword);

    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
        prisma.passwordResetOtp.update({ where: { id: otpRecord.id }, data: { used: true } }),
    ]);
};

module.exports = {
    loginUserWithEmailandPassword,
    logout,
    refreshAuth,
    forgotPassword,
    resetPassword
};
