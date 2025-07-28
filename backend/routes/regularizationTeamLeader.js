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
} = require('../controllers/regularizationControllerTeamLeader');

// All routes require authentication
router.use(auth);

// Get all regularizations for Team Leader (including approved ones for visibility)
router.get('/', getAllRegularizations);

// Get pending regularizations for Team Leader
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
