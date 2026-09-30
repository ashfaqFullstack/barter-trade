
const Joi = require('joi');

const createRequest = {
    body: Joi.object().keys({
        // Whitelist: only editable profile fields (no membership tier / declaration / verification status).
        proposedData: Joi.object()
            .keys({
                // customer + business
                phone: Joi.string().allow(''),
                country: Joi.string(),
                city: Joi.string(),
                address: Joi.string().allow(''), // customer only
                // business
                businessName: Joi.string(),
                acn: Joi.string().pattern(/^[0-9 ]*$/).allow(''),
                abn: Joi.string().pattern(/^[0-9 ]*$/).allow(''),
                streetNumber: Joi.string().allow(''),
                streetName: Joi.string().allow(''),
                state: Joi.string().allow(''),
                postcode: Joi.string().allow(''),
                mobile: Joi.string().allow(''),
                website: Joi.string().allow(''),
                socialLinks: Joi.string().max(1000).allow(''),
                category: Joi.string(),
                productsServices: Joi.string().max(2000).allow(''),
                yearsInBusiness: Joi.number().integer().min(0).max(200),
            })
            .required(),
        documentsToAdd: Joi.array().items(
            Joi.object().keys({
                url: Joi.string().required(),
                publicId: Joi.string().required(),
                fileType: Joi.string().valid('PHOTO_ID', 'PROOF_OF_ADDRESS', 'BUSINESS_LICENCE').required(),
            })
        ).default([]),
        documentIdsToRemove: Joi.array().items(Joi.string().uuid()).default([]),
    }),
};

const requestIdParam = {
    params: Joi.object().keys({
        requestId: Joi.string().uuid().required(),
    }),
};

module.exports = { createRequest, requestIdParam };