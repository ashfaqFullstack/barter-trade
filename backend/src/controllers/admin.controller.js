const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const adminService = require('../services/admin.service');

const getPendingUsers = catchAsync(async (req, res) => {
    const filter = pick(req.query, ['role']);
    const options = pick(req.query, ['limit', 'page']);
    const result = await adminService.getPendingUsers(filter, options);
    res.send(result);
});

module.exports = { getPendingUsers };