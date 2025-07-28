const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getRegularizations,
  getRegularizationById,
  createRegularization,
  submitRegularization,
  approveRegularization,
  rejectRegularization,
  getPendingApprovals,
  getRegularizationStatistics,
  cancelRegularization,
  getRegularizationConfig
} = require('../controllers/regularizationController');

// Middleware to check if user has regularization approval access
const checkApprovalAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for regularization approval.'
    });
  }
  next();
};

// Middleware to check if user has regularization management access
const checkManagementAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for regularization management.'
    });
  }
  next();
};

// Get all regularization requests with filters and pagination
// Access: All authenticated users (filtered by role in controller)
router.get('/', auth, getRegularizations);

// Get regularization configuration (request types, priorities, etc.)
router.get('/config', auth, getRegularizationConfig);

// Get pending approvals for current user
router.get('/pending-approvals', auth, checkApprovalAccess, getPendingApprovals);

// Get regularization statistics
router.get('/statistics', auth, getRegularizationStatistics);

// Get employee's regularization requests
router.get('/employee', auth, async (req, res) => {
  try {
    const Regularization = require('../models/Regularization');
    const regularizations = await Regularization.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName employeeId')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role')
      .populate('finalApprover', 'firstName lastName role')
      .sort({ submittedDate: -1 });
    
    res.json({
      success: true,
      data: regularizations
    });
  } catch (error) {
    console.error('Error fetching employee regularizations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get single regularization by ID (must be after specific routes)
router.get('/:id', auth, getRegularizationById);

// Create new regularization request
// Configure multer for regularization documents
const regularizationUpload = upload.array('documents', 5);

router.post('/', auth, regularizationUpload, createRegularization);

// Submit regularization for approval
router.patch('/:id/submit', auth, submitRegularization);

// Approve regularization
router.patch('/:id/approve', auth, checkApprovalAccess, approveRegularization);

// Reject regularization
router.patch('/:id/reject', auth, checkApprovalAccess, rejectRegularization);

// Cancel regularization (only pending requests by employee)
router.patch('/:id/cancel', auth, cancelRegularization);

// Get regularization file/document
router.get('/:id/documents/:fileIndex', auth, async (req, res) => {
  try {
    const { id, fileIndex } = req.params;
    const Regularization = require('../models/Regularization');

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    // Check access permissions
    const canAccess = 
      regularization.employee.toString() === req.user.id ||
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'].includes(req.user.role) ||
      regularization.approvalChain.some(approval => approval.approver.toString() === req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const fileIdx = parseInt(fileIndex);
    if (fileIdx < 0 || fileIdx >= regularization.supportingDocuments.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = regularization.supportingDocuments[fileIdx];
    const path = require('path');
    const fs = require('fs');

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Get regularization document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error.message
    });
  }
});

// Management routes - for managers and HR
router.get('/management/dashboard', auth, checkManagementAccess, async (req, res) => {
  try {
    const Regularization = require('../models/Regularization');
    const mongoose = require('mongoose');

    // Get dashboard statistics
    const stats = await Regularization.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent requests
    const recentRequests = await Regularization.find({})
      .populate('employee', 'firstName lastName employeeId')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role')
      .sort({ submittedDate: -1 })
      .limit(10);

    // Get pending approvals for current user
    const pendingApprovals = await Regularization.getPendingApprovals(req.user.id);

    res.json({
      success: true,
      data: {
        statistics: stats,
        recentRequests,
        pendingApprovals,
        totalPending: pendingApprovals.length
      }
    });
  } catch (error) {
    console.error('Get regularization dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Bulk approve/reject regularizations
router.patch('/bulk/action', auth, checkApprovalAccess, async (req, res) => {
  try {
    const { regularizationIds, action, comments = '' } = req.body;

    if (!regularizationIds || !Array.isArray(regularizationIds) || regularizationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Regularization IDs are required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

    const Regularization = require('../models/Regularization');
    const results = {
      processed: [],
      errors: []
    };

    for (const id of regularizationIds) {
      try {
        const regularization = await Regularization.findById(id);
        if (!regularization) {
          results.errors.push({
            id,
            error: 'Regularization not found'
          });
          continue;
        }

        if (action === 'approve') {
          await regularization.approve(req.user.id, comments);
        } else {
          await regularization.reject(req.user.id, comments);
        }

        results.processed.push({
          id,
          regularizationId: regularization.regularizationId,
          status: regularization.status
        });
      } catch (error) {
        results.errors.push({
          id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk regularization action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk action',
      error: error.message
    });
  }
});

module.exports = router;
