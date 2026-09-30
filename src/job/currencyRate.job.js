
const cron = require('node-cron');
const logger = require('../config/logger');
const { exchangeRateService, currencyService } = require('../services');

// Every 6 hours.
// NOTE: on Vercel serverless this cron will not fire reliably — currencyService.getRates()
// also refreshes lazily whenever rates are older than 12h, so rates stay fresh either way.
cron.schedule('0 */6 * * *', async () => {
    try {
        await exchangeRateService.updateAllRates();
        currencyService.invalidateRateCache();
    } catch (err) {
        logger.error(`Currency rate update failed: ${err.message}`);
    }
});