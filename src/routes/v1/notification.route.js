const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { notificationValidation } = require('../../validations');
const { notificationController } = require('../../controllers');

const router = express.Router();

router.get('/status', auth(), validate(notificationValidation.status), notificationController.status);
router.post('/subscribe', auth(), validate(notificationValidation.subscribe), notificationController.subscribe);
router.post('/unsubscribe', auth(), validate(notificationValidation.unsubscribe), notificationController.unsubscribe);

module.exports = router;