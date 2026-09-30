
const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { currencyValidation } = require('../../validations');
const { currencyController } = require('../../controllers');

const router = express.Router();

// Rates are 100% automatic (live API + background refresh) — read-only for everyone.
router.get('/', currencyController.getAllRates);
router.get('/me', auth(), currencyController.getMyCurrency);
router.get('/preview', auth(), validate(currencyValidation.previewConversion), currencyController.previewConversion);

module.exports = router;