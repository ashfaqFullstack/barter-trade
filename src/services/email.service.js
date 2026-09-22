const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);

const sendEmail = async (to, subject, text, html) => {
    await transport.sendMail({ from: config.email.from, to, subject, text, ...(html && { html }) });
};

const sendNotificationEmail = async (
    to,
    subject,
    heading,
    message,
    buttonText,
    buttonPath
) => {
    const buttonUrl = `${config.frontendUrl}${buttonPath} `;

    const text = `
${heading}

${message}

${buttonText}: ${buttonUrl}

United Trade
Trade Differently.

© ${new Date().getFullYear()} United Trade.
    `;

    const html = `
    <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>United Trade - ${heading}</title>
            </head>

            <body style="
    margin:0;
    padding:0;
    background:#f5f7ff;
    font-family:Arial,Helvetica,sans-serif;
">

                <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="background:#f5f7ff;padding:20px 10px;"
                >
                    <tr>
                        <td align="center">

                            <!-- MAIN CARD -->
                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                style="
                    max-width:540px;
                    background:#ffffff;
                    border-radius:16px;
                    overflow:hidden;
                    box-shadow:0 6px 25px rgba(50,70,130,.07);
                "
                            >

                                <!-- HEADER -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:15px 20px;
                            border-bottom:1px solid #edf0f6;
                        "
                                    >
                                        <div style="
                            font-size:20px;
                            font-weight:800;
                            letter-spacing:-.6px;
                        ">
                                            <span style="color:#4f46e5;">United</span>
                                            <span style="color:#2563eb;">Trade</span>
                                        </div>

                                        <div style="
                            margin-top:2px;
                            font-size:8px;
                            color:#8d94a8;
                            letter-spacing:1.2px;
                            text-transform:uppercase;
                        ">
                                            Trade Differently
                                        </div>
                                    </td>
                                </tr>

                                <!-- HERO -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:28px 25px 25px;
                            background:linear-gradient(
                                135deg,
                                #f5f3ff 0%,
                                #eef5ff 55%,
                                #f8fbff 100%
                            );
                        "
                                    >

                                        <!-- NOTIFICATION ICON -->
                                        <div style="
                            width:46px;
                            height:46px;
                            margin:0 auto 10px;
                            border-radius:50%;
                            background:#ebe9ff;
                            color:#4f46e5;
                            font-size:21px;
                            line-height:46px;
                            font-weight:bold;
                        ">
                                            🔔
                                        </div>

                                        <!-- BADGE -->
                                        <div style="
                            display:inline-block;
                            padding:5px 11px;
                            border-radius:20px;
                            background:#e9e7ff;
                            color:#5146d8;
                            font-size:9px;
                            font-weight:700;
                            letter-spacing:.4px;
                        ">
                                            UNITED TRADE NOTIFICATION
                                        </div>

                                        <h1 style="
                            margin:11px 0 7px;
                            font-size:23px;
                            line-height:1.2;
                            color:#151a35;
                            font-weight:800;
                        ">
                                            ${heading}
                                        </h1>

                                        <p style="
                            margin:0 auto;
                            max-width:400px;
                            font-size:12px;
                            line-height:1.6;
                            color:#687087;
                        ">
                                            ${message}
                                        </p>

                                        <!-- ACTION BUTTON -->
                                        <a
                                            href="${buttonUrl}"
                                            style="
                                display:inline-block;
                                margin-top:20px;
                                padding:12px 24px;
                                border-radius:25px;
                                background:#4f46e5;
                                color:#ffffff;
                                text-decoration:none;
                                font-size:12px;
                                font-weight:700;
                            "
                                        >
                                            ${buttonText}
                                        </a>

                                    </td>
                                </tr>

                                <!-- ACTION NOTE -->
                                <tr>
                                    <td
                                        style="
                            padding:22px 25px;
                            background:#ffffff;
                        "
                                    >
                                        <div style="
                            padding:11px 13px;
                            background:#f8f9ff;
                            border:1px solid #edf0f6;
                            border-radius:9px;
                            font-size:10px;
                            line-height:1.5;
                            color:#737b90;
                            text-align:center;
                        ">
                                            You can use the button above to access your
                                            United Trade account and view the latest update.
                                        </div>
                                    </td>
                                </tr>

                                <!-- FOOTER -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:14px 20px;
                            background:#f8f9ff;
                            border-top:1px solid #eef0f7;
                        "
                                    >

                                        <div style="
                            font-size:15px;
                            font-weight:800;
                        ">
                                            <span style="color:#4f46e5;">United</span>
                                            <span style="color:#2563eb;">Trade</span>
                                        </div>

                                        <div style="
                            margin-top:4px;
                            font-size:8px;
                            color:#9aa1b4;
                        ">
                                            Trade Differently.
                                        </div>

                                        <div style="
                            margin-top:8px;
                            font-size:8px;
                            color:#a2a8b8;
                        ">
                                            © ${new Date().getFullYear()} United Trade.
                                            All rights reserved.
                                        </div>

                                    </td>
                                </tr>

                            </table>

                        </td>
                    </tr>
                </table>

            </body>
        </html>
`;

    await sendEmail(to, subject, text, html);
};


