const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getAllRegularizations,
  getPendingRegularizations,
  getRegularizationDetails,
  approveRegularization,
  rejectRegularization,
  getDashboardStats
} = require('../controllers/regularizationControllerVP');

// All routes require authentication
router.use(auth);

// Get all regularizations for VP/Admin (pending, approved, rejected for visibility)
router.get('/', getAllRegularizations);

// Get pending regularizations for VP/Admin
router.get('/pending', getPendingRegularizations);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get specific regularization details
router.get('/:id', getRegularizationDetails);

// Approve regularization
router.patch('/:id/approve', approveRegularization);

// Reject regularization
router.patch('/:id/reject', rejectRegularization);

module.exports = router;
