const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  profilePhoto: {
    type: String,
    default: null
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: [60, 'Full name cannot exceed 60 characters'],
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [300, 'Bio cannot exceed 300 characters'],
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },
  communities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],
  tokenVersion: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
