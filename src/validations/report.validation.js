const Joi = require('joi');

const getTransactions = {
    query: Joi.object().keys({
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

const getCommissionLogs = {
    query: Joi.object().keys({
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

module.exports = { getTransactions, getCommissionLogs };