const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const orderService = require('../services/order.service');

const createOrder = catchAsync(async (req, res) => {
    const order = await orderService.createOrder(req.user.id, req.body.listingId, req.body.pin);
    res.status(httpStatus.CREATED).send(order);
});

const completeOrder = catchAsync(async (req, res) => {
    const order = await orderService.completeOrder(req.user.id, req.params.orderId);
    res.send(order);
});

const cancelOrder = catchAsync(async (req, res) => {
    const order = await orderService.cancelOrder(req.user.id, req.params.orderId);
    res.send(order);
});

const getMyOrders = catchAsync(async (req, res) => {
    const orders = await orderService.getMyOrders(req.user.id);
    res.send(orders);
});

const getReceivedOrders = catchAsync(async (req, res) => {
    const orders = await orderService.getReceivedOrders(req.user.id);
    res.send(orders);
});

module.exports = { createOrder, completeOrder, cancelOrder, getMyOrders, getReceivedOrders };