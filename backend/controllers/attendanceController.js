const { validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Check in employee
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { location = 'Office', notes } = req.body;
    const userId = req.user._id;
    
    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const device = req.get('User-Agent');

    // Check if user already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({
        message: 'You have already checked in today',
        attendance: attendance
      });
    }

    // Create or update attendance record
    if (!attendance) {
      attendance = new Attendance({
        employee: userId,
        date: today,
        checkIn: new Date(),
        location,
        ipAddress,
        device,
        notes,
        createdBy: userId
      });
    } else {
      attendance.checkIn = new Date();
      attendance.location = location;
      attendance.ipAddress = ipAddress;
      attendance.device = device;
      attendance.notes = notes;
      attendance.updatedBy = userId;
    }

    await attendance.save();

    // Populate employee details
    await attendance.populate('employee', 'firstName lastName email role department');

    // Prepare response with late arrival information
    const response = {
      message: 'Check-in successful',
      attendance: attendance,
      isLateArrival: attendance.isLate,
      lateMinutes: attendance.lateMinutes
    };

    res.json(response);

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      message: 'Server error during check-in',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Check out employee
// @route   POST /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { notes } = req.body;
    const userId = req.user._id;

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        message: 'No check-in record found for today. Please check in first.'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        message: 'You have already checked out today',
        attendance: attendance
      });
    }

    // Update attendance with check-out time
    attendance.checkOut = new Date();
    if (notes) attendance.notes = notes;
    attendance.updatedBy = userId;

    await attendance.save();

    // Send overtime notification if applicable
    if (attendance.adjustedOvertimeHours > 0) {
      await notificationService.sendOvertimeAlert(
        userId,
        attendance.adjustedOvertimeHours,
        attendance.shortageHours || 0
      );
    }

    // Populate employee details
    await attendance.populate('employee', 'firstName lastName email role department');

    res.json({
      message: 'Check-out successful',
      attendance: attendance,
      smartOvertimeInfo: {
        shortageHours: attendance.shortageHours || 0,
        adjustedOvertimeHours: attendance.adjustedOvertimeHours || 0,
        originalOvertimeHours: attendance.overtime || 0
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      message: 'Server error during check-out',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get current user's attendance records
// @route   GET /api/attendance/my
// @access  Private
const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, month, year } = req.query;

    // Build date filter
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    const attendance = await Attendance.find({
      employee: userId,
      ...dateFilter
    })
    .populate('employee', 'firstName lastName email role department')
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Calculate current work hours for incomplete records and ensure proper totalHours
    const now = new Date();
    const processedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      
      // Initialize totalHours to 0 if not set
      if (typeof recordObj.totalHours !== 'number' || isNaN(recordObj.totalHours)) {
        recordObj.totalHours = 0;
      }
      
      // If record has checkIn but no checkOut, calculate current work hours
      if (recordObj.checkIn && !recordObj.checkOut) {
        const checkInTime = new Date(recordObj.checkIn);
        const timeDiff = now.getTime() - checkInTime.getTime();
        const totalMinutes = Math.floor(timeDiff / (1000 * 60));
        
        if (totalMinutes > 0) {
          // Calculate current hours worked
          let currentHours = totalMinutes / 60;
          
          // Subtract break time if applicable
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            currentHours -= recordObj.breakTime.duration / 60;
          }
          
          recordObj.currentWorkHours = Math.max(0, currentHours);
          recordObj.totalHours = Math.round(recordObj.currentWorkHours * 100) / 100; // Round to 2 decimal places
        }
      } else if (recordObj.checkIn && recordObj.checkOut) {
        // For completed records, ensure totalHours is properly calculated
        if (recordObj.totalHours === 0 || recordObj.totalHours === null) {
          const checkInTime = new Date(recordObj.checkIn);
          const checkOutTime = new Date(recordObj.checkOut);
          const timeDiff = checkOutTime.getTime() - checkInTime.getTime();
          let totalMinutes = Math.floor(timeDiff / (1000 * 60));
          
          // Subtract break time if applicable
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            totalMinutes -= recordObj.breakTime.duration;
          }
          
          recordObj.totalHours = Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
        }
      }
      
      // Ensure totalHours is always a valid number with 2 decimal places
      recordObj.totalHours = Math.round((recordObj.totalHours || 0) * 100) / 100;
      
      // Ensure overtime is also properly formatted
      if (typeof recordObj.overtime !== 'number' || isNaN(recordObj.overtime)) {
        recordObj.overtime = 0;
      }
      recordObj.overtime = Math.round((recordObj.overtime || 0) * 100) / 100;
      
      // Ensure lateMinutes is a number
      if (typeof recordObj.lateMinutes !== 'number' || isNaN(recordObj.lateMinutes)) {
        recordObj.lateMinutes = 0;
      }
      
      return recordObj;
    });

    const total = await Attendance.countDocuments({
      employee: userId,
      ...dateFilter
    });

    res.json({
      attendance: processedAttendance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      message: 'Server error fetching attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get today's attendance for current user
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow }
    }).populate('employee', 'firstName lastName email role department');

    res.json({
      attendance: attendance || null
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      message: 'Server error fetching today\'s attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get attendance summary for current user
// @route   GET /api/attendance/summary
// @access  Private
const getAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const summary = await Attendance.getMonthlySummary(userId, parseInt(year), parseInt(month));

    res.json({
      summary,
      month: parseInt(month),
      year: parseInt(year)
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      message: 'Server error fetching attendance summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all employees currently working (checked in but not checked out today)
// @route   GET /api/attendance/currently-working
// @access  Private (Admin/HR/Manager)
const getCurrentlyWorkingEmployees = async (req, res) => {
  try {
    // Check if user has permission to view this data
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive', 'Vice President', 'VP'].includes(userRole);
    
    if (!canViewAllAttendance) {
      return res.status(403).json({
        message: 'Access denied. Insufficient privileges to view live employee status.'
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all employees who have checked in today but not checked out
    const currentlyWorking = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null },
      checkOut: { $exists: false }
    })
    .populate('employee', 'firstName lastName email role department profilePhoto')
    .sort({ checkIn: 1 }); // Sort by check-in time

    // Calculate current work hours for each employee
    const now = new Date();
    const workingEmployees = currentlyWorking.map(record => {
      const recordObj = record.toObject();
      
      if (recordObj.checkIn) {
        const checkInTime = new Date(recordObj.checkIn);
        const timeDiff = now.getTime() - checkInTime.getTime();
        const totalMinutes = Math.floor(timeDiff / (1000 * 60));
        
        if (totalMinutes > 0) {
          let currentHours = totalMinutes / 60;
          
          // Subtract break time if applicable
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            currentHours -= recordObj.breakTime.duration / 60;
          }
          
          recordObj.currentWorkHours = Math.max(0, Math.round(currentHours * 100) / 100);
          recordObj.currentWorkMinutes = totalMinutes;
        } else {
          recordObj.currentWorkHours = 0;
          recordObj.currentWorkMinutes = 0;
        }
      }
      
      return recordObj;
    });

    // Get summary statistics
    const totalEmployees = await User.countDocuments({ isActive: true });
    const checkedInToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null }
    });
    const checkedOutToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null },
      checkOut: { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      currentlyWorking: workingEmployees,
      summary: {
        totalEmployees,
        checkedInToday,
        checkedOutToday,
        currentlyWorking: workingEmployees.length,
        notCheckedIn: totalEmployees - checkedInToday
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get currently working employees error:', error);
    res.status(500).json({
      message: 'Server error fetching currently working employees',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all attendance records (Admin/HR/Manager access)
// @route   GET /api/attendance
// @access  Private
const getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, department, status, startDate, endDate } = req.query;

    // Build filter
    let filter = {};
    
    if (employee) {
      filter.employee = employee;
    }
    
    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // If user is not admin/HR, filter by department or team
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    
    // Allow Admin, VP (Vice President), and all HR roles to see all attendance records
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive', 'Vice President', 'VP'].includes(userRole);
    
    // For HR users, filter to show only Employee, Team Leader, and Team Manager roles
    if (userRole.startsWith('HR') || ['HR BP', 'HR Manager', 'HR Executive'].includes(userRole)) {
      // Get users with only Employee, Team Leader, and Team Manager roles
      const allowedUsers = await User.find({ 
        role: { $in: ['Employee', 'Team Leader', 'Team Manager'] }
      }).select('_id');
      
      if (employee) {
        // If specific employee is selected, check if they have allowed role
        const selectedEmployee = await User.findById(employee);
        if (!selectedEmployee || !['Employee', 'Team Leader', 'Team Manager'].includes(selectedEmployee.role)) {
          // Return empty result if selected employee doesn't have allowed role
          return res.json({
            attendance: [],
            totalPages: 0,
            currentPage: page,
            total: 0
          });
        }
        filter.employee = employee;
      } else {
        // Filter to only show attendance of users with allowed roles
        // Special case: if user is Team Leader or Team Manager, only show employees (exclude team leaders and managers)
        if (userRole === 'Team Leader' || userRole === 'Team Manager') {
          const employeeOnlyUsers = await User.find({
            role: 'Employee'
          }).select('_id');
          filter.employee = { $in: employeeOnlyUsers.map(u => u._id) };
        } else {
          filter.employee = { $in: allowedUsers.map(u => u._id) };
        }
      }
    } else if (!canViewAllAttendance) {
      const userDepartment = req.user.department;
      if (userDepartment) {
        // Get users in same department
        const departmentUsers = await User.find({ department: userDepartment }).select('_id');
        filter.employee = { $in: departmentUsers.map(u => u._id) };
      }
    }

    const attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName email role department')
      .populate('regularizedBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Calculate current work hours for incomplete records and ensure proper totalHours
    const now = new Date();
    const processedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      
      // Initialize totalHours to 0 if not set
      if (typeof recordObj.totalHours !== 'number' || isNaN(recordObj.totalHours)) {
        recordObj.totalHours = 0;
      }
      
      // If record has checkIn but no checkOut, calculate current work hours
      if (recordObj.checkIn && !recordObj.checkOut) {
        const checkInTime = new Date(recordObj.checkIn);
        const timeDiff = now.getTime() - checkInTime.getTime();
        const totalMinutes = Math.floor(timeDiff / (1000 * 60));
        
        if (totalMinutes > 0) {
          // Calculate current hours worked
          let currentHours = totalMinutes / 60;
          
          // Subtract break time if applicable
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            currentHours -= recordObj.breakTime.duration / 60;
          }
          
          recordObj.currentWorkHours = Math.max(0, currentHours);
          recordObj.totalHours = Math.round(recordObj.currentWorkHours * 100) / 100; // Round to 2 decimal places
        }
      } else if (recordObj.checkIn && recordObj.checkOut) {
        // For completed records, ensure totalHours is properly calculated
        if (recordObj.totalHours === 0 || recordObj.totalHours === null) {
          const checkInTime = new Date(recordObj.checkIn);
          const checkOutTime = new Date(recordObj.checkOut);
          const timeDiff = checkOutTime.getTime() - checkInTime.getTime();
          let totalMinutes = Math.floor(timeDiff / (1000 * 60));
          
          // Subtract break time if applicable
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            totalMinutes -= recordObj.breakTime.duration;
          }
          
          recordObj.totalHours = Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
        }
      }
      
      // Ensure totalHours is always a valid number with 2 decimal places
      recordObj.totalHours = Math.round((recordObj.totalHours || 0) * 100) / 100;
      
      // Ensure overtime is also properly formatted
      if (typeof recordObj.overtime !== 'number' || isNaN(recordObj.overtime)) {
        recordObj.overtime = 0;
      }
      recordObj.overtime = Math.round((recordObj.overtime || 0) * 100) / 100;
      
      // Ensure lateMinutes is a number
      if (typeof recordObj.lateMinutes !== 'number' || isNaN(recordObj.lateMinutes)) {
        recordObj.lateMinutes = 0;
      }
      
      return recordObj;
    });

    const total = await Attendance.countDocuments(filter);

    res.json({
      attendance: processedAttendance,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      message: 'Server error fetching attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get attendance record by ID
// @route   GET /api/attendance/:id
// @access  Private
const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'firstName lastName email role department')
      .populate('regularizedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check if user can access this record
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    const isOwnRecord = attendance.employee._id.toString() === req.user._id.toString();
    
    // Allow Admin, VP, and all HR roles to view all attendance records
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive'].includes(userRole);
    
    if (!isOwnRecord && !canViewAllAttendance) {
      // Check if same department
      if (attendance.employee.department?.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          message: 'Access denied. Cannot view attendance from different department.'
        });
      }
    }

    res.json({ attendance });

  } catch (error) {
    console.error('Get attendance by ID error:', error);
    res.status(500).json({
      message: 'Server error fetching attendance record',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Admin/HR/Manager)
const updateAttendance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const { checkIn, checkOut, status, location, notes } = req.body;

    // Update fields
    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (status) attendance.status = status;
    if (location) attendance.location = location;
    if (notes) attendance.notes = notes;
    
    attendance.updatedBy = req.user._id;

    await attendance.save();

    await attendance.populate('employee', 'firstName lastName email role department');

    res.json({
      message: 'Attendance record updated successfully',
      attendance
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      message: 'Server error updating attendance record',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Regularize attendance record
// @route   POST /api/attendance/:id/regularize
// @access  Private (Admin/HR/Manager)
const regularizeAttendance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const { reason, checkIn, checkOut } = req.body;

    await attendance.regularize(
      req.user._id,
      reason,
      checkIn ? new Date(checkIn) : null,
      checkOut ? new Date(checkOut) : null
    );

    await attendance.populate('employee', 'firstName lastName email role department');
    await attendance.populate('regularizedBy', 'firstName lastName');

    res.json({
      message: 'Attendance regularized successfully',
      attendance
    });

  } catch (error) {
    console.error('Regularize attendance error:', error);
    res.status(500).json({
      message: 'Server error regularizing attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update employee activity (for auto-checkout tracking)
// @route   POST /api/attendance/activity
// @access  Private
const updateActivity = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: userId,
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null },
      checkOut: { $exists: false }
    });

    if (attendance) {
      await attendance.updateActivity();
    }

    res.json({ success: true, message: 'Activity updated' });

  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      message: 'Server error updating activity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Check for auto-checkout candidates
// @route   GET /api/attendance/auto-checkout-check
// @access  Private (Admin/HR/Manager)
const checkAutoCheckout = async (req, res) => {
  try {
    // Check if user has permission
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    
    const canManageAttendance = currentUserLevel <= 2 || 
                               userRole.startsWith('HR') || 
                               ['HR BP', 'HR Manager', 'HR Executive', 'Vice President', 'VP'].includes(userRole);
    
    if (!canManageAttendance) {
      return res.status(403).json({
        message: 'Access denied. Insufficient privileges.'
      });
    }

    const autoCheckedOutEmployees = await Attendance.autoCheckoutInactiveEmployees();

    res.json({
      success: true,
      autoCheckedOutCount: autoCheckedOutEmployees.length,
      employees: autoCheckedOutEmployees
    });

  } catch (error) {
    console.error('Auto-checkout check error:', error);
    res.status(500).json({
      message: 'Server error during auto-checkout check',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get attendance with smart overtime details
// @route   GET /api/attendance/smart-overtime/:id
// @access  Private
const getSmartOvertimeDetails = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'firstName lastName email role department');

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    // Check if user can access this record
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    const isOwnRecord = attendance.employee._id.toString() === req.user._id.toString();
    
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive'].includes(userRole);
    
    if (!isOwnRecord && !canViewAllAttendance) {
      if (attendance.employee.department?.toString() !== req.user.department?.toString()) {
        return res.status(403).json({
          message: 'Access denied. Cannot view attendance from different department.'
        });
      }
    }

    const smartOvertimeInfo = {
      totalHours: attendance.totalHours || 0,
      shortageHours: attendance.shortageHours || 0,
      adjustedOvertimeHours: attendance.adjustedOvertimeHours || 0,
      originalOvertimeHours: attendance.overtime || 0,
      isLate: attendance.isLate || false,
      lateMinutes: attendance.lateMinutes || 0,
      autoCheckedOut: attendance.autoCheckedOut || false
    };

    res.json({ 
      attendance,
      smartOvertimeInfo
    });

  } catch (error) {
    console.error('Get smart overtime details error:', error);
    res.status(500).json({
      message: 'Server error fetching smart overtime details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Download attendance report in Excel or PDF format
// @route   GET /api/attendance/download-report
// @access  Private (Admin/HR/Manager)
const downloadAttendanceReport = async (req, res) => {
  try {
    const { format = 'excel', employee, status, startDate, endDate, searchTerm, selectedEmployees } = req.query;

    // Build filter (same logic as getAllAttendance)
    let filter = {};
    
    if (employee) {
      filter.employee = employee;
    }
    
    // Handle selected employees filter
    if (selectedEmployees) {
      const employeeIds = selectedEmployees.split(',').filter(id => id.trim());
      if (employeeIds.length > 0) {
        filter.employee = { $in: employeeIds };
      }
    }
    
    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Role-based filtering (same as getAllAttendance)
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive', 'Vice President', 'VP'].includes(userRole);
    
    if (userRole.startsWith('HR') || ['HR BP', 'HR Manager', 'HR Executive'].includes(userRole)) {
      const allowedUsers = await User.find({ 
        role: { $in: ['Employee', 'Team Leader', 'Team Manager'] }
      }).select('_id');
      
      if (employee) {
        const selectedEmployee = await User.findById(employee);
        if (!selectedEmployee || !['Employee', 'Team Leader', 'Team Manager'].includes(selectedEmployee.role)) {
          return res.status(400).json({ message: 'Invalid employee selection' });
        }
        filter.employee = employee;
      } else {
        if (userRole === 'Team Leader' || userRole === 'Team Manager') {
          const employeeOnlyUsers = await User.find({
            role: 'Employee'
          }).select('_id');
          filter.employee = { $in: employeeOnlyUsers.map(u => u._id) };
        } else {
          filter.employee = { $in: allowedUsers.map(u => u._id) };
        }
      }
    } else if (!canViewAllAttendance) {
      const userDepartment = req.user.department;
      if (userDepartment) {
        const departmentUsers = await User.find({ department: userDepartment }).select('_id');
        filter.employee = { $in: departmentUsers.map(u => u._id) };
      }
    }

    // Get all attendance data (no pagination for export)
    let attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName email role department employeeId')
      .sort({ date: -1 });

    // Apply search filter if provided
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      attendance = attendance.filter(record => {
        if (!record.employee) return false;
        
        const fullName = `${record.employee.firstName} ${record.employee.lastName}`.toLowerCase();
        const employeeId = record.employee.employeeId?.toLowerCase() || '';
        const email = record.employee.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               employeeId.includes(searchLower) || 
               email.includes(searchLower);
      });
    }

    // Process attendance data (same as getAllAttendance)
    const now = new Date();
    const processedAttendance = attendance.map(record => {
      const recordObj = record.toObject();
      
      if (typeof recordObj.totalHours !== 'number' || isNaN(recordObj.totalHours)) {
        recordObj.totalHours = 0;
      }
      
      if (recordObj.checkIn && !recordObj.checkOut) {
        const checkInTime = new Date(recordObj.checkIn);
        const timeDiff = now.getTime() - checkInTime.getTime();
        const totalMinutes = Math.floor(timeDiff / (1000 * 60));
        
        if (totalMinutes > 0) {
          let currentHours = totalMinutes / 60;
          
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            currentHours -= recordObj.breakTime.duration / 60;
          }
          
          recordObj.currentWorkHours = Math.max(0, currentHours);
          recordObj.totalHours = Math.round(recordObj.currentWorkHours * 100) / 100;
        }
      } else if (recordObj.checkIn && recordObj.checkOut) {
        if (recordObj.totalHours === 0 || recordObj.totalHours === null) {
          const checkInTime = new Date(recordObj.checkIn);
          const checkOutTime = new Date(recordObj.checkOut);
          const timeDiff = checkOutTime.getTime() - checkInTime.getTime();
          let totalMinutes = Math.floor(timeDiff / (1000 * 60));
          
          if (recordObj.breakTime && recordObj.breakTime.duration) {
            totalMinutes -= recordObj.breakTime.duration;
          }
          
          recordObj.totalHours = Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
        }
      }
      
      recordObj.totalHours = Math.round((recordObj.totalHours || 0) * 100) / 100;
      recordObj.overtime = Math.round((recordObj.overtime || 0) * 100) / 100;
      recordObj.lateMinutes = recordObj.lateMinutes || 0;
      
      return recordObj;
    });

    if (format === 'excel') {
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      // Add headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Employee Name', key: 'employeeName', width: 20 },
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Check In', key: 'checkIn', width: 15 },
        { header: 'Check Out', key: 'checkOut', width: 15 },
        { header: 'Total Hours', key: 'totalHours', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Late Minutes', key: 'lateMinutes', width: 12 },
        { header: 'Overtime (hrs)', key: 'overtime', width: 12 },
        { header: 'Location', key: 'location', width: 12 }
      ];

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data
      processedAttendance.forEach(record => {
        worksheet.addRow({
          date: record.date ? new Date(record.date).toLocaleDateString() : '',
          employeeName: record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : '',
          employeeId: record.employee?.employeeId || '',
          email: record.employee?.email || '',
          role: record.employee?.role || '',
          department: record.employee?.department || '',
          checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '',
          checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '',
          totalHours: record.totalHours || 0,
          status: record.status || '',
          lateMinutes: record.lateMinutes || 0,
          overtime: record.overtime || 0,
          location: record.location || ''
        });
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'pdf') {
      // Generate PDF file
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
      
      doc.pipe(res);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
      doc.moveDown();

      // Add filters info
      if (startDate || endDate || employee || status) {
        doc.fontSize(10).font('Helvetica');
        if (startDate && endDate) {
          doc.text(`Date Range: ${startDate} to ${endDate}`);
        }
        if (employee) {
          const emp = processedAttendance[0]?.employee;
          if (emp) {
            doc.text(`Employee: ${emp.firstName} ${emp.lastName}`);
          }
        }
        if (status) {
          doc.text(`Status Filter: ${status}`);
        }
        doc.moveDown();
      }

      // Add summary
      const totalRecords = processedAttendance.length;
      const presentDays = processedAttendance.filter(r => r.status === 'Present').length;
      const absentDays = processedAttendance.filter(r => r.status === 'Absent').length;
      const totalHours = processedAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const totalOvertime = processedAttendance.reduce((sum, r) => sum + (r.overtime || 0), 0);

      doc.fontSize(12).font('Helvetica-Bold').text('Summary:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Records: ${totalRecords}`);
      doc.text(`Present Days: ${presentDays}`);
      doc.text(`Absent Days: ${absentDays}`);
      doc.text(`Total Work Hours: ${totalHours.toFixed(2)}`);
      doc.text(`Total Overtime: ${totalOvertime.toFixed(2)}`);
      doc.moveDown();

      // Add table headers
      const tableTop = doc.y;
      const itemHeight = 20;
      
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Date', 50, tableTop);
      doc.text('Employee', 100, tableTop);
      doc.text('Check In', 200, tableTop);
      doc.text('Check Out', 250, tableTop);
      doc.text('Hours', 300, tableTop);
      doc.text('Status', 340, tableTop);
      doc.text('Late Min', 380, tableTop);
      doc.text('Overtime', 420, tableTop);

      // Add line under headers
      doc.moveTo(50, tableTop + 15)
         .lineTo(500, tableTop + 15)
         .stroke();

      // Add data rows
      let currentY = tableTop + itemHeight;
      doc.font('Helvetica').fontSize(7);

      processedAttendance.slice(0, 50).forEach((record, index) => { // Limit to 50 records for PDF
        if (currentY > 700) { // Start new page if needed
          doc.addPage();
          currentY = 50;
        }

        const date = record.date ? new Date(record.date).toLocaleDateString() : '';
        const employeeName = record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : '';
        const checkIn = record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '';
        const checkOut = record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '';

        doc.text(date, 50, currentY);
        doc.text(employeeName.substring(0, 15), 100, currentY);
        doc.text(checkIn, 200, currentY);
        doc.text(checkOut, 250, currentY);
        doc.text((record.totalHours || 0).toFixed(1), 300, currentY);
        doc.text(record.status || '', 340, currentY);
        doc.text((record.lateMinutes || 0).toString(), 380, currentY);
        doc.text((record.overtime || 0).toFixed(1), 420, currentY);

        currentY += itemHeight;
      });

      if (processedAttendance.length > 50) {
        doc.moveDown().text(`... and ${processedAttendance.length - 50} more records`, { align: 'center' });
      }

      doc.end();
    } else {
      return res.status(400).json({ message: 'Invalid format. Use "excel" or "pdf"' });
    }

  } catch (error) {
    console.error('Download attendance report error:', error);
    res.status(500).json({
      message: 'Server error generating report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get attendance count for specific filters
// @route   GET /api/attendance/count
// @access  Private (Admin/HR/Manager)
const getAttendanceCount = async (req, res) => {
  try {
    const { employee, status, startDate, endDate, searchTerm, selectedEmployees } = req.query;

    // Build filter (same logic as getAllAttendance)
    let filter = {};
    
    if (employee) {
      filter.employee = employee;
    }
    
    // Handle selected employees filter
    if (selectedEmployees) {
      const employeeIds = selectedEmployees.split(',').filter(id => id.trim());
      if (employeeIds.length > 0) {
        filter.employee = { $in: employeeIds };
      }
    }
    
    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Role-based filtering (same as getAllAttendance)
    const currentUserLevel = req.user.getRoleLevel();
    const userRole = req.user.role;
    
    const canViewAllAttendance = currentUserLevel <= 2 || 
                                userRole.startsWith('HR') || 
                                ['HR BP', 'HR Manager', 'HR Executive', 'Vice President', 'VP'].includes(userRole);
    
    if (userRole.startsWith('HR') || ['HR BP', 'HR Manager', 'HR Executive'].includes(userRole)) {
      const allowedUsers = await User.find({ 
        role: { $in: ['Employee', 'Team Leader', 'Team Manager'] }
      }).select('_id');
      
      if (employee) {
        const selectedEmployee = await User.findById(employee);
        if (!selectedEmployee || !['Employee', 'Team Leader', 'Team Manager'].includes(selectedEmployee.role)) {
          return res.json({ count: 0 });
        }
        filter.employee = employee;
      } else {
        if (userRole === 'Team Leader' || userRole === 'Team Manager') {
          const employeeOnlyUsers = await User.find({
            role: 'Employee'
          }).select('_id');
          filter.employee = { $in: employeeOnlyUsers.map(u => u._id) };
        } else {
          filter.employee = { $in: allowedUsers.map(u => u._id) };
        }
      }
    } else if (!canViewAllAttendance) {
      const userDepartment = req.user.department;
      if (userDepartment) {
        const departmentUsers = await User.find({ department: userDepartment }).select('_id');
        filter.employee = { $in: departmentUsers.map(u => u._id) };
      }
    }

    // Get all attendance data for search filtering if needed
    let count;
    if (searchTerm) {
      const attendance = await Attendance.find(filter)
        .populate('employee', 'firstName lastName email employeeId');
      
      const searchLower = searchTerm.toLowerCase();
      const filteredAttendance = attendance.filter(record => {
        if (!record.employee) return false;
        
        const fullName = `${record.employee.firstName} ${record.employee.lastName}`.toLowerCase();
        const employeeId = record.employee.employeeId?.toLowerCase() || '';
        const email = record.employee.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               employeeId.includes(searchLower) || 
               email.includes(searchLower);
      });
      
      count = filteredAttendance.length;
    } else {
      count = await Attendance.countDocuments(filter);
    }

    res.json({ count });

  } catch (error) {
    console.error('Get attendance count error:', error);
    res.status(500).json({
      message: 'Server error fetching attendance count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
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
};
