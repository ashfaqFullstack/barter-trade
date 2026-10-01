const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { reportValidation } = require('../../validations');
const { reportController } = require('../../controllers');

const router = express.Router();

router.get('/company-account', auth('viewCompanyAccount'), reportController.getCompanyAccount);
router.get('/transactions', auth('viewCompanyAccount'), validate(reportValidation.getTransactions), reportController.getAllTransactions);
router.get('/commissions/logs', auth('viewCompanyAccount'), validate(reportValidation.getCommissionLogs), reportController.getCommissionLogs);
router.get('/dashboard/stats', auth('viewCompanyAccount'), reportController.getDashboardStats);
router.get('/dashboard/sales-chart', auth('viewCompanyAccount'), reportController.getSalesChart);

module.exports = router;