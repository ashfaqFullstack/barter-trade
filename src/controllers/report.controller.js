const catchAsync = require('../utils/catchAsync');
const reportService = require('../services/report.service');

const getCompanyAccount = catchAsync(async (req, res) => {
    const account = await reportService.getCompanyAccount();
    res.send(account);
});

const getAllTransactions = catchAsync(async (req, res) => {
    const result = await reportService.getAllTransactions(req.query);
    res.send(result);
});

const getFeeLogs = catchAsync(async (req, res) => {
    const result = await reportService.getFeeLogs(req.query);
    res.send(result);
});

const getDashboardStats = catchAsync(async (req, res) => {
    const stats = await reportService.getDashboardStats();
    res.send(stats);
});

const getSalesChart = catchAsync(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 7;
    const data = await reportService.getSalesChart(days);
    res.send(data);
});

module.exports = { getCompanyAccount, getAllTransactions, getFeeLogs, getDashboardStats, getSalesChart };