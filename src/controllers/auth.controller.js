const { userService, authService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status').default;
const { tokenService } = require('../services');
const { User } = require('../models');

const register = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    const tokens = await tokenService.generateAuthTokens(user)
    res.status(httpStatus.CREATED).send({ user, tokens })
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailandPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);

    res.send({ user, tokens })
})
const logoutUser = catchAsync(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(httpStatus.NO_CONTENT).send();
})

const resetPassword = catchAsync(async (req, res) => {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
    await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
    res.status(httpStatus.NO_CONTENT).send();
})

const refreshToken = catchAsync(async (req, res) => {
    const tokens = await authService.refreshAuth(req.body.refreshToken)
    res.send({ ...tokens })
})

module.exports = {
    register,
    login,
    logoutUser,
    resetPassword,
    refreshToken
}