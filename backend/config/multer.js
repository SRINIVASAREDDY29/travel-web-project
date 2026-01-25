const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');

[uploadsDir, imagesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaType = req.body.mediaType || 'image';
    const destDir = mediaType === 'image' ? imagesDir : videosDir;
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const mediaType = req.body.mediaType || 'image';
  
  if (mediaType === 'image') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      req.fileValidationError = 'Only image files are allowed';
      cb(null, false);
    }
  } else if (mediaType === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      req.fileValidationError = 'Only video files are allowed';
      cb(null, false);
    }
  } else {
    req.fileValidationError = 'Invalid media type';
    cb(null, false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

module.exports = upload;
