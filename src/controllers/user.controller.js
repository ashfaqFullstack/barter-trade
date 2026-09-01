const catchAsync = require('../utils/catchAsync')
const { userService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const httpStatus = require('http-status').default;

const createUser = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(httpStatus.CREATED).send(user)
});

const getUser = catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    };
    res.send(user)
});

const getUsers = catchAsync(async (req, res) => {
    const filter = pick(req.query, ['name', 'role']);
    const options = pick(req.query, ['srotBy', 'limit', 'page']);

    const result = await userService.queryUsers(filter, options);
    res.send(result)
});

const updateUser = catchAsync(async (req, res) => {
    const user = await userService.updateUserById(req.params.id, req.body);
    res.send(user)
});

const deleteUser = catchAsync(async (req, res) => {
    await userService.deleteUserById(req.params.userId);
    res.status(httpStatus.NO_CONTENT).send()
})




module.exports = {
    createUser,
    getUser,
    getUsers,
    updateUser,
    deleteUser
}