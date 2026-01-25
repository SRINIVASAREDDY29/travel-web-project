const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true,
    trim: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaType: {
    type: String,
    required: true,
    enum: ['image', 'video']
  },
  mediaUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Index for efficient querying
blogPostSchema.index({ authorId: 1, createdAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
