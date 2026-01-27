const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const profileUpload = require('../config/profileMulter');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      user: {
        id: user._id.toString(),
        username: user.username,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      message: 'Error fetching profile'
    });
  }
});

// Update profile photo
router.put('/photo', 
  authenticateToken,
  (req, res, next) => {
    profileUpload.single('profilePhoto')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Profile photo size exceeds 5MB limit' });
          }
          return res.status(400).json({ message: 'File upload error: ' + err.message });
        }
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      // Handle multer validation errors
      if (req.fileValidationError) {
        return res.status(400).json({ message: req.fileValidationError });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Profile photo file is required' });
      }

      const user = await User.findById(req.user._id);
      
      if (!user) {
        // Clean up uploaded file if user not found
        const filePath = path.join(__dirname, '..', req.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete old profile photo if exists
      if (user.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', user.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (fileError) {
            console.error('Error deleting old profile photo:', fileError);
            // Continue with update even if old photo deletion fails
          }
        }
      }

      // Construct new profile photo URL
      const profilePhotoUrl = `/uploads/profile-photos/${req.file.filename}`;

      // Update user profile photo
      user.profilePhoto = profilePhotoUrl;
      await user.save();

      res.json({
        message: 'Profile photo updated successfully',
        user: {
          id: user._id.toString(),
          username: user.username,
          profilePhoto: user.profilePhoto
        }
      });
    } catch (error) {
      console.error('Error updating profile photo:', error);
      
      // Clean up uploaded file on error
      if (req.file) {
        const filePath = path.join(__dirname, '..', req.file.path);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            console.error('Error cleaning up file:', fileError);
          }
        }
      }
      
      res.status(500).json({ 
        message: 'Error updating profile photo'
      });
    }
  }
);

module.exports = router;
