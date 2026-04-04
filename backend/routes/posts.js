const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const BlogPost = require('../models/BlogPost');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

// Get current user's posts (protected route - must come before /:id)
router.get('/my-posts', authenticateToken, async (req, res) => {
  try {
    const posts = await BlogPost.find({ authorId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username')
      .select('-authorId.password');

    res.json({
      message: 'Your posts retrieved successfully',
      posts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ 
      message: 'Error fetching your posts'
    });
  }
});

// Get posts by user ID (for profile)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await BlogPost.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username')
      .select('-authorId.password');

    res.json({
      message: 'User posts retrieved successfully',
      posts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ 
      message: 'Error fetching user posts'
    });
  }
});

// Get all blog posts (public feed, paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      BlogPost.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'username')
        .select('-authorId.password'),
      BlogPost.countDocuments()
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      message: 'Blog posts retrieved successfully',
      posts,
      page,
      totalPages,
      totalPosts,
      hasMore: page < totalPages
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      message: 'Error fetching blog posts'
    });
  }
});

// Get single blog post by ID (must be last to avoid route conflicts)
router.get('/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id)
      .populate('authorId', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    res.json({
      message: 'Blog post retrieved successfully',
      post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    res.status(500).json({ 
      message: 'Error fetching blog post'
    });
  }
});

// Create new blog post (protected route)
router.post('/', 
  authenticateToken,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size exceeds 50MB limit' });
        }
        return res.status(400).json({ message: 'File upload error: ' + err.message });
      }
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  },
  [
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
  ],
  async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    let uploadedFilePath = null;

    try {
      // Handle multer validation errors
      if (req.fileValidationError) {
        return res.status(400).json({ message: req.fileValidationError });
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          const filePath = path.join(__dirname, '..', req.file.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      uploadedFilePath = req.file.path;

      const { mediaType, description } = req.body;

      // Validate media type
      if (!mediaType || !['image', 'video'].includes(mediaType)) {
        // Clean up uploaded file
        const filePath = path.join(__dirname, '..', uploadedFilePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(400).json({ message: 'Invalid media type. Must be "image" or "video"' });
      }

      // Construct media URL
      const mediaPath = mediaType === 'image' ? 'images' : 'videos';
      const mediaUrl = `/uploads/${mediaPath}/${req.file.filename}`;

      // Create blog post
      const blogPost = new BlogPost({
        author: req.user.username,
        authorId: req.user._id,
        mediaType,
        mediaUrl,
        description: description || undefined
      });

      await blogPost.save();

      res.status(201).json({
        message: 'Blog post created successfully',
        post: blogPost
      });
    } catch (error) {
      console.error('Error creating post:', error);
      
      // Clean up uploaded file on error
      if (uploadedFilePath) {
        const filePath = path.join(__dirname, '..', uploadedFilePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.status(500).json({ 
        message: 'Error creating blog post'
      });
    }
  }
);

// Update blog post (protected route - only author can update)
router.put('/:id', 
  authenticateToken,
  [
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const post = await BlogPost.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: 'Blog post not found' });
      }

      // Check if user is the author
      if (post.authorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own posts' });
      }

      // Update description if provided
      if (req.body.description !== undefined) {
        post.description = req.body.description || undefined;
      }

      await post.save();

      res.json({
        message: 'Blog post updated successfully',
        post
      });
    } catch (error) {
      console.error('Error updating post:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid post ID' });
      }
      res.status(500).json({ 
        message: 'Error updating blog post'
      });
    }
  }
);

// Delete blog post (protected route - only author can delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Check if user is the author
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // Delete the actual file from disk
    if (post.mediaUrl) {
      const filePath = path.join(__dirname, '..', post.mediaUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
          // Continue with post deletion even if file deletion fails
        }
      }
    }

    await post.deleteOne();

    res.json({
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    res.status(500).json({ 
      message: 'Error deleting blog post'
    });
  }
});

module.exports = router;