const sendListingAddedEmail = (to, listingTitle) =>
    sendNotificationEmail(
        to,
        'Your Listing Has Been Added',
        'Your listing is live',
        `Your listing${listingTitle ? ` "${listingTitle}"` : ''} has been added successfully.`,
        'View My Listings',
        '/dashboard/listings',
    );


const sendOrderPlacedEmail = (to) =>
    sendNotificationEmail(
        to,
        'Your Order Is Placed',
        'Your order is placed',
        'Your order has been placed successfully.',
        'View My Orders',
        '/dashboard/orders',
    );


const sendNewOrderReceivedEmail = (to) =>
    sendNotificationEmail(
        to,
        'You Received a New Order',
        'You received a new order',
        'A customer has placed an order for one of your listings.',
        'View Received Orders',
        '/dashboard/orders/received',
    );


const sendBarterOfferSentEmail = (to) =>
    sendNotificationEmail(
        to,
        'Your Barter Offer Was Sent',
        'Your barter offer was sent',
        'Your barter offer has been sent successfully.',
        'View My Barter Offers',
        '/dashboard/barter-offers',
    );


const sendBarterOfferReceivedEmail = (to) =>
    sendNotificationEmail(
        to,
        'You Received a Barter Offer',
        'You received a barter offer',
        'Someone has sent you a new barter offer. Check it out now.',
        'View Received Offers',
        '/dashboard/barter-offers/received',
    );


