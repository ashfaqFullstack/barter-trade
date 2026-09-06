const Joi = require('joi');

const getPendingUsers = {
    query: Joi.object().keys({
        role: Joi.string().valid('CUSTOMER', 'BUSINESS'),
        limit: Joi.number().integer().default(10),
        page: Joi.number().integer().default(1),
    }),
};

const approveUser = {
    params: Joi.object().keys({
        userId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        creditLimit: Joi.number().min(0),
    }),
};

const rejectUser = {
    params: Joi.object().keys({
        userId: Joi.string().uuid().required(),
    }),
};


const getUserDetails = {
    params: Joi.object().keys({
        userId: Joi.string().uuid().required(),
    }),
};



module.exports = { getPendingUsers, approveUser, rejectUser, getUserDetails };