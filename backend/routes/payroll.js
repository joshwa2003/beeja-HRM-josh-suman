const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getPayrolls,
  getPayrollById,
  createOrUpdatePayroll,
  bulkProcessPayroll,
  processPayroll,
  markPayrollAsPaid,
  putPayrollOnHold,
  getPayrollSummary,
  deletePayroll,
  getPayrollReports
} = require('../controllers/payrollController');

// Middleware to check if user has payroll access
const checkPayrollAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for payroll operations.'
    });
  }
  next();
};

// Middleware to check if user has payroll processing access
const checkPayrollProcessAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for payroll processing.'
    });
  }
  next();
};

// Get employee's payslips
router.get('/employee/payslips', auth, async (req, res) => {
  try {
    const payslips = await Payroll.find({ employee: req.user.userId })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('employee.department', 'name')
      .sort({ 'payPeriod.year': -1, 'payPeriod.month': -1 });
    
    res.json(payslips);
  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download payslip PDF
router.get('/payslips/:id/download', auth, async (req, res) => {
  try {
    const payslip = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department');
    
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    // Check if user can access this payslip
    if (payslip.employee._id.toString() !== req.user.userId && !['Admin', 'HR Manager', 'HR Executive'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // For now, return a simple response - in production, generate actual PDF
    res.json({ message: 'PDF download functionality to be implemented', payslip });
  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all payrolls with filters and pagination
router.get('/', auth, checkPayrollAccess, getPayrolls);

// Get payroll summary for a specific period
router.get('/summary', auth, checkPayrollAccess, getPayrollSummary);

// Get payroll reports
router.get('/reports', auth, checkPayrollAccess, getPayrollReports);

// Get single payroll by ID
router.get('/:id', auth, checkPayrollAccess, getPayrollById);

// Create or update payroll for an employee
router.post('/', auth, checkPayrollAccess, createOrUpdatePayroll);

// Bulk process payroll for multiple employees
router.post('/bulk-process', auth, checkPayrollProcessAccess, bulkProcessPayroll);

// Process payroll (change status from Draft to Processed)
router.patch('/:id/process', auth, checkPayrollProcessAccess, processPayroll);

// Mark payroll as paid
router.patch('/:id/mark-paid', auth, checkPayrollProcessAccess, markPayrollAsPaid);

// Put payroll on hold
router.patch('/:id/hold', auth, checkPayrollProcessAccess, putPayrollOnHold);

// Update existing payroll
router.put('/:id', auth, checkPayrollAccess, createOrUpdatePayroll);

// Delete payroll (only drafts)
router.delete('/:id', auth, checkPayrollProcessAccess, deletePayroll);

module.exports = router;
