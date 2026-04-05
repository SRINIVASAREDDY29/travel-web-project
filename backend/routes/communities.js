const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Community = require('../models/Community');
const User = require('../models/User');
const BlogPost = require('../models/BlogPost');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all communities (with search)
router.get('/', async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 50);
      filter.name = { $regex: escaped, $options: 'i' };
    }
    if (category && ['campus', 'housing', 'interest', 'department', 'other'].includes(category)) {
      filter.category = category;
    }

    const communities = await Community.find(filter)
      .sort({ createdAt: -1 })
      .populate('creator', 'username')
      .lean();

    const result = communities.map(c => ({
      ...c,
      memberCount: c.members ? c.members.length : 0
    }));

    res.json({ communities: result });
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ message: 'Error fetching communities' });
  }
});

// Get a single community by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const community = await Community.findById(req.params.id)
      .populate('creator', 'username profilePhoto')
      .populate('members', 'username profilePhoto');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    res.json({ community });
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ message: 'Error fetching community' });
  }
});

// Get posts for a community (paginated)
router.get('/:id/posts', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter = { community: req.params.id };
    if (req.query.category && ['general', 'event', 'marketplace', 'alert'].includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const [posts, totalPosts] = await Promise.all([
      BlogPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'username profilePhoto'),
      BlogPost.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts,
      page,
      totalPages,
      totalPosts,
      hasMore: page < totalPages
    });
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ message: 'Error fetching community posts' });
  }
});

// Create a community
router.post('/',
  authenticateToken,
  [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Community name must be 3-50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('category')
      .optional()
      .isIn(['campus', 'housing', 'interest', 'department', 'other'])
      .withMessage('Invalid category')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { name, description, category } = req.body;

      const existing = await Community.findOne({ name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      if (existing) {
        return res.status(400).json({ message: 'A community with this name already exists' });
      }

      const community = await Community.create({
        name: name.trim(),
        description: description ? description.trim() : '',
        category: category || 'other',
        creator: req.user._id,
        members: [req.user._id]
      });

      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { communities: community._id }
      });

      const populated = await Community.findById(community._id)
        .populate('creator', 'username')
        .populate('members', 'username profilePhoto');

      res.status(201).json({
        message: 'Community created successfully',
        community: populated
      });
    } catch (error) {
      console.error('Create community error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'A community with this name already exists' });
      }
      res.status(500).json({ message: 'Error creating community' });
    }
  }
);

// Join a community
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user._id.toString();
    if (community.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    community.members.push(req.user._id);
    await community.save();

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { communities: community._id }
    });

    res.json({
      message: 'Joined community',
      memberCount: community.members.length
    });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ message: 'Error joining community' });
  }
});

// Leave a community
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const userId = req.user._id.toString();
    if (!community.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'Not a member' });
    }

    if (community.creator.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot leave. Transfer ownership or delete the community.' });
    }

    community.members = community.members.filter(m => m.toString() !== userId);
    await community.save();

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { communities: community._id }
    });

    res.json({
      message: 'Left community',
      memberCount: community.members.length
    });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ message: 'Error leaving community' });
  }
});

// Delete a community (creator only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid community ID' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this community' });
    }

    await User.updateMany(
      { communities: community._id },
      { $pull: { communities: community._id } }
    );

    await BlogPost.updateMany(
      { community: community._id },
      { $unset: { community: '' } }
    );

    await community.deleteOne();

    res.json({ message: 'Community deleted' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Error deleting community' });
  }
});

module.exports = router;
