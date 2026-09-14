const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const transactionService = require('../services/transaction.service');
const qrService = require('../services/qr.service');

const getMyQrCode = catchAsync(async (req, res) => {
    const data = await qrService.generateMyQrCode(req.user.id);
    res.send(data);
});

const sendTransaction = catchAsync(async (req, res) => {
    const { receiverId, amount, pin } = req.body;
    const transaction = await transactionService.sendTransaction(req.user.id, receiverId, amount, pin);
    res.status(httpStatus.CREATED).send(transaction);
});

const getReceipt = catchAsync(async (req, res) => {
    const transaction = await transactionService.getReceipt(req.user.id, req.params.receiptId);
    res.send(transaction);
});

const getMyTransactions = catchAsync(async (req, res) => {
    const result = await transactionService.getMyTransactions(req.user.id, req.query);
    res.send(result);
});

module.exports = { getMyQrCode, sendTransaction, getReceipt, getMyTransactions };