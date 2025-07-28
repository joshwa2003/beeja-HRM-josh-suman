const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, '../uploads/receipts'),
  path.join(__dirname, '../uploads/documents'),
  path.join(__dirname, '../uploads/profiles'),
  path.join(__dirname, '../uploads/regularization')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../uploads/');
    
    // Determine upload path based on fieldname or route
    if (file.fieldname === 'receipts') {
      uploadPath += 'receipts/';
    } else if (file.fieldname === 'profilePhoto') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'documents') {
      uploadPath += 'regularization/';
    } else {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    let prefix = 'file';
    
    if (file.fieldname === 'receipts') {
      prefix = 'receipt';
    } else if (file.fieldname === 'profilePhoto') {
      prefix = 'profile';
    } else if (file.fieldname === 'documents') {
      prefix = 'regularization';
    }
    
    cb(null, prefix + '-' + uniqueSuffix + extension);
  }
});

// File filter to allow only images, PDFs, and documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image\/(jpeg|jpg|png|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG, GIF), PDF files, and Word documents are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

module.exports = upload;
