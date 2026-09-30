
// All ledger values are USD with 6 decimal places (Decimal(18,6) in Postgres).
// Display values are rounded to the decimals of the viewer's currency.

const round = (value, digits) => {
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const roundUsd = (value) => round(value, 6);

// Number of minor-unit digits for a currency (USD/PKR/EUR = 2, JPY = 0, KWD = 3 ...).
// Uses the runtime's ICU data, so no manual mapping is needed.
const decimalsCache = new Map();
const getCurrencyDecimals = (currencyCode) => {
    if (!decimalsCache.has(currencyCode)) {
        let digits = 2;
        try {
            digits = new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode })
                .resolvedOptions().maximumFractionDigits;
        } catch (e) {
            digits = 2; // unknown code -> default to 2 decimals
        }
        decimalsCache.set(currencyCode, digits);
    }
    return decimalsCache.get(currencyCode);
};

const roundForCurrency = (value, currencyCode) => round(value, getCurrencyDecimals(currencyCode));

const formatMoney = (value, currencyCode) => {
    try {
        return new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(Number(value));
    } catch (e) {
        return `${Number(value).toFixed(2)} ${currencyCode}`;
    }
};

module.exports = { round, roundUsd, getCurrencyDecimals, roundForCurrency, formatMoney };
