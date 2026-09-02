const Joi = require('joi');

const getPendingUsers = {
    query: Joi.object().keys({
        role: Joi.string().valid('CUSTOMER', 'BUSINESS'),
        limit: Joi.number().integer().default(10),
        page: Joi.number().integer().default(1),
    }),
};

module.exports = { getPendingUsers };