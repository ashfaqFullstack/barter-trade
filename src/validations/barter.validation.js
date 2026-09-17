const Joi = require('joi');

const createOffer = {
    body: Joi.object().keys({
        offererListingId: Joi.string().uuid().required(),
        targetListingId: Joi.string().uuid().required(),
    }),
};

const offerIdParam = {
    params: Joi.object().keys({
        offerId: Joi.string().uuid().required(),
    }),
};

const getOfferDetail = {
    params: Joi.object().keys({
        offerId: Joi.string().uuid().required(),
    }),
};

module.exports = { createOffer, offerIdParam, getOfferDetail };