// const allRoles = {
//     user: [],
//     admin: ['manageUsers', 'getUsers']
// }


// const roles = Object.keys(allRoles);
// const roleRights = new Map(Object.entries(allRoles));

// module.exports = {
//     roles,
//     roleRights
// }

const allRoles = {
    CUSTOMER: ['sendTrade', 'manageOwnWallet', 'manageOwnListings', 'viewDashboard'],
    BUSINESS: ['sendTrade', 'manageOwnWallet', 'manageOwnListings', 'viewDashboard'],
    ADMIN: [
        'manageUsers',
        'getUsers',
        'approveUsers',
        'manageWallets',
        'manageCurrencyRates',
        'viewCompanyAccount',
    ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
    roles,
    roleRights,
};