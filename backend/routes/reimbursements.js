const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getReimbursements,
  getReimbursementById,
  createReimbursement,
  updateReimbursement,
  submitReimbursement,
  approveReimbursement,
  rejectReimbursement,
  markReimbursementAsPaid,
  getPendingApprovals,
  getReimbursementSummary,
  deleteReimbursement,
  getReimbursementConfig,
  approveReimbursementWithComments,
  rejectReimbursementWithComments,
  getReimbursementFile
} = require('../controllers/reimbursementController');

// Middleware to check if user has reimbursement approval access
const checkApprovalAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for reimbursement approval.'
    });
  }
  next();
};

// Middleware to check if user has reimbursement payment access
const checkPaymentAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for reimbursement payments.'
    });
  }
  next();
};

// Get all reimbursements with filters and pagination
// Access: All authenticated users (filtered by role in controller)
router.get('/', auth, getReimbursements);

// Get reimbursement configuration (categories, limits, etc.)
router.get('/config', auth, getReimbursementConfig);

// Get pending approvals for current user
router.get('/pending-approvals', auth, checkApprovalAccess, getPendingApprovals);

// Get reimbursement summary
router.get('/summary', auth, getReimbursementSummary);

// Get employee's reimbursements
router.get('/employee', auth, async (req, res) => {
  try {
    const Reimbursement = require('../models/Reimbursement');
    const reimbursements = await Reimbursement.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName employeeId')
      .populate('currentApprover', 'firstName lastName role')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: reimbursements
    });
  } catch (error) {
    console.error('Error fetching employee reimbursements:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get single reimbursement by ID (must be after specific routes)
router.get('/:id', auth, getReimbursementById);

// Create new reimbursement
router.post('/', auth, upload.array('receipts', 5), createReimbursement);

// Submit reimbursement for approval
router.patch('/:id/submit', auth, submitReimbursement);

// Approve reimbursement
router.patch('/:id/approve', auth, checkApprovalAccess, approveReimbursement);

// Reject reimbursement
router.patch('/:id/reject', auth, checkApprovalAccess, rejectReimbursement);

// Mark reimbursement as paid
router.patch('/:id/mark-paid', auth, checkPaymentAccess, markReimbursementAsPaid);

// Update reimbursement (only drafts)
router.put('/:id', auth, updateReimbursement);

// Enhanced approval endpoints
router.patch('/:id/approve-with-comments', auth, checkApprovalAccess, approveReimbursementWithComments);
router.patch('/:id/reject-with-comments', auth, checkApprovalAccess, rejectReimbursementWithComments);

// File access endpoint
router.get('/:id/files/:fileIndex', auth, getReimbursementFile);

// Delete reimbursement (only drafts)
router.delete('/:id', auth, deleteReimbursement);

module.exports = router;
