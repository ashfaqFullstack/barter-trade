/**
 * @file api/index.js
 * @description Vercel serverless entry point. Exports the Express app directly
 * so @vercel/node can handle it as a request handler.
 */

const app = require('../src/app');

module.exports = app;
