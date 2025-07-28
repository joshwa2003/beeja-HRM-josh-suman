const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  regularizeAttendance,
  getAttendanceSummary,
  getTodayAttendance,
  getCurrentlyWorkingEmployees,
  updateActivity,
  checkAutoCheckout,
  getSmartOvertimeDetails,
  downloadAttendanceReport,
  getAttendanceCount
} = require('../controllers/attendanceController');

// @route   POST /api/attendance/checkin
// @desc    Check in employee
// @access  Private
router.post('/checkin', [
  auth,
  body('location').optional().isIn(['Office', 'Remote', 'Client Site']).withMessage('Invalid location'),
  body('notes').optional().isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters')
], checkIn);

// @route   POST /api/attendance/checkout
// @desc    Check out employee
// @access  Private
router.post('/checkout', [
  auth,
  body('notes').optional().isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters')
], checkOut);

// @route   GET /api/attendance/my
// @desc    Get current user's attendance records
// @access  Private
router.get('/my', auth, getMyAttendance);

// @route   GET /api/attendance/today
// @desc    Get today's attendance for current user
// @access  Private
router.get('/today', auth, getTodayAttendance);

// @route   GET /api/attendance/summary
// @desc    Get attendance summary for current user
// @access  Private
router.get('/summary', auth, getAttendanceSummary);

// @route   GET /api/attendance/currently-working
// @desc    Get all employees currently working (checked in but not checked out today)
// @access  Private (Admin/HR/Manager)
router.get('/currently-working', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], getCurrentlyWorkingEmployees);

// @route   GET /api/attendance/count
// @desc    Get attendance count for specific filters
// @access  Private (Admin/HR/Manager)
router.get('/count', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], getAttendanceCount);

// @route   GET /api/attendance/download-report
// @desc    Download attendance report in Excel or PDF format
// @access  Private (Admin/HR/Manager)
router.get('/download-report', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], downloadAttendanceReport);

// @route   GET /api/attendance
// @desc    Get all attendance records (Admin/HR/Manager access)
// @access  Private
router.get('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], getAllAttendance);

// @route   GET /api/attendance/:id
// @desc    Get attendance record by ID
// @access  Private
router.get('/:id', auth, getAttendanceById);

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Admin/HR/Manager)
router.put('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  body('checkIn').optional().isISO8601().withMessage('Invalid check-in time'),
  body('checkOut').optional().isISO8601().withMessage('Invalid check-out time'),
  body('status').optional().isIn(['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday']).withMessage('Invalid status'),
  body('location').optional().isIn(['Office', 'Remote', 'Client Site']).withMessage('Invalid location'),
  body('notes').optional().isLength({ max: 300 }).withMessage('Notes cannot exceed 300 characters')
], updateAttendance);

// @route   POST /api/attendance/:id/regularize
// @desc    Regularize attendance record
// @access  Private (Admin/HR/Manager)
router.post('/:id/regularize', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  body('reason').notEmpty().withMessage('Regularization reason is required'),
  body('checkIn').optional().isISO8601().withMessage('Invalid check-in time'),
  body('checkOut').optional().isISO8601().withMessage('Invalid check-out time')
], regularizeAttendance);

// @route   POST /api/attendance/activity
// @desc    Update employee activity (for auto-checkout tracking)
// @access  Private
router.post('/activity', auth, updateActivity);

// @route   GET /api/attendance/auto-checkout-check
// @desc    Check for auto-checkout candidates and perform auto-checkout
// @access  Private (Admin/HR/Manager)
router.get('/auto-checkout-check', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], checkAutoCheckout);

// @route   GET /api/attendance/smart-overtime/:id
// @desc    Get attendance with smart overtime details
// @access  Private
router.get('/smart-overtime/:id', auth, getSmartOvertimeDetails);

module.exports = router;
