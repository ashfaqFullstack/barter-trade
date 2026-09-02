const httpStatus = require('http-status').default;
const { businessService } = require('../services');
const catchAsync = require('../utils/catchAsync');

const completeProfile = catchAsync(async (req, res) => {
    const profile = await businessService.completeBusinessProfile(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(profile);
});

const getUploadSignature = catchAsync(async (req, res) => {
    const data = await businessService.getUploadSignature();
    res.send(data);
});

const saveDocuments = catchAsync(async (req, res) => {
    console.log('req.body.documents:', req.files);
    const documents = await businessService.saveBusinessDocuments(req.user.id, req.body.documents);
    res.status(httpStatus.CREATED).send(documents);
});

const getMyProfile = catchAsync(async (req, res) => {
    const profile = await businessService.getMyBusinessProfile(req.user.id);
    res.send(profile);
});

module.exports = { completeProfile, getUploadSignature, saveDocuments, getMyProfile };