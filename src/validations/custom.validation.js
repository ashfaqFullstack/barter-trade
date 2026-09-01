const { validate: isUuid } = require('uuid');

/**
 * Joi custom validator for UUID v4
 */
const uuid = (value, helpers) => {
    if (!isUuid(value)) {
        return helpers.message('"{{#label}}" must be a valid UUID');
    }
    return value;
};

const password = (value, helpers) => {
    if (value.length < 8) {
        return helpers.message('Password must be at least 8 characters');
    }
    if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
        return helpers.message('Password must contain at least 1 letter and 1 number');
    }
    return value;
};

module.exports = {
    uuid,
    password,
};
