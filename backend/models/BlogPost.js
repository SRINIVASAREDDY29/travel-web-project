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
  title: {
    type: String,
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters'],
    default: ''
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
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['general', 'event', 'marketplace', 'alert'],
    default: 'general'
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

blogPostSchema.index({ authorId: 1, createdAt: -1 });
blogPostSchema.index({ createdAt: -1 });
blogPostSchema.index({ community: 1, createdAt: -1 });
blogPostSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
