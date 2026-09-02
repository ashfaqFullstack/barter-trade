const cron = require('node-cron');
const logger = require('../config/logger');
const { exchangeRateService } = require('../services');

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        await exchangeRateService.updateAllRates();
    } catch (err) {
        logger.error(`Currency rate update failed: ${err.message}`);
    }
});