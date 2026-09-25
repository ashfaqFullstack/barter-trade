const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notification.service');

const status = catchAsync(async (req, res) => {
    const enabled = await notificationService.hasSubscription(req.user.id, req.query.endpoint);
    res.send({ enabled });
});

const subscribe = catchAsync(async (req, res) => {
    await notificationService.saveSubscription(req.user.id, req.body);
    res.status(httpStatus.CREATED).send({ message: 'Subscribed' });
});

const unsubscribe = catchAsync(async (req, res) => {
    await notificationService.removeSubscription(req.body.endpoint);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { status, subscribe, unsubscribe };