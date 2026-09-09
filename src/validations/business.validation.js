const Joi = require('joi');

const saveStep = {
    body: Joi.object().keys({
        // Step 1: Business Details
        businessName: Joi.string(),
        tradingName: Joi.string().allow(''),
        businessRegistrationNumber: Joi.string().allow(''),
        category: Joi.string(),
        website: Joi.string().uri().allow(''),
        country: Joi.string(),
        address: Joi.string(),
        city: Joi.string(),

        // Step 2: Contact Details
        phone: Joi.string(),
        secondaryContactName: Joi.string().allow(''),
        secondaryContactPhone: Joi.string().allow(''),
        secondaryContactEmail: Joi.string().email().allow(''),

        // Step 3: Membership
        membershipTier: Joi.string().valid('STANDARD', 'GOLD', 'PLATINUM'),
    }),
};

const saveDocuments = {
    body: Joi.object().keys({
        documents: Joi.array()
            .items(
                Joi.object().keys({
                    url: Joi.string().required(),
                    publicId: Joi.string().required(),
                    fileType: Joi.string().valid('PHOTO_ID', 'PROOF_OF_ADDRESS').required(),
                })
            )
            .min(1)
            .required(),
    }),
};

module.exports = { saveStep, saveDocuments };