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
    body: Joi.object().keys({
        reason: Joi.string().required(),
    }),
};

const getUserDetails = {
    params: Joi.object().keys({
        userId: Joi.string().uuid().required(),
    }),
};

const getAllUsers = {
    query: Joi.object().keys({
        role: Joi.string().valid('CUSTOMER', 'BUSINESS', 'ADMIN'),
        status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'),
        search: Joi.string(),
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(10),
    }),
};

const userIdParam = {
    params: Joi.object().keys({
        userId: Joi.string().uuid().required(),
    }),
};

module.exports = { getPendingUsers, approveUser, rejectUser, getUserDetails, getAllUsers, userIdParam };