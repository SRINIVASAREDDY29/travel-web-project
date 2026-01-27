const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create profile photos directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');

if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

// Storage configuration for profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp-randomstring-originalname
    const userId = req.user?._id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only images allowed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    req.fileValidationError = 'Only image files are allowed for profile photos';
    cb(null, false);
  }
};

// Multer configuration for profile photos
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile photos
  }
});

module.exports = upload;
