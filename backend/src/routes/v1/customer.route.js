const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { customerValidation } = require('../../validations');
const { customerController } = require('../../controllers');


const router = express.Router();

router.post('/profile', auth(), validate(customerValidation.completeProfile), customerController.completeProfile);
router.get('/profile', auth(), customerController.getMyProfile);
router.patch('/profile', auth(), validate(customerValidation.completeProfile), customerController.updateProfile);

module.exports = router;