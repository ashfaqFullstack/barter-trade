const catchAsync = require('../utils/catchAsync');
const dashboardService = require('../services/dashboard.service');

const getSummary = catchAsync(async (req, res) => {
    res.send(await dashboardService.getSummary(req.user));
});

const getSalesChart = catchAsync(async (req, res) => {
    res.send(await dashboardService.getSalesChart(req.user, req.query.period || 7));
});

module.exports = { getSummary, getSalesChart };