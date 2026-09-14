const bcrypt = require('bcrypt');
const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');

const getMyWallet = async (userId) => {
    const [wallet, user] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId } }),
        prisma.user.findUnique({ where: { id: userId }, select: { transactionPin: true } }),
    ]);

    if (!wallet) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found — your account may not be approved yet');
    }

    return { ...wallet, hasPin: !!user.transactionPin };
};

const setPin = async (userId, pin) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.transactionPin) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'PIN already set — use change PIN instead');
    }

    const hashedPin = await bcrypt.hash(pin, 8);
    return prisma.user.update({
        where: { id: userId },
        data: { transactionPin: hashedPin, pinSetAt: new Date(), failedPinAttempts: 0, pinLockedUntil: null },
    });
};

// Shared helper — will be reused by the trade-transaction flow later.
const verifyPin = async (userId, pin) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.transactionPin) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No PIN set on this account');
    }

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
        throw new ApiError(httpStatus.FORBIDDEN, `PIN locked. Try again in ${minutesLeft} minute(s)`);
    }

    const isMatch = await bcrypt.compare(pin, user.transactionPin);

    if (!isMatch) {
        const attempts = user.failedPinAttempts + 1;
        const data = { failedPinAttempts: attempts };

        if (attempts >= config.pin.maxAttempts) {
            data.pinLockedUntil = new Date(Date.now() + config.pin.lockMinutes * 60 * 1000);
            data.failedPinAttempts = 0;
        }

        await prisma.user.update({ where: { id: userId }, data });

        if (data.pinLockedUntil) {
            throw new ApiError(httpStatus.FORBIDDEN, `Too many failed attempts. PIN locked for ${config.pin.lockMinutes} minutes`);
        }
        throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect PIN');
    }

    // correct PIN — reset failed attempts
    if (user.failedPinAttempts > 0) {
        await prisma.user.update({ where: { id: userId }, data: { failedPinAttempts: 0 } });
    }

    return true;
};

const changePin = async (userId, oldPin, newPin) => {
    await verifyPin(userId, oldPin);
    const hashedPin = await bcrypt.hash(newPin, 8);
    return prisma.user.update({ where: { id: userId }, data: { transactionPin: hashedPin } });
};

const forgotPin = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 8);

    await prisma.pinResetToken.create({
        data: {
            userId,
            token: hashedOtp,
            expires: new Date(Date.now() + 10 * 60 * 1000),
        },
    });

    await emailService.sendPinResetOtpEmail(user.email, otp);
};

const resetPin = async (userId, otp, newPin) => {
    const record = await prisma.pinResetToken.findFirst({
        where: { userId, used: false, expires: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
    });

    if (!record || !(await bcrypt.compare(otp, record.token))) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
    }

    const hashedPin = await bcrypt.hash(newPin, 8);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { transactionPin: hashedPin, failedPinAttempts: 0, pinLockedUntil: null },
        }),
        prisma.pinResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);
};

module.exports = { getMyWallet, setPin, verifyPin, changePin, forgotPin, resetPin };