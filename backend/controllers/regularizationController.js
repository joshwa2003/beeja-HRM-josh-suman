const Regularization = require('../models/Regularization');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');

// Get all regularization requests with filters
const getRegularizations = async (req, res) => {
  try {
    const {
      status,
      requestType,
      employee,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'submittedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (requestType) {
      query.requestType = requestType;
    }
    
    if (employee) {
      query.employee = employee;
    }
    
    if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = new Date(startDate);
      if (endDate) query.attendanceDate.$lte = new Date(endDate);
    }

    // Role-based filtering
    if (req.user.role === 'Employee') {
      query.employee = req.user.id;
    } else if (['Team Manager', 'Manager'].includes(req.user.role)) {
      // Team Manager can see:
      // 1. All requests that need their approval (currentLevel: 'Team Manager' and status: 'Pending')
      // 2. All requests they have processed (approved/rejected) - for history tracking
      // 3. Their own requests
      // 4. All employee requests under their management (for visibility)
      query.$or = [
        { currentLevel: 'Team Manager', status: 'Pending' }, // Pending TM approvals
        { 'teamManagerApproval.approver': req.user.id }, // Requests they processed (approved/rejected)
        { employee: req.user.id }, // Their own requests
        { 
          // All employee requests that went through Team Manager approval workflow
          $and: [
            { currentLevel: { $in: ['Team Manager', 'HR', 'Completed'] } },
            { 
              $or: [
                { 'teamManagerApproval.approver': { $exists: true } }, // Has TM approval record
                { currentLevel: 'Team Manager' } // Currently at TM level
              ]
            }
          ]
        }
      ];
    } else if (['Team Leader', 'Team Lead'].includes(req.user.role)) {
      // Team Leader can see:
      // 1. Their own requests
      // 2. Employee and TL requests that are approved by TM (for visibility)
      // 3. Requests pending at TL level (if any)
      query.$or = [
        { employee: req.user.id }, // Their own requests
        { 
          // All approved requests for visibility (Employee and TL requests approved by TM)
          $and: [
            { status: 'Approved' },
            { currentLevel: 'Completed' },
            { 'teamManagerApproval.status': 'Approved' }
          ]
        },
        { 
          // Any pending requests at Team Leader level
          $and: [
            { currentLevel: 'Team Leader' },
            { status: 'Pending' }
          ]
        }
      ];
    } else if (['HR Manager', 'HR BP', 'HR Executive'].includes(req.user.role)) {
      // HR can see all requests (read-only for most, actionable for HR-level requests)
      // No additional filtering needed - they can see everything
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'employee',
          select: 'firstName lastName email employeeId department',
          populate: {
            path: 'department',
            select: 'name'
          }
        },
        {
          path: 'teamLeaderApproval.approver',
          select: 'firstName lastName role'
        },
        {
          path: 'teamManagerApproval.approver',
          select: 'firstName lastName role'
        },
        {
          path: 'hrApproval.approver',
          select: 'firstName lastName role'
        },
        {
          path: 'finalApprover',
          select: 'firstName lastName'
        }
      ]
    };

    const regularizations = await Regularization.paginate(query, options);

    res.json({
      success: true,
      data: regularizations
    });
  } catch (error) {
    console.error('Get regularizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get single regularization by ID
const getRegularizationById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid regularization ID format'
      });
    }

    const regularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('employee.department', 'name')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role')
      .populate('finalApprover', 'firstName lastName')
      .populate('auditTrail.performedBy', 'firstName lastName');

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    // Check access permissions
    const canAccess = 
      regularization.employee._id.toString() === req.user.id ||
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(req.user.role) ||
      (regularization.teamLeaderApproval.approver && regularization.teamLeaderApproval.approver._id.toString() === req.user.id) ||
      (regularization.teamManagerApproval.approver && regularization.teamManagerApproval.approver._id.toString() === req.user.id) ||
      (regularization.hrApproval.approver && regularization.hrApproval.approver._id.toString() === req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: regularization
    });
  } catch (error) {
    console.error('Get regularization by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularization',
      error: error.message
    });
  }
};

