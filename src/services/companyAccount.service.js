const prisma = require('../config/prisma');
const config = require('../config/config');

const ACCOUNT_ID = config.companyAccountId;

// Ensures the single CompanyAccount row exists, returns it.
const getOrCreateCompanyAccount = async (tx = prisma) => {
    return tx.companyAccount.upsert({
        where: { id: ACCOUNT_ID },
        create: { id: ACCOUNT_ID, totalBalance: 0 },
        update: {},
    });
};

// Must be called with the same `tx` (prisma transaction client) as the
// rest of a trade/fee operation, to keep everything atomic.
const creditCompanyAccount = async (tx, amount) => {
    await getOrCreateCompanyAccount(tx);
    return tx.companyAccount.update({
        where: { id: ACCOUNT_ID },
        data: { totalBalance: { increment: amount } },
    });
};

module.exports = { getOrCreateCompanyAccount, creditCompanyAccount, ACCOUNT_ID };