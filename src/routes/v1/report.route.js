const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { reportValidation } = require('../../validations');
const { reportController } = require('../../controllers');

const router = express.Router();

router.get('/company-account', auth('viewCompanyAccount'), reportController.getCompanyAccount);
router.get('/transactions', auth('viewCompanyAccount'), validate(reportValidation.getTransactions), reportController.getAllTransactions);
router.get('/fees/logs', auth('viewCompanyAccount'), validate(reportValidation.getFeeLogs), reportController.getFeeLogs);
router.get('/dashboard/stats', auth('viewCompanyAccount'), reportController.getDashboardStats);

module.exports = router;