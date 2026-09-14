const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const walletService = require('../services/wallet.service');

const getMyWallet = catchAsync(async (req, res) => {
    const wallet = await walletService.getMyWallet(req.user.id);
    res.send(wallet);
});

const setPin = catchAsync(async (req, res) => {
    await walletService.setPin(req.user.id, req.body.pin);
    res.status(httpStatus.NO_CONTENT).send();
});

const changePin = catchAsync(async (req, res) => {
    await walletService.changePin(req.user.id, req.body.oldPin, req.body.newPin);
    res.status(httpStatus.NO_CONTENT).send();
});

const forgotPin = catchAsync(async (req, res) => {
    await walletService.forgotPin(req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
});

const resetPin = catchAsync(async (req, res) => {
    await walletService.resetPin(req.user.id, req.body.otp, req.body.newPin);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { getMyWallet, setPin, changePin, forgotPin, resetPin };