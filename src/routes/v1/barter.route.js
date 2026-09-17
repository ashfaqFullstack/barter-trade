const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { barterValidation } = require('../../validations');
const { barterController } = require('../../controllers');

const router = express.Router();

router.get('/me', auth(), barterController.getMyOffers);
router.get('/received', auth(), barterController.getReceivedOffers);

router.post('/', auth(), validate(barterValidation.createOffer), barterController.createOffer);
router.get('/:offerId', auth(), validate(barterValidation.getOfferDetail), barterController.getOfferDetail);
router.patch('/:offerId/accept', auth(), validate(barterValidation.offerIdParam), barterController.acceptOffer);
router.patch('/:offerId/reject', auth(), validate(barterValidation.offerIdParam), barterController.rejectOffer);
router.patch('/:offerId/cancel', auth(), validate(barterValidation.offerIdParam), barterController.cancelOffer);

module.exports = router;