const sendOtpEmail = async (to, otp) => {
    const subject = "Reset Your Password";

    const html = `
    <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>United Trade - Reset Password</title>
            </head>

            <body style="
    margin:0;
    padding:0;
    background:#f5f7ff;
    font-family:Arial,Helvetica,sans-serif;
">

                <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="background:#f5f7ff;padding:20px 10px;"
                >
                    <tr>
                        <td align="center">

                            <!-- MAIN CARD -->
                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                style="
                    max-width:540px;
                    background:#ffffff;
                    border-radius:16px;
                    overflow:hidden;
                    box-shadow:0 6px 25px rgba(50,70,130,.07);
                "
                            >

                                <!-- HEADER -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:15px 20px;
                            border-bottom:1px solid #edf0f6;
                        "
                                    >
                                        <div style="
                            font-size:20px;
                            font-weight:800;
                            letter-spacing:-.6px;
                        ">
                                            <span style="color:#4f46e5;">United</span>
                                            <span style="color:#2563eb;">Trade</span>
                                        </div>

                                        <div style="
                            margin-top:2px;
                            font-size:8px;
                            color:#8d94a8;
                            letter-spacing:1.2px;
                            text-transform:uppercase;
                        ">
                                            Trade Differently
                                        </div>
                                    </td>
                                </tr>

                                <!-- HERO -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:28px 25px 25px;
                            background:linear-gradient(
                                135deg,
                                #f5f3ff 0%,
                                #eef5ff 55%,
                                #f8fbff 100%
                            );
                        "
                                    >

                                        <!-- SECURITY ICON -->
                                        <div style="
                            width:46px;
                            height:46px;
                            margin:0 auto 10px;
                            border-radius:50%;
                            background:#ebe9ff;
                            color:#4f46e5;
                            font-size:21px;
                            line-height:46px;
                            font-weight:bold;
                        ">
                                            🔐
                                        </div>

                                        <!-- BADGE -->
                                        <div style="
                            display:inline-block;
                            padding:5px 11px;
                            border-radius:20px;
                            background:#e9e7ff;
                            color:#5146d8;
                            font-size:9px;
                            font-weight:700;
                            letter-spacing:.4px;
                        ">
                                            SECURITY VERIFICATION
                                        </div>

                                        <h1 style="
                            margin:11px 0 7px;
                            font-size:23px;
                            line-height:1.2;
                            color:#151a35;
                            font-weight:800;
                        ">
                                            Reset Your Password
                                        </h1>

                                        <p style="
                            margin:0 auto;
                            max-width:400px;
                            font-size:12px;
                            line-height:1.6;
                            color:#687087;
                        ">
                                            Use the verification code below to reset
                                            your United Trade password.
                                        </p>

                                    </td>
                                </tr>

                                <!-- OTP SECTION -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:22px 25px 25px;
                            background:#ffffff;
                        "
                                    >

                                        <div style="
                            font-size:10px;
                            color:#858ca1;
                            margin-bottom:8px;
                        ">
                                            YOUR VERIFICATION CODE
                                        </div>

                                        <!-- OTP -->
                                        <div style="
                            display:inline-block;
                            padding:12px 28px;
                            border-radius:10px;
                            background:#f5f3ff;
                            border:1px solid #e4e1ff;
                            color:#4f46e5;
                            font-size:26px;
                            line-height:1;
                            font-weight:800;
                            letter-spacing:7px;
                        ">
                                            ${otp}
                                        </div>

                                        <div style="
                            margin-top:12px;
                            font-size:10px;
                            color:#858ca1;
                        ">
                                            This code expires in
                                            <strong style="color:#4f46e5;">
                                                10 minutes
                                            </strong>.
                                        </div>

                                    </td>
                                </tr>

                                <!-- SECURITY NOTE -->
                                <tr>
                                    <td
                                        style="
                            padding:0 25px 22px;
                            background:#ffffff;
                        "
                                    >
                                        <div style="
                            padding:11px 13px;
                            background:#f8f9ff;
                            border:1px solid #edf0f6;
                            border-radius:9px;
                            font-size:10px;
                            line-height:1.5;
                            color:#737b90;
                            text-align:center;
                        ">
                                            If you didn't request a password reset,
                                            you can safely ignore this email.
                                        </div>
                                    </td>
                                </tr>

                                <!-- FOOTER -->
                                <tr>
                                    <td
                                        align="center"
                                        style="
                            padding:14px 20px;
                            background:#f8f9ff;
                            border-top:1px solid #eef0f7;
                        "
                                    >

                                        <div style="
                            font-size:15px;
                            font-weight:800;
                        ">
                                            <span style="color:#4f46e5;">United</span>
                                            <span style="color:#2563eb;">Trade</span>
                                        </div>

                                        <div style="
                            margin-top:4px;
                            font-size:8px;
                            color:#9aa1b4;
                        ">
                                            Trade Differently.
                                        </div>

                                        <div style="
                            margin-top:8px;
                            font-size:8px;
                            color:#a2a8b8;
                        ">
                                            © ${new Date().getFullYear()} United Trade.
                                            All rights reserved.
                                        </div>

                                    </td>
                                </tr>

                            </table>

                        </td>
                    </tr>
                </table>

            </body>
        </html>
`;

    const text = `
Your United Trade password reset verification code is: ${otp}

This code expires in 10 minutes.

If you didn't request a password reset, you can safely ignore this email.

United Trade
Trade Differently.

© ${new Date().getFullYear()} United Trade.
    `;

    await sendEmail(to, subject, text, html);

    logger.info(`OTP email sent to ${to} `);
};