// Create new regularization request
const createRegularization = async (req, res) => {
  try {
    const {
      attendanceDate,
      requestType,
      reason,
      requestedCheckIn,
      requestedCheckOut,
      requestedStatus = 'Present',
      priority = 'Normal'
    } = req.body;

    // Handle uploaded files
    const supportingDocuments = [];
    
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        supportingDocuments.push({
          fileName: file.filename,
          originalName: file.originalname,
          fileUrl: `/uploads/regularization/${file.filename}`,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      });
    }

    // Validate required fields
    if (!attendanceDate || !requestType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Attendance date, request type, and reason are required'
      });
    }

    // Check if regularization already exists for this date
    const existingRegularization = await Regularization.findOne({
      employee: req.user.id,
      attendanceDate: new Date(attendanceDate),
      status: { $in: ['Pending', 'Approved'] }
    });

    if (existingRegularization) {
      return res.status(400).json({
        success: false,
        message: 'A regularization request already exists for this date'
      });
    }

    // Get employee data
    const employee = await User.findById(req.user.id).populate('reportingManager department');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get original attendance record if exists
    const originalAttendance = await Attendance.findOne({
      employee: req.user.id,
      date: new Date(attendanceDate)
    });

    // Determine workflow based on user role
    let currentLevel;
    if (['Employee'].includes(employee.role)) {
      currentLevel = 'Team Manager'; // Employee requests go directly to Team Manager
    } else if (['Team Leader', 'Team Lead'].includes(employee.role)) {
      currentLevel = 'Team Manager'; // Team Leader requests go to Team Manager
    } else if (['Team Manager', 'Manager'].includes(employee.role)) {
      currentLevel = 'HR'; // Team Manager requests go to HR
    } else if (['HR Manager', 'HR BP', 'HR Executive'].includes(employee.role)) {
      currentLevel = 'VP/Admin'; // HR requests go to VP/Admin
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role for regularization request'
      });
    }

    // Create regularization request with proper workflow
    const regularizationData = {
      employee: req.user.id,
      attendanceDate: new Date(attendanceDate),
      requestType,
      reason,
      requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : null,
      requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : null,
      requestedStatus,
      originalAttendance: originalAttendance ? {
        checkIn: originalAttendance.checkIn,
        checkOut: originalAttendance.checkOut,
        status: originalAttendance.status,
        workingHours: originalAttendance.workingHours,
        overtime: originalAttendance.overtime,
        isLate: originalAttendance.isLate,
        lateBy: originalAttendance.lateBy
      } : null,
      supportingDocuments,
      currentLevel,
      priority,
      createdBy: req.user.id
    };

    const regularization = new Regularization(regularizationData);
    
    // Add initial audit trail
    regularization.auditTrail.push({
      action: 'Created',
      performedBy: req.user.id,
      details: 'Regularization request created'
    });

    await regularization.save();

    // Populate the response
    await regularization.populate([
      { path: 'employee', select: 'firstName lastName email employeeId' },
      { path: 'teamLeaderApproval.approver', select: 'firstName lastName email role' },
      { path: 'teamManagerApproval.approver', select: 'firstName lastName email role' },
      { path: 'hrApproval.approver', select: 'firstName lastName email role' }
    ]);

    // Send email notifications to appropriate approver
    try {
      let approverEmails = [];
      
      if (currentLevel === 'Team Manager') {
        // Find Team Managers for notification
        const teamManagers = await User.find({ role: { $in: ['Team Manager', 'Manager'] } });
        approverEmails = teamManagers.map(tm => tm.email).filter(email => email);
      } else if (currentLevel === 'HR') {
        // Find HR personnel for notification
        const hrPersonnel = await User.find({ role: { $in: ['HR Manager', 'HR BP', 'HR Executive'] } });
        approverEmails = hrPersonnel.map(hr => hr.email).filter(email => email);
      } else if (currentLevel === 'VP/Admin') {
        // Find VP/Admin personnel for notification
        const vpAdminPersonnel = await User.find({ role: { $in: ['Vice President', 'VP', 'Senior VP', 'Admin', 'System Administrator'] } });
        approverEmails = vpAdminPersonnel.map(vp => vp.email).filter(email => email);
      }

      if (approverEmails.length > 0) {
        const notificationData = {
          employeeName: `${regularization.employee.firstName} ${regularization.employee.lastName}`,
          regularizationId: regularization.regularizationId,
          requestType: regularization.requestType,
          attendanceDate: regularization.attendanceDate,
          reason: regularization.reason,
          priority: regularization.priority,
          submittedDate: regularization.submittedDate
        };

        await emailService.sendRegularizationNotification(approverEmails, notificationData, 'new');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Regularization request created successfully',
      data: regularization
    });
  } catch (error) {
    console.error('Create regularization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create regularization request',
      error: error.message
    });
  }
};

// Submit regularization for approval
const submitRegularization = async (req, res) => {
  try {
    const { id } = req.params;

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    // Check permissions
    if (regularization.employee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await regularization.submit();

    await regularization.populate([
      { path: 'employee', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Regularization request submitted for approval',
      data: regularization
    });
  } catch (error) {
    console.error('Submit regularization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit regularization request',
      error: error.message
    });
  }
};

// Approve regularization
const approveRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    await regularization.approve(req.user.id, comments);

    await regularization.populate([
      { path: 'employee', select: 'firstName lastName email' }
    ]);

    // Send email notifications
    try {
      if (regularization.status === 'Approved') {
        // Notify employee of final approval
        const regularizationData = {
          employeeName: `${regularization.employee.firstName} ${regularization.employee.lastName}`,
          regularizationId: regularization.regularizationId,
          requestType: regularization.requestType,
          attendanceDate: regularization.attendanceDate,
          approverComments: comments
        };

        await emailService.sendRegularizationNotification([regularization.employee.email], regularizationData, 'approved');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Regularization approved successfully',
      data: regularization
    });
  } catch (error) {
    console.error('Approve regularization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve regularization',
      error: error.message
    });
  }
};

