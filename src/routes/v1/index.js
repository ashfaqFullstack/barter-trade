const express = require('express');
const userRoute = require('./user.route')
const authRoute = require('./auth.route')
const businessRoute = require('./business.route');
const customerRoute = require('./customer.route');
const adminRoute = require('./admin.route');
const walletRoute = require('./wallet.route')
const transactionRoute = require('./transaction.route');
const listingRoute = require('./listing.route');
const orderRoute = require('./order.route');
const barterRoute = require('./barter.route');
const currencyRoute = require('./currency.route')
const reportRoute = require('./report.route')
const dashboardRoute = require('./dashboard.route');
const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute,
    },
    {
        path: '/users',
        route: userRoute,
    },
    {
        path: '/business',
        route: businessRoute,
    },
    {
        path: '/customer',
        route: customerRoute,
    },
    {
        path: '/admin',
        route: adminRoute,
    },
    {
        path: '/wallet',
        route: walletRoute,
    },
    {
        path: '/transactions',
        route: transactionRoute,
    },
    {
        path: '/listings',
        route: listingRoute,
    },
    {
        path: '/orders',
        route: orderRoute
    },
    {
        path: '/barter-offers',
        route: barterRoute
    },
    {
        path: '/currency-rates',
        route: currencyRoute,
    },
    {
        path: '/admin',
        route: reportRoute
    },
    {
        path: '/dashboard',
        route: dashboardRoute,
    },
];

// const devRoutes = [
//     // routes available only in development mode
//     {
//         path: '/docs',
//         route: docsRoute,
//     },
// ];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route)
})


// if (config.env === 'development') {
//     devRoutes.forEach((route) => {
//         router.use(route.path, route.route);
//     });
// };

module.exports = router;