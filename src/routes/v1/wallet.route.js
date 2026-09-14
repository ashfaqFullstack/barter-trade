const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { walletValidation } = require('../../validations');
const { walletController } = require('../../controllers');

const router = express.Router();

router.get('/me', auth(), walletController.getMyWallet);
router.post('/pin/set', auth(), validate(walletValidation.setPin), walletController.setPin);
router.post('/pin/change', auth(), validate(walletValidation.changePin), walletController.changePin);
router.post('/pin/forgot', auth(), walletController.forgotPin);
router.post('/pin/reset', auth(), validate(walletValidation.resetPin), walletController.resetPin);

module.exports = router;