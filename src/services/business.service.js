const httpStatus = require('http-status');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
// const { cloudinaryService } = require('./cloudinary.service');
const cloudinaryService = require('./cloudinary.service');

const getUploadSignature = () => cloudinaryService.generateUploadSignature();

const completeBusinessProfile = async (userId, body) => {
    const existing = await prisma.businessProfile.findUnique({ where: { userId } });
    console.log('existing profile:', existing);
    if (existing) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Business profile already exists');
    }
    return prisma.businessProfile.create({
        data: { userId, ...body },
    });
};


const saveBusinessDocuments = async (userId, documents) => {
    const businessProfile = await prisma.businessProfile.findUnique({ where: { userId } });
    if (!businessProfile) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Complete your business profile first');
    }

    return prisma.$transaction(
        documents.map((doc) =>
            prisma.businessDocument.create({
                data: {
                    businessProfileId: businessProfile.id,
                    fileUrl: doc.url,
                    publicId: doc.publicId,
                    fileType: doc.fileType,
                },
            })
        )
    );
};

const getMyBusinessProfile = async (userId) => {
    const profile = await prisma.businessProfile.findUnique({
        where: { userId },
        include: { documents: true },
    });
    if (!profile) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Business profile not found');
    }
    return profile;
};

module.exports = { completeBusinessProfile, saveBusinessDocuments, getUploadSignature, getMyBusinessProfile };