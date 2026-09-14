const Joi = require('joi');

const pinPattern = Joi.string().pattern(/^\d{4,6}$/).message('PIN must be 4-6 digits');

const setPin = {
    body: Joi.object().keys({
        pin: pinPattern.required(),
    }),
};

const changePin = {
    body: Joi.object().keys({
        oldPin: pinPattern.required(),
        newPin: pinPattern.required(),
    }),
};

const resetPin = {
    body: Joi.object().keys({
        otp: Joi.string().length(6).required(),
        newPin: pinPattern.required(),
    }),
};

module.exports = { setPin, changePin, resetPin };