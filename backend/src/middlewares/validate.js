const Joi = require('joi');
const httpStatus = require('http-status').default;
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

const validate = (schema) => (req, res, next) => {
    const validSchema = pick(schema, ['params', 'query', 'body']);
    const object = pick(req, Object.keys(validSchema));
    const { error } = Joi.compile(validSchema)
        .prefs({ errors: { label: 'key' }, abortEarly: false })
        .validate(object);

    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    const value = Joi.compile(validSchema).validate(object).value;

    Object.keys(validSchema).forEach((key) => {
        if (req[key] && value[key]) {
            Object.assign(req[key], value[key]);
        }
    });

    return next();
};

module.exports = validate;