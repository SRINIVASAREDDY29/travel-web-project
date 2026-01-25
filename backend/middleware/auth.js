const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Use environment variable for JWT secret, throw error if not set in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Generate JWT token (moved here for consistency)
const generateToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString() },
    JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'travelblog-api',
      audience: 'travelblog-client'
    }
  );
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Check if Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'travelblog-api',
        audience: 'travelblog-client'
      });
    } catch (verifyError) {
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      throw verifyError;
    }

    // Validate decoded token has userId
    if (!decoded.userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Find user and verify they still exist
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request object
    req.user = user;
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

module.exports = { authenticateToken, JWT_SECRET, generateToken };
