const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { currencyValidation } = require('../../validations');
const { currencyController } = require('../../controllers');

const router = express.Router();

// Public — anyone (logged in or not) can read the rates for display
router.get('/', currencyController.getAllRates);

// Admin-only management
router.post('/', auth('manageCurrencyRates'), validate(currencyValidation.createRate), currencyController.createRate);
router.patch('/:rateId', auth('manageCurrencyRates'), validate(currencyValidation.updateRate), currencyController.updateRate);
router.delete('/:rateId', auth('manageCurrencyRates'), validate(currencyValidation.deleteRate), currencyController.deleteRate);

module.exports = router;