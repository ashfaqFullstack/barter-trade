const Joi = require('joi');

const completeProfile = {
    body: Joi.object().keys({
        businessName: Joi.string().required(),
        category: Joi.string().required(),
        phone: Joi.string(),
        address: Joi.string(),
        city: Joi.string(),
    }),
};

const saveDocuments = {
    body: Joi.object().keys({
        documents: Joi.array()
            .items(
                Joi.object().keys({
                    url: Joi.string().required(),
                    publicId: Joi.string().required(),
                    fileType: Joi.string().required(),
                })
            )
            .min(1)
            .required(),
    }),
};

module.exports = { completeProfile, saveDocuments };