// Reject regularization
const rejectRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    await regularization.reject(req.user.id, reason);

    await regularization.populate([
      { path: 'employee', select: 'firstName lastName email' }
    ]);

    // Send email notification to employee
    try {
      const regularizationData = {
        employeeName: `${regularization.employee.firstName} ${regularization.employee.lastName}`,
        regularizationId: regularization.regularizationId,
        requestType: regularization.requestType,
        attendanceDate: regularization.attendanceDate,
        rejectionReason: reason
      };

      await emailService.sendRegularizationNotification([regularization.employee.email], regularizationData, 'rejected');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Regularization rejected',
      data: regularization
    });
  } catch (error) {
    console.error('Reject regularization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject regularization',
      error: error.message
    });
  }
};

// Get pending approvals for current user (HR only)
const getPendingApprovals = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Only HR can see pending approvals
    if (!['HR Manager', 'HR BP', 'HR Executive'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel can view pending approvals.'
      });
    }

    const pendingApprovals = await Regularization.find({
      status: 'Pending',
      currentLevel: 'HR'
    })
    .populate('employee', 'firstName lastName employeeId email')
    .populate('hrApproval.approver', 'firstName lastName role')
    .sort({ submittedDate: -1 });

    res.json({
      success: true,
      data: pendingApprovals
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};

// Get regularization statistics
const getRegularizationStatistics = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    // Default to current user if no employeeId provided
    const targetEmployeeId = employeeId || req.user.id;

    // Check permissions
    if (targetEmployeeId !== req.user.id && 
        !['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await Regularization.getStatistics(targetEmployeeId, startDate, endDate);

    // Get overall statistics
    const overallStats = await Regularization.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(targetEmployeeId)
        }
      },
      {
        $group: {
          _id: '$requestType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusStats: stats,
        typeStats: overallStats,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Get regularization statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularization statistics',
      error: error.message
    });
  }
};

// Cancel regularization (only pending requests)
const cancelRegularization = async (req, res) => {
  try {
    const { id } = req.params;

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization not found'
      });
    }

    // Check permissions
    if (regularization.employee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow cancellation of pending requests
    if (regularization.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending regularization requests can be cancelled'
      });
    }

    regularization.status = 'Cancelled';
    
    // Add audit trail
    regularization.auditTrail.push({
      action: 'Cancelled',
      performedBy: req.user.id,
      details: 'Regularization request cancelled by employee'
    });

    await regularization.save();

    res.json({
      success: true,
      message: 'Regularization request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel regularization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel regularization request',
      error: error.message
    });
  }
};

// Get regularization configuration
const getRegularizationConfig = async (req, res) => {
  try {
    const config = {
      requestTypes: [
        { value: 'Missed Check-In', label: 'Missed Check-In', description: 'Employee forgot to check in' },
        { value: 'Missed Check-Out', label: 'Missed Check-Out', description: 'Employee forgot to check out' },
        { value: 'Missed Both', label: 'Missed Both', description: 'Employee forgot both check-in and check-out' },
        { value: 'Late Arrival', label: 'Late Arrival', description: 'Employee arrived late due to valid reason' },
        { value: 'Early Departure', label: 'Early Departure', description: 'Employee left early due to valid reason' },
        { value: 'Absent to Present', label: 'Absent to Present', description: 'Convert absent day to present' },
        { value: 'Absent to Half Day', label: 'Absent to Half Day', description: 'Convert absent day to half day' },
        { value: 'System Error', label: 'System Error', description: 'Biometric or system malfunction' },
        { value: 'Work From Home', label: 'Work From Home', description: 'Employee worked from home' },
        { value: 'Field Work', label: 'Field Work', description: 'Employee was on field assignment' },
        { value: 'Medical Emergency', label: 'Medical Emergency', description: 'Medical emergency situation' },
        { value: 'Transport Issue', label: 'Transport Issue', description: 'Transportation problems' },
        { value: 'Other', label: 'Other', description: 'Other valid reasons' }
      ],
      priorities: ['Low', 'Normal', 'High', 'Urgent'],
      statuses: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      requestedStatuses: ['Present', 'Half Day', 'Work From Home'],
      maxDocumentSize: 5 * 1024 * 1024, // 5MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get regularization config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularization configuration',
      error: error.message
    });
  }
};

module.exports = {
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
};
