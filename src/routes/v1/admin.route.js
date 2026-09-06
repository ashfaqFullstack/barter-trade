const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminValidation } = require('../../validations');
const { adminController } = require('../../controllers');

const router = express.Router();

router.get('/users/pending', auth('approveUsers'), validate(adminValidation.getPendingUsers), adminController.getPendingUsers);
router.patch('/users/:userId/approve', auth('approveUsers'), validate(adminValidation.approveUser), adminController.approveUser);
router.patch('/users/:userId/reject', auth('approveUsers'), validate(adminValidation.rejectUser), adminController.rejectUser);
router.get('/users/:userId', auth('approveUsers'), validate(adminValidation.getUserDetails), adminController.getUserDetails);

module.exports = router;