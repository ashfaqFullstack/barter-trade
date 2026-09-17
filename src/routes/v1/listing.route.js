const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { listingController } = require('../../controllers');
const { listingValidation } = require('../../validations');

const router = express.Router();

// Specific routes BEFORE dynamic /:listingId (same rule as /users/me, /admin/users/pending)
router.get('/my-listings', auth('manageOwnListings'), listingController.getMyListings);
router.get('/upload-signature', auth('manageOwnListings'), listingController.getUploadSignature);

router.get('/', validate(listingValidation.getListings), listingController.getListings);
router.post('/', auth('manageOwnListings'), validate(listingValidation.createListing), listingController.createListing);

router.get('/:listingId', validate(listingValidation.getListing), listingController.getListing);
router.patch('/:listingId', auth('manageOwnListings'), validate(listingValidation.updateListing), listingController.updateListing);
router.delete('/:listingId', auth('manageOwnListings'), listingController.deleteListing);

module.exports = router;