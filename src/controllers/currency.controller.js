
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');
const currencyService = require('../services/currency.service');

// Public, read-only: { base: 'USD', updatedAt, rates: { PKR: 280.1, ... } }
const getAllRates = catchAsync(async (req, res) => {
    res.send(await currencyService.getAllRates());
});

// The logged-in user's own currency: { currencyCode, rate }
const getMyCurrency = catchAsync(async (req, res) => {
    res.send(await currencyService.getUserCurrency(req.user.id));
});

// "Receiver will get ≈ X" preview for Send Money.
const previewConversion = catchAsync(async (req, res) => {
    const { receiverId, amount } = req.query;
    res.send(await currencyService.previewConversion(req.user.id, receiverId, amount, config.trade.commissionPercent));
});

module.exports = { getAllRates, getMyCurrency, previewConversion };