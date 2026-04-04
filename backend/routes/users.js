const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const sanitized = escapeRegex(q.trim()).slice(0, 50);

    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: sanitized, $options: 'i' }
    })
      .select('username profilePhoto')
      .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id).select('username profilePhoto');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

module.exports = router;
