const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Trim username to ensure consistency
    const trimmedUsername = username.trim();

    // Check if user already exists
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = new User({ username: trimmedUsername, password });
    await user.save();

    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        profilePhoto: user.profilePhoto || null,
        fullName: user.fullName || '',
        bio: user.bio || '',
        location: user.location || ''
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate username error
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Handle MongoDB connection errors
    if (error.name === 'MongoNetworkError' || 
        error.name === 'MongoTimeoutError' || 
        error.message?.includes('connection') ||
        error.message?.includes('timeout')) {
      return res.status(503).json({ 
        message: 'Database connection failed. Please check if MongoDB is running.' 
      });
    }
    
    // Handle validation errors from mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: errors[0] || 'Validation failed' 
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Trim username for exact match (usernames are stored trimmed)
    const trimmedUsername = username.trim();

    // Find user by username (exact match - industry standard)
    const user = await User.findOne({ username: trimmedUsername });
    
    if (!user) {
      // Use same error message to prevent username enumeration
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check password with proper error handling
    try {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error('Password comparison error:', error);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), user.tokenVersion);

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        profilePhoto: user.profilePhoto || null,
        fullName: user.fullName || '',
        bio: user.bio || '',
        location: user.location || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);

    // Database/connection issues
    if (error.name === 'MongooseError' && error.message?.includes('buffering')) {
      return res.status(503).json({
        message: 'Database is connecting. Please try again in a few seconds.'
      });
    }
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError' ||
        error.message?.includes('connection') || error.message?.includes('timeout')) {
      return res.status(503).json({
        message: 'Database connection issue. Please try again.'
      });
    }

    res.status(500).json({
      message: 'Server error during login'
    });
  }
});

// Refresh access token using a valid refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Refresh token expired' });
      }
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const token = generateToken(user._id.toString());
    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Error refreshing token' });
  }
});

// Logout — increments tokenVersion to revoke all refresh tokens
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.json({ message: 'Logged out' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.json({ message: 'Logged out' });
    }

    if (decoded.type === 'refresh' && decoded.userId) {
      await User.findByIdAndUpdate(decoded.userId, { $inc: { tokenVersion: 1 } });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out' });
  }
});

module.exports = router;
