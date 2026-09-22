const Joi = require('joi');

const salesChart = {
    query: Joi.object({
        period: Joi.number()
            .integer()
            .valid(...[7, 30, 90])
            .default(7),
    }),
};

module.exports = { salesChart };