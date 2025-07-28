const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const permissionController = require('../controllers/permissionController');

// Create a new permission request
router.post('/', auth, permissionController.createPermissionRequest);

// Get my permission requests
router.get('/my-requests', auth, permissionController.getMyPermissionRequests);

// Get pending approvals for current user
router.get('/pending-approvals', auth, permissionController.getPendingApprovals);

// Get permission request details by ID
router.get('/:id', auth, permissionController.getPermissionRequestById);

// Approve a permission request
router.patch('/:id/approve', auth, permissionController.approvePermissionRequest);

// Reject a permission request
router.patch('/:id/reject', auth, permissionController.rejectPermissionRequest);

module.exports = router;
