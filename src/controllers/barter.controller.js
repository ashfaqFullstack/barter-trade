const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const barterService = require('../services/barter.service');

const createOffer = catchAsync(async (req, res) => {
    const offer = await barterService.createOffer(req.user.id, req.body.offererListingId, req.body.targetListingId);
    res.status(httpStatus.CREATED).send(offer);
});

const acceptOffer = catchAsync(async (req, res) => {
    const offer = await barterService.acceptOffer(req.user.id, req.params.offerId);
    res.send(offer);
});

const rejectOffer = catchAsync(async (req, res) => {
    const offer = await barterService.rejectOffer(req.user.id, req.params.offerId);
    res.send(offer);
});

const cancelOffer = catchAsync(async (req, res) => {
    const offer = await barterService.cancelOffer(req.user.id, req.params.offerId);
    res.send(offer);
});

const getMyOffers = catchAsync(async (req, res) => {
    const offers = await barterService.getMyOffers(req.user.id);
    res.send(offers);
});

const getReceivedOffers = catchAsync(async (req, res) => {
    const offers = await barterService.getReceivedOffers(req.user.id);
    res.send(offers);
});

const getOfferDetail = catchAsync(async (req, res) => {
    const offer = await barterService.getOfferById(req.user.id, req.params.offerId);
    res.send(offer);
});

module.exports = { createOffer, acceptOffer, rejectOffer, cancelOffer, getMyOffers, getReceivedOffers, getOfferDetail };