const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminValidation } = require('../../validations');
const { adminController } = require('../../controllers');

const router = express.Router();

router.get('/users/pending', auth('approveUsers'), validate(adminValidation.getPendingUsers), adminController.getPendingUsers);
router.get('/users', auth('manageUsers'), validate(adminValidation.getAllUsers), adminController.getAllUsers);
router.post('/company-account/fund-wallet', auth('viewCompanyAccount'), validate(adminValidation.fundWallet), adminController.fundWallet);
router.patch('/users/:userId/approve', auth('approveUsers'), validate(adminValidation.approveUser), adminController.approveUser);
router.patch('/users/:userId/reject', auth('approveUsers'), validate(adminValidation.rejectUser), adminController.rejectUser);
router.get('/users/:userId', auth('approveUsers'), validate(adminValidation.getUserDetails), adminController.getUserDetails);
router.patch('/users/:userId/block', auth('manageUsers'), validate(adminValidation.userIdParam), adminController.blockUser);
router.patch('/users/:userId/unblock', auth('manageUsers'), validate(adminValidation.userIdParam), adminController.unblockUser);

module.exports = router;