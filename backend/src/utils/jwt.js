const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

/**
 * Generate JWT token for authenticated user
 * @param {string} walletAddress - User's wallet address
 * @param {string} role - User's role (farmer/buyer)
 * @returns {string} JWT token
 */
const generateToken = (walletAddress, role) => {
  const payload = {
    walletAddress: walletAddress.toLowerCase(),
    role,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  });
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};