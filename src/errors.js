"use strict";
class ValidationError extends Error {}
class NotFoundError extends Error {}
module.exports = { ValidationError, NotFoundError };