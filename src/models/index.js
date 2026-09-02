// With Prisma, models are accessed via the prisma client directly.
// This file exports helpers that add business logic on top of Prisma queries.

const UserModel = require('./user.model');
const { tokenTypes } = require('./token.model');

module.exports = { UserModel, tokenTypes };
