const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const customerService = require('../services/customer.service');

const completeProfile = catchAsync(async (req, res) => {
    const profile = await customerService.completeCustomerProfile(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(profile);
});

const getMyProfile = catchAsync(async (req, res) => {
    const profile = await customerService.getMyCustomerProfile(req.user.id);
    res.send(profile);
});

const updateProfile = catchAsync(async (req, res) => {
    const profile = await customerService.updateCustomerProfile(req.user.id, req.body);
    res.send(profile);
});

module.exports = { completeProfile, getMyProfile, updateProfile };