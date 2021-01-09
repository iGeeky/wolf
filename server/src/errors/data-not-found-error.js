'use strict';

module.exports = function DataNotFoundError(code, message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.code = code
  this.message = message;
};

require('util').inherits(module.exports, Error);
