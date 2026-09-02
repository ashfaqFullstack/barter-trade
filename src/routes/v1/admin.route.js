const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminValidation } = require('../../validations');
const { adminController } = require('../../controllers');

const router = express.Router();

router.get('/users/pending', auth('approveUsers'), validate(adminValidation.getPendingUsers), adminController.getPendingUsers);

module.exports = router;