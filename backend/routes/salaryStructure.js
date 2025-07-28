const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getSalaryStructures,
  getSalaryStructureById,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  cloneSalaryStructure,
  calculateSalaryPreview,
  getApplicableStructure,
  assignStructureToEmployees,
  getSalaryTemplates,
  setDefaultStructure,
  previewSalaryCalculation,
  createNewVersion,
  getVersionHistory,
  approveStructure,
  rejectStructure
} = require('../controllers/salaryStructureController');

// Middleware to check if user has salary structure access
const checkSalaryStructureAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for salary structure operations.'
    });
  }
  next();
};

// Middleware to check if user has salary structure management access
const checkSalaryStructureManageAccess = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions for salary structure management.'
    });
  }
  next();
};

// Get all salary structures with filters and pagination
router.get('/', auth, checkSalaryStructureAccess, getSalaryStructures);

// Get salary structure templates (simplified list)
router.get('/templates', auth, checkSalaryStructureAccess, getSalaryTemplates);

// Get applicable salary structure for an employee
router.get('/employee/:employeeId/applicable', auth, checkSalaryStructureAccess, getApplicableStructure);

// Get single salary structure by ID
router.get('/:id', auth, checkSalaryStructureAccess, getSalaryStructureById);

// Calculate salary preview for a structure
router.post('/:id/calculate', auth, checkSalaryStructureAccess, calculateSalaryPreview);

// Clone salary structure
router.post('/:id/clone', auth, checkSalaryStructureManageAccess, cloneSalaryStructure);

// Assign salary structure to employees
router.post('/:id/assign', auth, checkSalaryStructureManageAccess, assignStructureToEmployees);

// Create new salary structure
router.post('/', auth, checkSalaryStructureManageAccess, createSalaryStructure);

// Set default salary structure
router.patch('/:id/set-default', auth, checkSalaryStructureManageAccess, setDefaultStructure);

// Update salary structure
router.put('/:id', auth, checkSalaryStructureManageAccess, updateSalaryStructure);

// Delete salary structure (soft delete)
router.delete('/:id', auth, checkSalaryStructureManageAccess, deleteSalaryStructure);

// Enhanced Features Routes

// Preview salary calculation (without saving)
router.post('/preview', auth, checkSalaryStructureAccess, previewSalaryCalculation);

// Get version history for a salary structure
router.get('/:id/versions', auth, checkSalaryStructureAccess, getVersionHistory);

// Create new version of salary structure
router.post('/:id/versions', auth, checkSalaryStructureManageAccess, createNewVersion);

// Approve salary structure
router.patch('/:id/approve', auth, checkSalaryStructureManageAccess, approveStructure);

// Reject salary structure
router.patch('/:id/reject', auth, checkSalaryStructureManageAccess, rejectStructure);

module.exports = router;