const sendApprovalEmail = async (to, name) => {
    const subject = "Your United Trade Account Has Been Approved!";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>United Trade - Account Approved</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7ff;
    font-family:Arial,Helvetica,sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f5f7ff;padding:20px 10px;"
>
    <tr>
        <td align="center">

            <!-- MAIN CARD -->
            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:540px;
                    background:#ffffff;
                    border-radius:16px;
                    overflow:hidden;
                    box-shadow:0 6px 25px rgba(50,70,130,.07);
                "
            >

                <!-- HEADER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:15px 20px;
                            border-bottom:1px solid #edf0f6;
                        "
                    >
                        <div style="
                            font-size:20px;
                            font-weight:800;
                            letter-spacing:-.6px;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:2px;
                            font-size:8px;
                            color:#8d94a8;
                            letter-spacing:1.2px;
                            text-transform:uppercase;
                        ">
                            Trade Differently
                        </div>
                    </td>
                </tr>


                <!-- HERO -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:28px 25px 25px;
                            background:linear-gradient(
                                135deg,
                                #f5f3ff 0%,
                                #eef5ff 55%,
                                #f8fbff 100%
                            );
                        "
                    >

                        <!-- SUCCESS ICON -->
                        <div style="
                            width:46px;
                            height:46px;
                            margin:0 auto 10px;
                            border-radius:50%;
                            background:linear-gradient(
                                135deg,
                                #4f46e5,
                                #2563eb
                            );
                            color:#fff;
                            font-size:23px;
                            line-height:46px;
                            font-weight:bold;
                        ">
                            ✓
                        </div>

                        <!-- BADGE -->
                        <div style="
                            display:inline-block;
                            padding:5px 11px;
                            border-radius:20px;
                            background:#e9e7ff;
                            color:#5146d8;
                            font-size:9px;
                            font-weight:700;
                            letter-spacing:.4px;
                        ">
                            ACCOUNT APPROVED
                        </div>

                        <h1 style="
                            margin:11px 0 7px;
                            font-size:23px;
                            line-height:1.2;
                            color:#151a35;
                            font-weight:800;
                        ">
                            Welcome to United Trade!
                        </h1>

                        <p style="
                            margin:0 auto;
                            max-width:400px;
                            font-size:12px;
                            line-height:1.6;
                            color:#687087;
                        ">
                            Hi ${name}, your account has been approved.
                            You're now ready to start trading.
                        </p>

                        <!-- CTA -->
                        <div style="
                            margin-top:18px;
                        ">
                            <a
                                href="${process.env.FRONTEND_URL}/dashboard"
                                style="
                                    display:inline-block;
                                    padding:11px 25px;
                                    border-radius:25px;
                                    background:linear-gradient(
                                        135deg,
                                        #4f46e5,
                                        #2563eb
                                    );
                                    color:#ffffff;
                                    text-decoration:none;
                                    font-size:11px;
                                    font-weight:700;
                                "
                            >
                                Start Trading &nbsp; →
                            </a>
                        </div>

                    </td>
                </tr>


                <!-- SHORT MESSAGE -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:20px 25px;
                            background:#ffffff;
                        "
                    >

                        <div style="
                            font-size:14px;
                            font-weight:700;
                            color:#252b55;
                        ">
                            Your money isn't the only thing that has value.
                        </div>

                        <div style="
                            margin-top:5px;
                            font-size:10px;
                            line-height:1.5;
                            color:#858ca1;
                        ">
                            Your skills, products and services create value too.
                        </div>

                    </td>
                </tr>


                <!-- FOOTER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:14px 20px;
                            background:#f8f9ff;
                            border-top:1px solid #eef0f7;
                        "
                    >

                        <div style="
                            font-size:15px;
                            font-weight:800;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:4px;
                            font-size:8px;
                            color:#9aa1b4;
                        ">
                            Trade Differently.
                        </div>

                        <div style="
                            margin-top:8px;
                            font-size:8px;
                            color:#a2a8b8;
                        ">
                            © ${new Date().getFullYear()} United Trade.
                            All rights reserved.
                        </div>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
    `;

    const text = `
Hi ${name},

Your United Trade account has been approved!

You're now ready to log in and start trading.

Start Trading:
${process.env.FRONTEND_URL}/login

Your money isn't the only thing that has value.
Your skills, products and services create value too.

Welcome to United Trade!

© ${new Date().getFullYear()} United Trade.
    `;

    await sendEmail(to, subject, text, html);

    logger.info(`Approval email sent to ${to}`);
};

const sendRejectionEmail = async (to, name, reason) => {
    const subject = "Update on Your United Trade Application";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>United Trade - Application Update</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7ff;
    font-family:Arial,Helvetica,sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f5f7ff;padding:20px 10px;"
>
    <tr>
        <td align="center">

            <!-- MAIN CARD -->
            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:540px;
                    background:#ffffff;
                    border-radius:16px;
                    overflow:hidden;
                    box-shadow:0 6px 25px rgba(50,70,130,.07);
                "
            >

                <!-- HEADER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:15px 20px;
                            border-bottom:1px solid #edf0f6;
                        "
                    >
                        <div style="
                            font-size:20px;
                            font-weight:800;
                            letter-spacing:-.6px;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:2px;
                            font-size:8px;
                            color:#8d94a8;
                            letter-spacing:1.2px;
                            text-transform:uppercase;
                        ">
                            Trade Differently
                        </div>
                    </td>
                </tr>


                <!-- HERO -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:28px 25px 25px;
                            background:linear-gradient(
                                135deg,
                                #fff7f7 0%,
                                #f7f5ff 55%,
                                #f8fbff 100%
                            );
                        "
                    >

                        <!-- STATUS ICON -->
                        <div style="
                            width:46px;
                            height:46px;
                            margin:0 auto 10px;
                            border-radius:50%;
                            background:#fff0f1;
                            border:1px solid #ffdadd;
                            color:#e05260;
                            font-size:21px;
                            line-height:46px;
                            font-weight:bold;
                        ">
                            !
                        </div>

                        <!-- BADGE -->
                        <div style="
                            display:inline-block;
                            padding:5px 11px;
                            border-radius:20px;
                            background:#fff0f1;
                            color:#d94b59;
                            font-size:9px;
                            font-weight:700;
                            letter-spacing:.4px;
                        ">
                            APPLICATION UPDATE
                        </div>

                        <h1 style="
                            margin:11px 0 7px;
                            font-size:23px;
                            line-height:1.2;
                            color:#151a35;
                            font-weight:800;
                        ">
                            Application Update
                        </h1>

                        <p style="
                            margin:0 auto;
                            max-width:410px;
                            font-size:12px;
                            line-height:1.6;
                            color:#687087;
                        ">
                            Hi ${name}, unfortunately, we weren't able to
                            approve your United Trade account at this time.
                        </p>

                    </td>
                </tr>


                <!-- REASON -->
                <tr>
                    <td
                        style="
                            padding:20px 25px;
                            background:#ffffff;
                        "
                    >

                        <div style="
                            font-size:12px;
                            font-weight:700;
                            color:#252b55;
                            margin-bottom:8px;
                        ">
                            Reason
                        </div>

                        <div style="
                            padding:12px 14px;
                            background:#f8f9ff;
                            border:1px solid #edf0f6;
                            border-left:3px solid #6366f1;
                            border-radius:9px;
                            font-size:11px;
                            line-height:1.6;
                            color:#697187;
                        ">
                            ${reason}
                        </div>

                        <p style="
                            margin:14px 0 0;
                            text-align:center;
                            font-size:10px;
                            line-height:1.5;
                            color:#858ca1;
                        ">
                            If you believe this was a mistake, please contact
                            our support team.
                        </p>

                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:14px 20px;
                            background:#ffffff;
                        "
                    >

                        <div style="
                            font-size:15px;
                            font-weight:800;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:4px;
                            font-size:8px;
                            color:#9aa1b4;
                        ">
                            Trade Differently.
                        </div>

                        <div style="
                            margin-top:8px;
                            font-size:8px;
                            color:#a2a8b8;
                        ">
                            © ${new Date().getFullYear()} United Trade.
                            All rights reserved.
                        </div>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
    `;

    const text = `
Hi ${name},

Unfortunately, we weren't able to approve your United Trade account at this time.

Reason:
${reason}

If you believe this was a mistake, please contact our support team.

United Trade
Trade Differently.

© ${new Date().getFullYear()} United Trade.
    `;

    await sendEmail(to, subject, text, html);

    logger.info(`Rejection email sent to ${to}`);
};

