const Joi = require('joi');

const subscribe = {
    body: Joi.object().keys({
        endpoint: Joi.string().required(),
        expirationTime: Joi.string().allow(null),
        keys: Joi.object().keys({
            p256dh: Joi.string().required(),
            auth: Joi.string().required(),
        }).required(),
    }),
};

const unsubscribe = {
    body: Joi.object().keys({
        endpoint: Joi.string().required(),
    }),
};

module.exports = { subscribe, unsubscribe };