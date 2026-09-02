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
    CUSTOMER: ['sendTrade', 'manageOwnWallet'],
    BUSINESS: ['sendTrade', 'manageOwnWallet', 'manageOwnListings'],
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