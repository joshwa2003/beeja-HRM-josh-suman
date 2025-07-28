const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const hrController = require('../controllers/regularizationControllerHR');

// All routes require authentication
router.use(auth);

// Get dashboard statistics (HR READ-ONLY) - must come before /:id
router.get('/stats', hrController.getDashboardStats);

// Get all regularization requests (HR READ-ONLY)
router.get('/', hrController.getAllRegularizations);

// Approve regularization (HR can approve Team Manager requests) - must come before /:id
router.patch('/:id/approve', hrController.approveRegularization);

// Reject regularization (HR can reject Team Manager requests) - must come before /:id
router.patch('/:id/reject', hrController.rejectRegularization);

// Get regularization details (HR READ-ONLY) - must come last among /:id routes
router.get('/:id', hrController.getRegularizationDetails);

module.exports = router;
