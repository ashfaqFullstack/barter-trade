const cloudinary = require('../config/cloudinary');

const generateUploadSignature = () => {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        timestamp,
        folder: 'barter-trade/business-documents',
        type: 'authenticated',
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinary.config().api_secret);

    return {
        timestamp,
        signature,
        apiKey: cloudinary.config().api_key,
        cloudName: cloudinary.config().cloud_name,
        folder: paramsToSign.folder,
    };
};

const generateSignedViewUrl = (publicId) => {
    return cloudinary.url(publicId, {
        type: 'authenticated',
        sign_url: true,
        secure: true,
    });
};

const generateListingUploadSignature = () => {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        timestamp,
        folder: 'barter-trade/listings',
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinary.config().api_secret);

    return {
        timestamp,
        signature,
        apiKey: cloudinary.config().api_key,
        cloudName: cloudinary.config().cloud_name,
        folder: paramsToSign.folder,
    };
};

module.exports = { generateUploadSignature, generateSignedViewUrl, generateListingUploadSignature };