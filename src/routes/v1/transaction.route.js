const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { transactionValidation } = require('../../validations');
const { transactionController } = require('../../controllers');

const router = express.Router();

router.get('/qr', auth(), transactionController.getMyQrCode);
router.post('/send', auth(), validate(transactionValidation.sendTransaction), transactionController.sendTransaction);
router.get('/me', auth(), validate(transactionValidation.getMyTransactions), transactionController.getMyTransactions);
router.get('/:receiptId', auth(), validate(transactionValidation.getReceipt), transactionController.getReceipt);

module.exports = router;