const sendPinResetOtpEmail = async (to, otp) => {
    const subject = "Reset Your Transaction PIN";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>United Trade - Reset Transaction PIN</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f5f7ff;
    font-family:Arial,Helvetica,sans-serif;
">

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f5f7ff;padding:20px 10px;"
>
    <tr>
        <td align="center">

            <!-- MAIN CARD -->
            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    max-width:540px;
                    background:#ffffff;
                    border-radius:16px;
                    overflow:hidden;
                    box-shadow:0 6px 25px rgba(50,70,130,.07);
                "
            >

                <!-- HEADER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:15px 20px;
                            border-bottom:1px solid #edf0f6;
                        "
                    >
                        <div style="
                            font-size:20px;
                            font-weight:800;
                            letter-spacing:-.6px;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:2px;
                            font-size:8px;
                            color:#8d94a8;
                            letter-spacing:1.2px;
                            text-transform:uppercase;
                        ">
                            Trade Differently
                        </div>
                    </td>
                </tr>


                <!-- HERO -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:28px 25px 25px;
                            background:linear-gradient(
                                135deg,
                                #f5f3ff 0%,
                                #eef5ff 55%,
                                #f8fbff 100%
                            );
                        "
                    >

                        <!-- SECURITY ICON -->
                        <div style="
                            width:46px;
                            height:46px;
                            margin:0 auto 10px;
                            border-radius:50%;
                            background:#ebe9ff;
                            color:#4f46e5;
                            font-size:21px;
                            line-height:46px;
                            font-weight:bold;
                        ">
                            🔐
                        </div>

                        <!-- BADGE -->
                        <div style="
                            display:inline-block;
                            padding:5px 11px;
                            border-radius:20px;
                            background:#e9e7ff;
                            color:#5146d8;
                            font-size:9px;
                            font-weight:700;
                            letter-spacing:.4px;
                        ">
                            SECURITY VERIFICATION
                        </div>

                        <h1 style="
                            margin:11px 0 7px;
                            font-size:23px;
                            line-height:1.2;
                            color:#151a35;
                            font-weight:800;
                        ">
                            Reset Your Transaction PIN
                        </h1>

                        <p style="
                            margin:0 auto;
                            max-width:400px;
                            font-size:12px;
                            line-height:1.6;
                            color:#687087;
                        ">
                            Use the verification code below to reset
                            your transaction PIN.
                        </p>

                    </td>
                </tr>


                <!-- OTP SECTION -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:22px 25px 25px;
                            background:#ffffff;
                        "
                    >

                        <div style="
                            font-size:10px;
                            color:#858ca1;
                            margin-bottom:8px;
                        ">
                            YOUR VERIFICATION CODE
                        </div>

                        <!-- OTP -->
                        <div style="
                            display:inline-block;
                            padding:12px 28px;
                            border-radius:10px;
                            background:#f5f3ff;
                            border:1px solid #e4e1ff;
                            color:#4f46e5;
                            font-size:26px;
                            line-height:1;
                            font-weight:800;
                            letter-spacing:7px;
                        ">
                            ${otp}
                        </div>

                        <div style="
                            margin-top:12px;
                            font-size:10px;
                            color:#858ca1;
                        ">
                            This code expires in
                            <strong style="color:#4f46e5;">
                                10 minutes
                            </strong>.
                        </div>

                    </td>
                </tr>


                <!-- SECURITY NOTE -->
                <tr>
                    <td
                        style="
                            padding:0 25px 22px;
                            background:#ffffff;
                        "
                    >
                        <div style="
                            padding:11px 13px;
                            background:#f8f9ff;
                            border:1px solid #edf0f6;
                            border-radius:9px;
                            font-size:10px;
                            line-height:1.5;
                            color:#737b90;
                            text-align:center;
                        ">
                            If you didn't request this code, you can safely
                            ignore this email.
                        </div>
                    </td>
                </tr>


                <!-- FOOTER -->
                <tr>
                    <td
                        align="center"
                        style="
                            padding:14px 20px;
                            background:#f8f9ff;
                            border-top:1px solid #eef0f7;
                        "
                    >

                        <div style="
                            font-size:15px;
                            font-weight:800;
                        ">
                            <span style="color:#4f46e5;">United</span>
                            <span style="color:#2563eb;">Trade</span>
                        </div>

                        <div style="
                            margin-top:4px;
                            font-size:8px;
                            color:#9aa1b4;
                        ">
                            Trade Differently.
                        </div>

                        <div style="
                            margin-top:8px;
                            font-size:8px;
                            color:#a2a8b8;
                        ">
                            © ${new Date().getFullYear()} United Trade.
                            All rights reserved.
                        </div>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
    `;

    const text = `
Your United Trade verification code is: ${otp}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.

United Trade
Trade Differently.

© ${new Date().getFullYear()} United Trade.
    `;

    await sendEmail(to, subject, text, html);

    logger.info(`PIN reset OTP sent to ${to}`);
};

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendPinResetOtpEmail,
    sendListingAddedEmail,
    sendOrderPlacedEmail,
    sendNewOrderReceivedEmail,
    sendBarterOfferSentEmail,
    sendBarterOfferReceivedEmail,
};