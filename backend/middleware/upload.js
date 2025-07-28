const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/leave-documents');
const holidayExcelDir = path.join(__dirname, '../uploads/holiday-excel');
const ticketAttachmentsDir = path.join(__dirname, '../uploads/ticket-attachments');
const chatAttachmentsDir = path.join(__dirname, '../uploads/chat-attachments');
const resumeDir = path.join(__dirname, '../uploads/resumes');
const offerLettersDir = path.join(__dirname, '../uploads/offer-letters');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(holidayExcelDir)) {
  fs.mkdirSync(holidayExcelDir, { recursive: true });
}

if (!fs.existsSync(ticketAttachmentsDir)) {
  fs.mkdirSync(ticketAttachmentsDir, { recursive: true });
}

if (!fs.existsSync(chatAttachmentsDir)) {
  fs.mkdirSync(chatAttachmentsDir, { recursive: true });
}

if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true });
}

if (!fs.existsSync(offerLettersDir)) {
  fs.mkdirSync(offerLettersDir, { recursive: true });
}

// Configure multer storage for leave documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_userId_originalname
    const uniqueSuffix = Date.now() + '_' + req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// Configure multer storage for ticket attachments
const ticketStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ticketAttachmentsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_userId_originalname
    const uniqueSuffix = Date.now() + '_' + req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `ticket_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter function for leave documents
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
  }
};

// File filter function for ticket attachments (more file types allowed)
const ticketFileFilter = (req, file, cb) => {
  // Check file type - more permissive for helpdesk tickets
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.txt'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, DOCX, and TXT files are allowed.'), false);
  }
};

// Configure multer for leave documents
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// Configure multer for ticket attachments
const uploadTicketAttachments = multer({
  storage: ticketStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: ticketFileFilter
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File size too large. Maximum size allowed is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      message: error.message
    });
  }
  
  next(error);
};

// Utility function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file info
const getFileInfo = (filename) => {
  const filePath = path.join(uploadDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { exists: false };
  }
};

// Configure multer storage for Excel files
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, holidayExcelDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_userId_originalname
    const uniqueSuffix = Date.now() + '_' + req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `holidays_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter for Excel files
const excelFileFilter = (req, file, cb) => {
  // Check file type for Excel files
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'), false);
  }
};

// Configure multer storage for chat attachments
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatAttachmentsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_userId_originalname
    const uniqueSuffix = Date.now() + '_' + req.user.id;
    const fileExtension = path.extname(file.originalname);
    const fileName = `chat_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter function for chat attachments
const chatFileFilter = (req, file, cb) => {
  // Check file type - allow images, documents, archives, and common file types
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, archives (ZIP, RAR, 7Z), and common file types are allowed.'), false);
  }
};

// Configure multer for chat attachments
const uploadChatAttachments = multer({
  storage: chatStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per message
  },
  fileFilter: chatFileFilter
});

// Configure multer for Excel uploads
const uploadExcel = multer({
  storage: excelStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Excel files
    files: 1 // Only 1 file per request
  },
  fileFilter: excelFileFilter
});

// Configure multer storage for resume uploads
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `resume_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter function for resume uploads
const resumeFileFilter = (req, file, cb) => {
  // Check file type - allow PDF and DOC files for resumes
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed for resumes.'), false);
  }
};

// Configure multer for resume uploads
const resumeUpload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only 1 resume per application
  },
  fileFilter: resumeFileFilter
});

// Configure multer storage for offer letters
const offerLetterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, offerLettersDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `offer_${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// Configure multer for offer letter uploads
const offerLetterUpload = multer({
  storage: offerLetterStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only 1 offer letter per upload
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files for offer letters
    if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed for offer letters.'), false);
    }
  }
});

module.exports = {
  upload,
  uploadTicketAttachments,
  uploadChatAttachments,
  uploadExcel,
  resumeUpload,
  offerLetterUpload,
  handleUploadError,
  deleteFile,
  getFileInfo,
  uploadDir,
  holidayExcelDir,
  ticketAttachmentsDir,
  chatAttachmentsDir,
  resumeDir,
  offerLettersDir
};
