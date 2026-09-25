const webpush = require('web-push');
const prisma = require('../config/prisma');
const config = require('../config/config');
const logger = require('../config/logger');

webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);

const saveSubscription = async (userId, subscription) => {
    return prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        create: { userId, endpoint: subscription.endpoint, keys: subscription.keys },
        update: { userId, keys: subscription.keys },
    });
};

const removeSubscription = async (endpoint) => {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
};

const hasSubscription = async (userId, endpoint) => {
    const subscription = await prisma.pushSubscription.findFirst({
        where: { userId, endpoint },
        select: { endpoint: true },
    });

    return Boolean(subscription);
};

// title/body/url — url is where the notification click should navigate to.
const sendPushToUser = async (userId, { title, body, url }) => {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

    const payload = JSON.stringify({ title, body, url: url || '/dashboard' });

    await Promise.all(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
            } catch (err) {
                // 410 Gone / 404 = subscription no longer valid, clean it up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await removeSubscription(sub.endpoint);
                } else {
                    logger.error(`Push notification failed: ${err.message}`);
                }
            }
        })
    );
};

module.exports = { saveSubscription, removeSubscription, hasSubscription, sendPushToUser };