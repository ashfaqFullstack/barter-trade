const Joi = require('joi');

const completeProfile = {
    body: Joi.object().keys({
        phone: Joi.string(),
        address: Joi.string(),
        city: Joi.string(),
        profilePicture: Joi.string(),
    }),
};

module.exports = { completeProfile };