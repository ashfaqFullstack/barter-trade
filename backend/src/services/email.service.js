const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);

const sendEmail = async (to, subject, text) => {
    await transport.sendMail({ from: config.email.from, to, subject, text });
};

const sendOtpEmail = async (to, otp) => {
    const subject = 'Password Reset OTP';
    const text = `Your OTP to reset your password is: ${otp}\nThis code expires in 10 minutes.`;
    await sendEmail(to, subject, text);
    logger.info(`OTP email sent to ${to}`);
};

module.exports = { sendEmail, sendOtpEmail };