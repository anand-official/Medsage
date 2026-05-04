'use strict';

const crypto = require('crypto');

function createObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = {
  createObjectId,
};
