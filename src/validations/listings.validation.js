const Joi = require('joi');

const createListing = {
    body: Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().positive().required(),
        category: Joi.string().required(),
        imageUrls: Joi.array().items(Joi.string()).default([]),
        isPublic: Joi.boolean(),
    }),
};

const updateListing = {
    params: Joi.object().keys({
        listingId: Joi.string().uuid().required(),
    }),
    body: Joi.object().keys({
        title: Joi.string(),
        description: Joi.string(),
        price: Joi.number().positive(),
        category: Joi.string(),
        imageUrls: Joi.array().items(Joi.string()),
        status: Joi.string().valid('ACTIVE', 'PAUSED'),
        isPublic: Joi.boolean(),
    }),
};

const getListings = {
    query: Joi.object().keys({
        category: Joi.string(),
        country: Joi.string(),
        minPrice: Joi.number().min(0),
        maxPrice: Joi.number().min(0),
        search: Joi.string(),
        sort: Joi.string().valid('priceAsc', 'priceDesc', 'newest').default('newest'),
        page: Joi.number().integer().default(1),
        limit: Joi.number().integer().default(12),
    }),
};

const getListing = {
    params: Joi.object().keys({
        listingId: Joi.string().uuid().required(),
    }),
};

module.exports = { createListing, updateListing, getListings, getListing };