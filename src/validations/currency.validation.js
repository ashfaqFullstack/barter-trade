const Joi = require('joi');

const createRate = {
    body: Joi.object().keys({
        countryName: Joi.string().required(),
        currencyCode: Joi.string().required(),
        currencySymbol: Joi.string().required(),
        rate: Joi.number().positive().required(),
    }),
};

const updateRate = {
    params: Joi.object().keys({
        rateId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        currencyCode: Joi.string(),
        currencySymbol: Joi.string(),
        rate: Joi.number().positive(),
    }),
};

const deleteRate = {
    params: Joi.object().keys({
        rateId: Joi.string().uuid().required(),
    }),
};

module.exports = { createRate, updateRate, deleteRate };