const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

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

    // Generate token with user ID as string
    const token = generateToken(user._id.toString());

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        profilePhoto: user.profilePhoto || null
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

    // Generate token with user ID as string
    const token = generateToken(user._id.toString());

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        profilePhoto: user.profilePhoto || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login'
    });
  }
});

module.exports = router;
