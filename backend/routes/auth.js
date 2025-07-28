  const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
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
  upload
} = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  auth,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please enter a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other', 'Prefer not to say'])
    .withMessage('Please select a valid gender'),
  body('emergencyContact.phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please enter a valid emergency contact phone number')
], updateProfile);

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get('/verify', auth, verifyToken);

// @route   POST /api/auth/upload-document
// @desc    Upload user document
// @access  Private
router.post('/upload-document', auth, upload.single('document'), uploadDocument);

// @route   DELETE /api/auth/delete-document/:documentType
// @desc    Delete user document
// @access  Private
router.delete('/delete-document/:documentType', auth, deleteDocument);

// @route   POST /api/auth/verify-current-password
// @desc    Verify current password
// @access  Private
router.post('/verify-current-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
], verifyCurrentPassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private

router.post('/logout', auth, logout);

// @route   POST /api/auth/send-password-change-otp
// @desc    Send OTP for password change
// @access  Private
router.post('/send-password-change-otp', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
], sendPasswordChangeOTP);

// @route   POST /api/auth/verify-otp-and-change-password
// @desc    Verify OTP and change password
// @access  Private
router.post('/verify-otp-and-change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], verifyOTPAndChangePassword);

module.exports = router;
