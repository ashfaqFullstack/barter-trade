
const Joi = require('joi');

const digitsAndSpaces = Joi.string().pattern(/^[0-9 ]*$/).allow('').messages({
    'string.pattern.base': 'Only digits and spaces are allowed',
});

const saveStep = {
    body: Joi.object().keys({
        // Step 1: Business Details
        businessName: Joi.string(),
        acn: digitsAndSpaces,
        abn: digitsAndSpaces,
        streetNumber: Joi.string(),
        streetName: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        postcode: Joi.string(),
        country: Joi.string(),
        phone: Joi.string(),
        mobile: Joi.string(),
        website: Joi.string().uri().allow(''),
        socialLinks: Joi.string().max(1000).allow(''),

        // Step 2: Business Information + Verification
        category: Joi.string(),
        productsServices: Joi.string().max(2000),
        yearsInBusiness: Joi.number().integer().min(0).max(200),

        // Step 3: Membership
        membershipTier: Joi.string().valid('STANDARD', 'GOLD', 'PLATINUM'),

        // Step 5: Declaration (must be ticked)
        declarationAccepted: Joi.boolean().valid(true),
    }),
};

const saveDocuments = {
    body: Joi.object().keys({
        documents: Joi.array()
            .items(
                Joi.object().keys({
                    url: Joi.string().required(),
                    publicId: Joi.string().required(),
                    fileType: Joi.string().valid('PHOTO_ID', 'PROOF_OF_ADDRESS', 'BUSINESS_LICENCE').required(),
                })
            )
            .min(1)
            .required(),
    }),
};

module.exports = { saveStep, saveDocuments };