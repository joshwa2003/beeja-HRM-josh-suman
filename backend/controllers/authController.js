const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://etvdufporvnfpgdzpcrr.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dmR1ZnBvcnZuZnBnZHpwY3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjEzODI0MSwiZXhwIjoyMDY3NzE0MjQxfQ.ij-v-aNRdKuAOfReghfw_usAwlG8PFXdthre0_a8278'
);

// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG files are allowed.'), false);
    }
  }
});

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists (using lean to avoid validation issues)
    const user = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password using bcrypt directly to avoid validation issues
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Update last login (skip validation to avoid department ObjectId issues)
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() }, { runValidators: false });

    // Generate token
    const token = generateToken(user._id);

    // Handle department for response
    let departmentName = 'Not assigned';
    if (user.department) {
      if (typeof user.department === 'string') {
        departmentName = user.department;
      } else if (user.department.name) {
        departmentName = user.department.name;
      }
    }

    // Send response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        department: departmentName,
        employeeId: user.employeeId,
        profilePhoto: user.profilePhoto,
        lastLogin: new Date()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean(); // Use lean to avoid validation issues
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Handle case where department might be a string instead of ObjectId
    let departmentName = 'Not assigned';
    if (user.department) {
      if (typeof user.department === 'string') {
        departmentName = user.department;
      } else if (user.department.name) {
        departmentName = user.department.name;
      }
    }

    // Create a clean user object
    const userResponse = {
      ...user,
      department: departmentName
    };

    res.json({
      user: userResponse
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.employeeId;
    delete updateData.isActive;
    delete updateData.createdBy;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: false // Skip validation to avoid department issues
      }
    ).select('-password')
     .lean();

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Handle department for response
    let departmentName = 'Not assigned';
    if (user.department) {
      if (typeof user.department === 'string') {
        departmentName = user.department;
      } else if (user.department.name) {
        departmentName = user.department.name;
      }
    }

    // Create a clean user object
    const userResponse = {
      ...user,
      department: departmentName
    };

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      message: 'Server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    // If we reach here, the auth middleware has already verified the token
    res.json({
      message: 'Token is valid',
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        department: req.user.department,
        profilePhoto: req.user.profilePhoto
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Server error during token verification'
    });
  }
};

// @desc    Upload document
// @route   POST /api/auth/upload-document
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        message: 'Document type is required'
      });
    }

    // Validate document type
    const validDocumentTypes = ['idProof', 'offerLetter', 'educationalCertificates', 'experienceLetters', 'passport'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        message: 'Invalid document type'
      });
    }

    const userId = req.user.id;
    const fileName = `${userId}_${documentType}_${Date.now()}_${file.originalname}`;
    const filePath = `documents/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({
        message: 'Failed to upload file to storage',
        error: error.message
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Update user document in database
    const updateData = {
      [`documents.${documentType}`]: {
        fileName: fileName,
        originalName: file.originalname,
        fileUrl: urlData.publicUrl,
        filePath: filePath,
        uploadedAt: new Date(),
        fileSize: file.size,
        mimeType: file.mimetype
      }
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: false }
    ).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'Document uploaded successfully',
      document: user.documents[documentType]
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      message: 'Server error while uploading document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/auth/delete-document/:documentType
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const { documentType } = req.params;
    const userId = req.user.id;

    // Validate document type
    const validDocumentTypes = ['idProof', 'offerLetter', 'educationalCertificates', 'experienceLetters', 'passport'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        message: 'Invalid document type'
      });
    }

    // Get user to find the file path
    const user = await User.findById(userId).select('documents').lean();
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const document = user.documents?.[documentType];
    if (!document) {
      return res.status(404).json({
        message: 'Document not found'
      });
    }

    // Delete from Supabase Storage
    if (document.filePath) {
      const { error } = await supabase.storage
        .from('documents')
        .remove([document.filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        // Continue with database update even if storage delete fails
      }
    }

    // Remove document from database
    const updateData = {
      [`documents.${documentType}`]: null
    };

    await User.findByIdAndUpdate(
      userId,
      { $unset: updateData },
      { runValidators: false }
    );

    res.json({
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      message: 'Server error while deleting document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Verify current password
// @route   POST /api/auth/verify-current-password
// @access  Private
const verifyCurrentPassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const userId = req.user.id;

    // Get user from database
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    res.json({
      success: true,
      message: 'Current password verified successfully'
    });

  } catch (error) {
    console.error('Verify current password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a JWT implementation, logout is typically handled client-side
    // by removing the token from storage. Here we just confirm the logout.
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Server error during logout'
    });
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Send OTP for password change
// @route   POST /api/auth/send-password-change-otp
// @access  Private
const sendPasswordChangeOTP = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user from database
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in memory (in production, use Redis or database)
    otpStorage.set(userId, {
      otp,
      currentPassword,
      newPassword,
      expiresAt: otpExpiry,
      attempts: 0
    });

    // Send OTP via email using the email service
    try {
      const emailResult = await emailService.sendOTPEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        otp
      );

      if (emailResult.success) {
        res.json({
          success: true,
          message: 'OTP sent to your email address successfully',
          previewUrl: emailResult.previewUrl // For development/testing
        });
      } else {
        throw new Error('Email service failed');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Fallback to console logging in development
      console.log('\n=== DEVELOPMENT MODE: OTP EMAIL FALLBACK ===');
      console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires: ${otpExpiry.toLocaleString()}`);
      console.log('===========================================\n');
      
      res.json({
        success: true,
        message: 'Email service unavailable. OTP has been logged to console for development purposes.'
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      message: 'Server error while sending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Verify OTP and change password
// @route   POST /api/auth/verify-otp-and-change-password
// @access  Private
const verifyOTPAndChangePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword, otp } = req.body;
    const userId = req.user.id;

    // Get stored OTP data
    const storedOTPData = otpStorage.get(userId);
    if (!storedOTPData) {
      return res.status(400).json({
        message: 'OTP not found or expired. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (new Date() > storedOTPData.expiresAt) {
      otpStorage.delete(userId);
      return res.status(400).json({
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempt limit
    if (storedOTPData.attempts >= 3) {
      otpStorage.delete(userId);
      return res.status(400).json({
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otp !== storedOTPData.otp) {
      storedOTPData.attempts += 1;
      otpStorage.set(userId, storedOTPData);
      
      return res.status(400).json({
        message: `Invalid OTP. ${3 - storedOTPData.attempts} attempts remaining.`
      });
    }

    // Verify that the passwords match the stored ones
    if (currentPassword !== storedOTPData.currentPassword || newPassword !== storedOTPData.newPassword) {
      otpStorage.delete(userId);
      return res.status(400).json({
        message: 'Password data mismatch. Please start the process again.'
      });
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      otpStorage.delete(userId);
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password again
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      otpStorage.delete(userId);
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await User.findByIdAndUpdate(
      userId,
      { 
        password: hashedNewPassword,
        passwordChangedAt: new Date()
      },
      { runValidators: false }
    );

    // Clear OTP from storage
    otpStorage.delete(userId);

    // Send confirmation email using email service (don't wait for it)
    emailService.sendPasswordChangeConfirmation(
      user.email,
      `${user.firstName} ${user.lastName}`
    ).catch(emailError => {
      console.error('Confirmation email error:', emailError);
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Verify OTP and change password error:', error);
    res.status(500).json({
      message: 'Server error while changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile,
  uploadDocument,
  deleteDocument,
  verifyToken,
  verifyCurrentPassword,
  logout,
  sendPasswordChangeOTP,
  verifyOTPAndChangePassword,
  upload // Export multer upload middleware
};
