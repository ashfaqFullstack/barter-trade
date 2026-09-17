const Joi = require('joi');

const createOrder = {
    body: Joi.object().keys({
        listingId: Joi.string().uuid().required(),
        pin: Joi.string().pattern(/^\d{4,6}$/).required(),
    }),
};

const orderIdParam = {
    params: Joi.object().keys({
        orderId: Joi.string().uuid().required(),
    }),
};

module.exports = { createOrder, orderIdParam };