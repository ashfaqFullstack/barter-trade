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

const sendApprovalEmail = async (to, name) => {
    const subject = 'Your Account Has Been Approved!';
    const text = `Hi ${name},\n\nGreat news! Your account has been approved. You can now log in and start trading.\n\nWelcome aboard!`;
    await sendEmail(to, subject, text);
    logger.info(`Approval email sent to ${to}`);
};

const sendRejectionEmail = async (to, name) => {
    const subject = 'Update on Your Application';
    const text = `Hi ${name},\n\nUnfortunately, we were unable to approve your account at this time. If you believe this is a mistake, please contact our support team.\n\nThank you.`;
    await sendEmail(to, subject, text);
    logger.info(`Rejection email sent to ${to}`);
};

module.exports = { sendEmail, sendOtpEmail, sendApprovalEmail, sendRejectionEmail };