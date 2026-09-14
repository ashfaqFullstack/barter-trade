const QRCode = require('qrcode');

const generateMyQrCode = async (userId) => {
    const payload = JSON.stringify({ userId });
    const dataUrl = await QRCode.toDataURL(payload);
    return { userId, qrCodeImage: dataUrl };
};

module.exports = { generateMyQrCode };