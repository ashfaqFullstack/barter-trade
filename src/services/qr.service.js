const QRCode = require('qrcode');
const config = require('../config/config');

const generateMyQrCode = async (userId) => {
    const link = `${config.frontendUrl}/dashboard/wallet/send?receiverId=${userId}`;
    const dataUrl = await QRCode.toDataURL(link);
    return { userId, link, qrCodeImage: dataUrl };
};

module.exports = { generateMyQrCode };