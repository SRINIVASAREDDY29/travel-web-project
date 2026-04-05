const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Community name must be at least 3 characters'],
    maxlength: [50, 'Community name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    enum: ['campus', 'housing', 'interest', 'department', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

communitySchema.index({ members: 1 });
communitySchema.index({ creator: 1 });

module.exports = mongoose.model('Community', communitySchema);
