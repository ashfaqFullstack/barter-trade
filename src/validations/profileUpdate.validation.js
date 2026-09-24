const Joi = require('joi');

const createRequest = {
    body: Joi.object().keys({
        proposedData: Joi.object().required(),
        documentsToAdd: Joi.array().items(
            Joi.object().keys({
                url: Joi.string().required(),
                publicId: Joi.string().required(),
                fileType: Joi.string().valid('PHOTO_ID', 'PROOF_OF_ADDRESS').required(),
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