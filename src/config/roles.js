
const allRoles = {
    CUSTOMER: ['sendTrade', 'manageOwnWallet', 'manageOwnListings', 'viewDashboard'],
    BUSINESS: ['sendTrade', 'manageOwnWallet', 'manageOwnListings', 'viewDashboard'],
    ADMIN: [
        'manageUsers',
        'getUsers',
        'approveUsers',
        'manageWallets',
        'viewCompanyAccount',
    ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
    roles,
    roleRights,
};