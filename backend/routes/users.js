const express = require('express');
const { body } = require('express-validator');
const { auth, adminOnly, roleAccess } = require('../middleware/auth');
const {
  getAllUsers,
  getTeamLeads,
  getEmployees,
  getUserById,
  createUser,
  updateUser,
  getRoles,
  getUsersByHierarchy
} = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users/roles
// @desc    Get all available roles
// @access  Private
router.get('/roles', auth, getRoles);

// @route   GET /api/users/team-leads
// @desc    Get team leaders and managers for permission assignment
// @access  Private
router.get('/team-leads', auth, getTeamLeads);

// @route   GET /api/users/employees
// @desc    Get all employees for responsible person selection
// @access  Private
router.get('/employees', auth, getEmployees);

// @route   GET /api/users/hierarchy
// @desc    Get users based on role hierarchy for attendance download
// @access  Private
router.get('/hierarchy', auth, roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']), getUsersByHierarchy);

// @route   GET /api/users
// @desc    Get all users (Admin, VP, HR roles, Team Leaders, Team Managers)
// @access  Private (Admin, VP, HR BP, HR Manager, HR Executive, Team Manager, Team Leader)
router.get('/', auth, roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']), getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, getUserById);

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private (Admin only)
router.post('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('role')
    .isIn(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('employeeId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Employee ID cannot be empty if provided'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number')
], (req, res, next) => {
  if (req.user.role === 'Employee') {
    return res.status(403).json({ message: 'Employees are not allowed to create users' });
  }
  next();
}, createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', [
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
  body('role')
    .optional()
    .isIn(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
], updateUser);

module.exports = router;
