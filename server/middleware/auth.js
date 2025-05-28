const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // For development, we'll skip token verification
  // In production, you would verify the JWT token here
  next();
};

module.exports = {
  verifyToken
}; 