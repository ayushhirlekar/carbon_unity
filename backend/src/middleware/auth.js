const { verifyToken, extractToken } = require('../utils/jwt');

/**
 * Authenticate user via JWT token
 */
const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = {
      walletAddress: decoded.walletAddress,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Restrict to admin role only
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

/**
 * Restrict to buyer role only
 */
const buyerOnly = (req, res, next) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Buyers only.'
    });
  }
  next();
};

module.exports = {
  authenticate,
  adminOnly,
  buyerOnly
};