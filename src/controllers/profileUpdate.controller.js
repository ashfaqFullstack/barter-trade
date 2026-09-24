const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const profileUpdateService = require('../services/profileUpdate.service');

const createRequest = catchAsync(async (req, res) => {
    const request = await profileUpdateService.createRequest(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(request);
});

const getMyPendingRequest = catchAsync(async (req, res) => {
    const request = await profileUpdateService.getMyPendingRequest(req.user.id);
    res.send(request);
});

module.exports = { createRequest, getMyPendingRequest };