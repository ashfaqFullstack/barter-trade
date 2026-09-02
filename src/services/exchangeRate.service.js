const axios = require('axios');
const prisma = require('../config/prisma');
const logger = require('../config/logger');

const API_URL = 'https://open.er-api.com/v6/latest/USD'; // free, no API key needed

const updateAllRates = async () => {
    const { data } = await axios.get(API_URL);
    const rates = data.rates; // e.g. { THB: 35.5, LBP: 89500, ... }

    const countries = await prisma.countryCurrencyRate.findMany();

    for (const country of countries) {
        const liveRate = rates[country.currencyCode];
        if (liveRate) {
            await prisma.countryCurrencyRate.update({
                where: { id: country.id },
                data: { rate: liveRate, source: 'LIVE', updatedById: null },
            });
        }
    }

    logger.info('Currency rates updated from live API');
};

module.exports = { updateAllRates };