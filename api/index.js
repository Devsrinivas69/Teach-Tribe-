/**
 * Vercel Serverless Function Entry Point
 * Re-exports the Express app so Vercel routes /api/* requests here.
 */
const app = require('../server/api.js');

module.exports = app;
