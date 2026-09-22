const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const adminService = require('../services/admin.service');

const getPendingUsers = catchAsync(async (req, res) => {
    const filter = pick(req.query, ['role']);
    const options = pick(req.query, ['limit', 'page']);
    const result = await adminService.getPendingUsers(filter, options);
    res.send(result);
});

const approveUser = catchAsync(async (req, res) => {
    const user = await adminService.approveUser(req.params.userId, req.body.creditLimit);
    res.send(user);
});

const rejectUser = catchAsync(async (req, res) => {
    const user = await adminService.rejectUser(req.params.userId, req.body.reason);
    res.send(user);
});

const getUserDetails = catchAsync(async (req, res) => {
    const user = await adminService.getUserDetails(req.params.userId);
    res.send(user);
});


const getAllUsers = catchAsync(async (req, res) => {
    const result = await adminService.getAllUsers(req.query);
    res.send(result);
});

const blockUser = catchAsync(async (req, res) => {
    const user = await adminService.blockUser(req.params.userId);
    res.send(user);
});

const unblockUser = catchAsync(async (req, res) => {
    const user = await adminService.unblockUser(req.params.userId);
    res.send(user);
});

const fundWallet = catchAsync(async (req, res) => {
    const wallet = await adminService.fundAdminWallet(req.user.id, req.body.amount);
    res.send(wallet);
});

module.exports = {
    getPendingUsers,
    approveUser,
    rejectUser,
    getUserDetails,
    getAllUsers,
    blockUser,
    unblockUser,
    fundWallet,
};
