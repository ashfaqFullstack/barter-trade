
const Joi = require('joi');

const previewConversion = {
    query: Joi.object().keys({
        receiverId: Joi.string().uuid().required(),
        amount: Joi.number().positive().required(),
    }),
};

module.exports = { previewConversion };