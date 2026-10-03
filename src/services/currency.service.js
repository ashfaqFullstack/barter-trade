
const httpStatus = require('http-status').default;
const isoCountries = require('i18n-iso-countries');
const COUNTRY_TO_CURRENCY = require('../utils/country-to-currency')
const prisma = require('../config/prisma');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const { roundUsd, roundForCurrency, getCurrencyDecimals } = require('../utils/money');

isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const BASE_CURRENCY = 'USD';
const COUNTRY_ALIASES = { UK: 'GB', UAE: 'AE', USA: 'US', 'U.S.A.': 'US', 'U.S.': 'US', 'U.K.': 'GB', KOREA: 'KR', RUSSIA: 'RU', TURKEY: 'TR' };
const STALE_AFTER_MS = 12 * 60 * 60 * 1000; // lazily refresh if rates are older than this

// ---------------------------------------------------------------
// Country name  ->  currency code
// ---------------------------------------------------------------
// Users type their country as free text, so first resolve it to an ISO code
// (handles "USA", "UK", "United States of America" ...), then to a currency.
const getCurrencyCodeForCountry = (country) => {
    if (!country || typeof country !== 'string') return BASE_CURRENCY;
    const name = country.trim();
    const upper = name.toUpperCase();
    // "UK" is not an ISO code (GB is), so alias the common informal names first.
    const alpha2 = COUNTRY_ALIASES[upper]
        || (name.length === 2 && isoCountries.isValid(upper) ? upper : isoCountries.getAlpha2Code(name, 'en'));
    return (alpha2 && COUNTRY_TO_CURRENCY[alpha2]) || BASE_CURRENCY;
};

// ---------------------------------------------------------------
// Live rate cache (in memory, backed by the currency_rates table)
// ---------------------------------------------------------------
let rateCache = { rates: null, loadedAt: 0 };
let refreshPromise = null;

const loadFromDb = async () => {
    const rows = await prisma.currencyRate.findMany();
    if (!rows.length) return null;
    const rates = {};
    rows.forEach((row) => { rates[row.currencyCode] = Number(row.rate); });
    const newest = rows.reduce((max, row) => Math.max(max, row.updatedAt.getTime()), 0);
    rateCache = { rates, loadedAt: newest };
    return rates;
};

const refreshRates = async () => {
    // lazy require to avoid a circular import with exchangeRate.service
    const exchangeRateService = require('./exchangeRate.service');
    if (!refreshPromise) {
        refreshPromise = exchangeRateService.updateAllRates()
            .then(() => loadFromDb())
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};

// Returns { CODE: unitsPerUSD }. Never throws if we have ANY previously saved rates —
// a failed refresh just keeps using the last known ones.
const getRates = async () => {
    const now = Date.now();
    if (rateCache.rates && now - rateCache.loadedAt < STALE_AFTER_MS) return rateCache.rates;

    if (!rateCache.rates) await loadFromDb();
    if (rateCache.rates && now - rateCache.loadedAt < STALE_AFTER_MS) return rateCache.rates;

    try {
        await refreshRates();
    } catch (err) {
        logger.error(`Live rate refresh failed, using last known rates: ${err.message}`);
    }

    if (!rateCache.rates) {
        throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Exchange rates are not available yet, please try again shortly');
    }
    return rateCache.rates;
};

const invalidateRateCache = () => { rateCache = { rates: null, loadedAt: 0 }; };

const getRate = async (currencyCode) => {
    if (currencyCode === BASE_CURRENCY) return 1;
    const rates = await getRates();
    const rate = rates[currencyCode];
    if (!rate) throw new ApiError(httpStatus.BAD_REQUEST, `No live exchange rate available for ${currencyCode}`);
    return rate;
};

// ---------------------------------------------------------------
// Conversion helpers (reusable everywhere)
// ---------------------------------------------------------------
// Local currency -> USD (used to store what a user typed). Result keeps 6 decimals.
const toUsd = async (amount, fromCurrencyCode) => {
    const rate = await getRate(fromCurrencyCode);
    return roundUsd(Number(amount) / rate);
};

// USD -> target currency (used for display). Rounded to that currency's decimals.
const convert = async (amountInUSD, targetCurrencyCode) => {
    const rate = await getRate(targetCurrencyCode);
    return roundForCurrency(Number(amountInUSD) * rate, targetCurrencyCode);
};

// Same as convert() but with an already-fetched rate (no async, for loops/lists).
const convertWithRate = (amountInUSD, rate, targetCurrencyCode) =>
    roundForCurrency(Number(amountInUSD) * rate, targetCurrencyCode);

// ---------------------------------------------------------------
// Who is the user, and what currency do they trade in?
// ---------------------------------------------------------------
const getUserCurrencyCode = async (userId, client = prisma) => {
    if (!userId) return BASE_CURRENCY;
    const user = await client.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            country: true,
            businessProfile: { select: { country: true } },
            customerProfile: { select: { country: true } },
        },
    });
    if (user?.role === 'ADMIN') return 'AUD';

    const country = user?.country || user?.businessProfile?.country || user?.customerProfile?.country;
    return getCurrencyCodeForCountry(country);
};

// { currencyCode, rate } — rate is units of that currency per 1 USD.
const getUserCurrency = async (userId, client = prisma) => {
    const currencyCode = await getUserCurrencyCode(userId, client);
    return { currencyCode, rate: await getRate(currencyCode) };
};

// ---------------------------------------------------------------
// Response shaping: keep the real USD fields and add a `display` block
// ---------------------------------------------------------------
// attachDisplay(order, ['amount','commissionBuyer'], { currencyCode, rate })
// -> order.display = { currency:'PKR', amount: 1000, commissionBuyer: 50 }
const attachDisplay = (record, fields, { currencyCode, rate }) => {
    if (!record) return record;
    const plain = typeof record.toJSON === 'function' ? record.toJSON() : record;
    const display = { currency: currencyCode };
    fields.forEach((field) => {
        if (plain[field] !== undefined && plain[field] !== null) {
            display[field] = convertWithRate(plain[field], rate, currencyCode);
        }
    });
    return { ...plain, display };
};

// ---------------------------------------------------------------
// Read-only info for the frontend
// ---------------------------------------------------------------
const getAllRates = async () => {
    const rates = await getRates();
    return {
        base: BASE_CURRENCY,
        updatedAt: new Date(rateCache.loadedAt).toISOString(),
        rates,
    };
};

// Powers "Receiver will get ≈ X" under the amount input.
const previewConversion = async (senderId, receiverId, amount, commissionPercent) => {
    const [sender, receiver] = await Promise.all([getUserCurrency(senderId), getUserCurrency(receiverId)]);
    const usdAmount = roundUsd(Number(amount) / sender.rate);
    const netUsd = roundUsd(usdAmount - (usdAmount * commissionPercent) / 100);
    return {
        senderCurrency: sender.currencyCode,
        receiverCurrency: receiver.currencyCode,
        senderAmount: Number(amount),
        usdAmount,
        receiverAmount: convertWithRate(usdAmount, receiver.rate, receiver.currencyCode),
        receiverNetAmount: convertWithRate(netUsd, receiver.rate, receiver.currencyCode),
        decimals: getCurrencyDecimals(receiver.currencyCode),
    };
};

module.exports = {
    BASE_CURRENCY,
    getCurrencyCodeForCountry,
    getRates,
    getRate,
    invalidateRateCache,
    toUsd,
    convert,
    convertWithRate,
    getUserCurrencyCode,
    getUserCurrency,
    attachDisplay,
    getAllRates,
    previewConversion,
};