const Joi = require('joi');

const sendTransaction = {
    body: Joi.object().keys({
        receiverId: Joi.string().uuid().required(),
        amount: Joi.number().positive().required(),
        pin: Joi.string().pattern(/^\d{4,6}$/).required(),
    }),
};

const getReceipt = {
    params: Joi.object().keys({
        receiptId: Joi.string().uuid().required(),
    }),
};

const getMyTransactions = {
    query: Joi.object().keys({
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

module.exports = { sendTransaction, getReceipt, getMyTransactions };