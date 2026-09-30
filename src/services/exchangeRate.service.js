const axios = require('axios');
const prisma = require('../config/prisma');
const logger = require('../config/logger');

const API_URL = 'https://open.er-api.com/v6/latest/USD'; // free, no API key, all currencies in one call

// Fetches every currency in ONE call and saves them all with ONE SQL query.
// rate = units of currency per 1 USD.
const updateAllRates = async () => {
    const { data } = await axios.get(API_URL, { timeout: 10000 });

    if (data?.result !== 'success' || !data.rates) {
        throw new Error('Unexpected response from exchange rate API');
    }

    const entries = Object.entries(data.rates).filter(([, rate]) => Number(rate) > 0);
    const codes = entries.map(([currencyCode]) => currencyCode);
    const rates = entries.map(([, rate]) => String(rate));

    // Single bulk upsert (no per-row queries, so no transaction timeout).
    await prisma.$executeRaw`
        INSERT INTO "currency_rates" ("currencyCode", "rate", "updatedAt")
        SELECT t.code, t.rate, NOW()
        FROM unnest(${codes}::text[], ${rates}::text[]::numeric[]) AS t(code, rate)
        ON CONFLICT ("currencyCode")
        DO UPDATE SET "rate" = EXCLUDED."rate", "updatedAt" = NOW()
    `;

    logger.info(`Currency rates updated from live API (${entries.length} currencies)`);
    return entries.length;
};

module.exports = { updateAllRates };