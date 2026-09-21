const Joi = require('joi');

const getTransactions = {
    query: Joi.object().keys({
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

const getFeeLogs = {
    query: Joi.object().keys({
        type: Joi.string().valid('MONTHLY_FEE', 'TRADE_COMMISSION'),
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

module.exports = { getTransactions, getFeeLogs };