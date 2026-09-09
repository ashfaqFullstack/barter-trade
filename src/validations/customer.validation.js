const Joi = require('joi');

const completeProfile = {
    body: Joi.object().keys({
        phone: Joi.string(),
        address: Joi.string(),
        city: Joi.string(),
        profilePicture: Joi.string(),
        country: Joi.string(),
        membershipTier: Joi.string().valid('STANDARD', 'GOLD', 'PLATINUM'),
    }),
};

module.exports = { completeProfile };