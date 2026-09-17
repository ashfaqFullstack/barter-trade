const httpStatus = require('http-status').default;
const catchAsync = require('../utils/catchAsync');
const listingService = require('../services/listing.service');
const cloudinaryService = require('../services/cloudinary.service');

const getUploadSignature = catchAsync(async (req, res) => {
    const data = cloudinaryService.generateListingUploadSignature();
    res.send(data);
});

const createListing = catchAsync(async (req, res) => {
    const listing = await listingService.createListing(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(listing);
});

const updateListing = catchAsync(async (req, res) => {
    const listing = await listingService.updateListing(req.user.id, req.params.listingId, req.body);
    res.send(listing);
});

const deleteListing = catchAsync(async (req, res) => {
    const result = await listingService.deleteListing(req.user.id, req.params.listingId);
    if (result) {
        return res.send(result); // archived (paused) instead of deleted
    }
    res.status(httpStatus.NO_CONTENT).send();
});

const getListings = catchAsync(async (req, res) => {
    const result = await listingService.getListings(req.query);
    res.send(result);
});

const getListing = catchAsync(async (req, res) => {
    const listing = await listingService.getListingById(req.params.listingId);
    res.send(listing);
});

const getMyListings = catchAsync(async (req, res) => {
    const listings = await listingService.getMyListings(req.user.id);
    res.send(listings);
});

module.exports = { getUploadSignature, createListing, updateListing, deleteListing, getListings, getListing, getMyListings };