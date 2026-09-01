const express = require('express');
const userRoute = require('./user.route')
const authRoute = require('./auth.route')

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