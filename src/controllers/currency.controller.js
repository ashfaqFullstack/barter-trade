const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const currencyService = require('../services/currency.service');

const getAllRates = catchAsync(async (req, res) => {
    const rates = await currencyService.getAllRates();
    res.send(rates);
});

const createRate = catchAsync(async (req, res) => {
    const rate = await currencyService.createRate(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(rate);
});

const updateRate = catchAsync(async (req, res) => {
    const rate = await currencyService.updateRate(req.user.id, req.params.rateId, req.body);
    res.send(rate);
});

const deleteRate = catchAsync(async (req, res) => {
    await currencyService.deleteRate(req.params.rateId);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { getAllRates, createRate, updateRate, deleteRate };