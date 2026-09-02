// Token model helpers for Prisma
// The actual Prisma model is defined in prisma/schema.prisma

// Re-export token types for convenience (same as config/tokens.js)
const { tokenTypes } = require('../config/tokens');

module.exports = { tokenTypes };
