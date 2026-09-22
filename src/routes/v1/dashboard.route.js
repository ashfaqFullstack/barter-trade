const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { dashboardValidation } = require('../../validations');
const { dashboardController } = require('../../controllers');

const router = express.Router();

router.get('/summary', auth('viewDashboard'), dashboardController.getSummary);
router.get('/sales-chart', auth('viewDashboard'), validate(dashboardValidation.salesChart), dashboardController.getSalesChart);

module.exports = router;