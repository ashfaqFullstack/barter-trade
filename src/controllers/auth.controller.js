const { userService, authService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status').default;
const { tokenService } = require('../services');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');

const register = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    const tokens = await tokenService.generateAuthTokens(user)
    setAuthCookies(res, tokens);
    res.status(httpStatus.CREATED).send({ user })
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailandPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    setAuthCookies(res, tokens);
    res.send({ user })
})
const logoutUser = catchAsync(async (req, res) => {
    await authService.logout(req.cookies.refreshToken);
    clearAuthCookies(res);
    res.status(httpStatus.NO_CONTENT).send();
});

const refreshToken = catchAsync(async (req, res) => {
    const tokens = await authService.refreshAuth(req.cookies.refreshToken);
    setAuthCookies(res, tokens);
    res.send({ message: "Tokens refreshed successfully" });
});

const forgotPassword = catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
    await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    register,
    login,
    logoutUser,
    forgotPassword,
    resetPassword,
    refreshToken
}