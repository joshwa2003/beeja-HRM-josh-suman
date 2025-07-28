const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const regularizationSchema = new mongoose.Schema({
  regularizationId: {
    type: String,
    unique: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  attendanceDate: {
    type: Date,
    required: [true, 'Attendance date is required']
  },
  requestType: {
    type: String,
    enum: [
      'Missed Check-In',
      'Missed Check-Out', 
      'Missed Both',
      'Late Arrival',
      'Early Departure',
      'Absent to Present',
      'Absent to Half Day',
      'System Error',
      'Work From Home',
      'Field Work',
      'Medical Emergency',
      'Transport Issue',
      'Other'
    ],
    required: [true, 'Request type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  requestedCheckIn: {
    type: Date
  },
  requestedCheckOut: {
    type: Date
  },
  requestedStatus: {
    type: String,
    enum: ['Present', 'Half Day', 'Work From Home'],
    default: 'Present'
  },
  originalAttendance: {
    checkIn: Date,
    checkOut: Date,
    status: String,
    workingHours: Number,
    overtime: Number,
    isLate: Boolean,
    lateBy: Number
  },
  supportingDocuments: [{
    fileName: String,
    originalName: String,
    fileUrl: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  currentLevel: {
    type: String,
    enum: ['Team Leader', 'Team Manager', 'HR', 'VP/Admin', 'Completed'],
    default: 'Team Manager'
  },
  // Multi-level approval workflow
  teamLeaderApproval: {
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    comments: String,
    actionDate: Date
  },
  teamManagerApproval: {
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    comments: String,
    actionDate: Date
  },
  hrApproval: {
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    comments: String,
    actionDate: Date
  },
  finalApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  rejectedDate: Date,
  rejectionReason: String,
  attendanceUpdated: {
    type: Boolean,
    default: false
  },
  updatedAttendance: {
    checkIn: Date,
    checkOut: Date,
    status: String,
    workingHours: Number,
    overtime: Number,
    isLate: Boolean,
    lateBy: Number,
    isRegularized: {
      type: Boolean,
      default: true
    }
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditTrail: [{
    action: {
      type: String,
      enum: ['Created', 'Submitted', 'Approved', 'Rejected', 'Updated', 'Cancelled']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    comments: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
regularizationSchema.index({ employee: 1, attendanceDate: -1 });
regularizationSchema.index({ status: 1 });
regularizationSchema.index({ currentLevel: 1, status: 1 });
regularizationSchema.index({ submittedDate: -1 });

// Pre-save middleware to generate regularization ID
regularizationSchema.pre('save', async function(next) {
  if (this.isNew && !this.regularizationId) {
    try {
      const count = await this.constructor.countDocuments();
      this.regularizationId = `REG${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to submit regularization request
regularizationSchema.methods.submit = async function() {
  this.status = 'Pending';
  this.submittedDate = new Date();
  
  // Determine current level based on employee role
  const User = require('./User');
  const employee = await User.findById(this.employee);
  
  if (['Employee', 'Team Leader', 'Team Lead'].includes(employee.role)) {
    this.currentLevel = 'Team Manager';
  } else if (['Team Manager', 'Manager'].includes(employee.role)) {
    this.currentLevel = 'HR';
  } else if (['HR Manager', 'HR BP', 'HR Executive'].includes(employee.role)) {
    this.currentLevel = 'VP/Admin';
  }
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Submitted',
    performedBy: this.employee,
    details: `Regularization request submitted for ${this.currentLevel} approval`
  });
  
  return this.save();
};

// Method for Team Leader approval
regularizationSchema.methods.approveByTeamLeader = async function(approverId, comments = '') {
  // Check if user is Team Leader
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Team Leader', 'Team Lead'].includes(approver.role)) {
    throw new Error('Only Team Leaders can approve at this level');
  }
  
  // Update Team Leader approval
  this.teamLeaderApproval.approver = approverId;
  this.teamLeaderApproval.status = 'Approved';
  this.teamLeaderApproval.comments = comments;
  this.teamLeaderApproval.actionDate = new Date();
  
  // Move to next level
  this.currentLevel = 'Team Manager';
  this.status = 'Under Review';
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Approved',
    performedBy: approverId,
    details: 'Approved by Team Leader - forwarded to Team Manager',
    comments
  });
  
  return this.save();
};

// Method for Team Leader rejection
regularizationSchema.methods.rejectByTeamLeader = async function(approverId, reason) {
  // Check if user is Team Leader
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Team Leader', 'Team Lead'].includes(approver.role)) {
    throw new Error('Only Team Leaders can reject at this level');
  }
  
  // Update Team Leader approval
  this.teamLeaderApproval.approver = approverId;
  this.teamLeaderApproval.status = 'Rejected';
  this.teamLeaderApproval.comments = reason;
  this.teamLeaderApproval.actionDate = new Date();
  
  // Update regularization status
  this.status = 'Rejected';
  this.currentLevel = 'Completed';
  this.rejectedDate = new Date();
  this.rejectionReason = reason;
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Rejected',
    performedBy: approverId,
    details: 'Rejected by Team Leader',
    comments: reason
  });
  
  return this.save();
};

// Method for Team Manager approval
regularizationSchema.methods.approveByTeamManager = async function(approverId, comments = '') {
  // Check if user is Team Manager
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Team Manager', 'Manager'].includes(approver.role)) {
    throw new Error('Only Team Managers can approve at this level');
  }
  
  // Update Team Manager approval
  this.teamManagerApproval.approver = approverId;
  this.teamManagerApproval.status = 'Approved';
  this.teamManagerApproval.comments = comments;
  this.teamManagerApproval.actionDate = new Date();
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // Determine next step based on who made the request
  if (['Employee', 'Team Leader', 'Team Lead'].includes(employee.role)) {
    // For Employee and Team Leader requests: Team Manager approval is FINAL
    this.status = 'Approved';
    this.currentLevel = 'Completed';
    this.approvedDate = new Date();
    this.finalApprover = approverId;
    
    // Update attendance record
    await this.updateAttendanceRecord();
    
    // Add audit trail
    this.auditTrail.push({
      action: 'Approved',
      performedBy: approverId,
      details: 'Final approval by Team Manager - Attendance updated',
      comments
    });
  } else if (['Team Manager', 'Manager'].includes(employee.role)) {
    // For Team Manager requests: This shouldn't happen as TM requests go directly to HR
    throw new Error('Team Manager requests should be approved by HR, not by Team Manager');
  }
  
  return this.save();
};

// Method for Team Manager rejection
regularizationSchema.methods.rejectByTeamManager = async function(approverId, reason) {
  // Check if user is Team Manager
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Team Manager', 'Manager'].includes(approver.role)) {
    throw new Error('Only Team Managers can reject at this level');
  }
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // Only allow Team Manager to reject Employee and Team Leader requests
  if (!['Employee', 'Team Leader', 'Team Lead'].includes(employee.role)) {
    throw new Error('Team Manager can only reject Employee and Team Leader requests');
  }
  
  // Update Team Manager approval
  this.teamManagerApproval.approver = approverId;
  this.teamManagerApproval.status = 'Rejected';
  this.teamManagerApproval.comments = reason;
  this.teamManagerApproval.actionDate = new Date();
  
  // Update regularization status - FINAL rejection
  this.status = 'Rejected';
  this.currentLevel = 'Completed';
  this.rejectedDate = new Date();
  this.rejectionReason = reason;
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Rejected',
    performedBy: approverId,
    details: 'Final rejection by Team Manager',
    comments: reason
  });
  
  return this.save();
};

// Method to approve regularization (HR only - for Team Manager requests)
regularizationSchema.methods.approve = async function(approverId, comments = '') {
  // Check if user is HR
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['HR Manager', 'HR BP', 'HR Executive'].includes(approver.role)) {
    throw new Error('Only HR personnel can approve regularization requests');
  }
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // HR can only approve Team Manager requests
  if (!['Team Manager', 'Manager'].includes(employee.role)) {
    throw new Error('HR can only approve Team Manager requests. Employee and Team Leader requests are handled by Team Manager.');
  }
  
  // Update HR approval
  this.hrApproval.approver = approverId;
  this.hrApproval.status = 'Approved';
  this.hrApproval.comments = comments;
  this.hrApproval.actionDate = new Date();
  
  // Update regularization status
  this.status = 'Approved';
  this.currentLevel = 'Completed';
  this.approvedDate = new Date();
  this.finalApprover = approverId;
  
  // Update attendance record
  await this.updateAttendanceRecord();
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Approved',
    performedBy: approverId,
    details: 'Approved by HR',
    comments
  });
  
  return this.save();
};

// Method to reject regularization (HR only - for Team Manager requests)
regularizationSchema.methods.reject = async function(approverId, reason) {
  // Check if user is HR
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['HR Manager', 'HR BP', 'HR Executive'].includes(approver.role)) {
    throw new Error('Only HR personnel can reject regularization requests');
  }
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // HR can only reject Team Manager requests
  if (!['Team Manager', 'Manager'].includes(employee.role)) {
    throw new Error('HR can only reject Team Manager requests. Employee and Team Leader requests are handled by Team Manager.');
  }
  
  // Update HR approval
  this.hrApproval.approver = approverId;
  this.hrApproval.status = 'Rejected';
  this.hrApproval.comments = reason;
  this.hrApproval.actionDate = new Date();
  
  // Update regularization status
  this.status = 'Rejected';
  this.currentLevel = 'Completed';
  this.rejectedDate = new Date();
  this.rejectionReason = reason;
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Rejected',
    performedBy: approverId,
    details: 'Rejected by HR',
    comments: reason
  });
  
  return this.save();
};

// Method for VP/Admin approval (for HR requests)
regularizationSchema.methods.approveByVPAdmin = async function(approverId, comments = '') {
  // Check if user is VP or Admin
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(approver.role)) {
    throw new Error('Only VP or Admin can approve at this level');
  }
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // VP/Admin can approve both HR requests and Team Manager requests at HR level
  if (this.currentLevel === 'VP/Admin') {
    // This is an HR employee request
    if (!['HR Manager', 'HR BP', 'HR Executive'].includes(employee.role)) {
      throw new Error('VP/Admin can only approve HR employee requests at VP/Admin level.');
    }
  } else if (this.currentLevel === 'HR') {
    // This is a Team Manager request at HR level - VP can approve it
    if (!['Team Manager', 'Manager'].includes(employee.role)) {
      throw new Error('VP can only approve Team Manager requests at HR level.');
    }
  } else {
    throw new Error('VP/Admin can only approve requests at VP/Admin or HR level.');
  }
  
  // Update HR approval (using HR approval field for VP/Admin approval)
  this.hrApproval.approver = approverId;
  this.hrApproval.status = 'Approved';
  this.hrApproval.comments = comments;
  this.hrApproval.actionDate = new Date();
  
  // Update regularization status
  this.status = 'Approved';
  this.currentLevel = 'Completed';
  this.approvedDate = new Date();
  this.finalApprover = approverId;
  
  // Update attendance record
  await this.updateAttendanceRecord();
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Approved',
    performedBy: approverId,
    details: `Approved by VP/Admin at ${this.currentLevel} level`,
    comments
  });
  
  return this.save();
};

// Method for VP/Admin rejection (for HR requests)
regularizationSchema.methods.rejectByVPAdmin = async function(approverId, reason) {
  // Check if user is VP or Admin
  const User = require('./User');
  const approver = await User.findById(approverId);
  
  if (!approver || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(approver.role)) {
    throw new Error('Only VP or Admin can reject at this level');
  }
  
  // Get the employee who made the request
  const employee = await User.findById(this.employee);
  
  // VP/Admin can reject both HR requests and Team Manager requests at HR level
  if (this.currentLevel === 'VP/Admin') {
    // This is an HR employee request
    if (!['HR Manager', 'HR BP', 'HR Executive'].includes(employee.role)) {
      throw new Error('VP/Admin can only reject HR employee requests at VP/Admin level.');
    }
  } else if (this.currentLevel === 'HR') {
    // This is a Team Manager request at HR level - VP can reject it
    if (!['Team Manager', 'Manager'].includes(employee.role)) {
      throw new Error('VP can only reject Team Manager requests at HR level.');
    }
  } else {
    throw new Error('VP/Admin can only reject requests at VP/Admin or HR level.');
  }
  
  // Update HR approval (using HR approval field for VP/Admin rejection)
  this.hrApproval.approver = approverId;
  this.hrApproval.status = 'Rejected';
  this.hrApproval.comments = reason;
  this.hrApproval.actionDate = new Date();
  
  // Update regularization status
  this.status = 'Rejected';
  this.currentLevel = 'Completed';
  this.rejectedDate = new Date();
  this.rejectionReason = reason;
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Rejected',
    performedBy: approverId,
    details: `Rejected by VP/Admin at ${this.currentLevel} level`,
    comments: reason
  });
  
  return this.save();
};

// Method to update attendance record after approval
regularizationSchema.methods.updateAttendanceRecord = async function() {
  const Attendance = require('./Attendance');
  const SystemSettings = require('./SystemSettings');
  
  try {
    // Get work hours from system settings
    const workHours = await SystemSettings.getWorkHours();
    const standardCheckIn = workHours.checkInTime || '09:00'; // Default 9:00 AM
    const standardCheckOut = workHours.checkOutTime || '17:00'; // Default 5:00 PM
    
    // Find the attendance record for the date
    let attendance = await Attendance.findOne({
      employee: this.employee,
      date: this.attendanceDate
    });
    
    // Create attendance date for proper time setting
    const attendanceDate = new Date(this.attendanceDate);
    
    if (!attendance) {
      // Create new attendance record if it doesn't exist
      attendance = new Attendance({
        employee: this.employee,
        date: this.attendanceDate,
        isRegularized: true,
        regularizationId: this._id,
        createdBy: this.employee
      });
    }
    
    // Apply attendance updates based on request type
    switch (this.requestType) {
      case 'Missed Check-In':
        // Insert check-in time (default: 9:00 AM or custom if provided)
        const checkInTime = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkIn = checkInTime;
        if (!attendance.checkOut && attendance.status !== 'Absent') {
          // If there's already a checkout, keep it; otherwise set default
          attendance.checkOut = this.createTimeFromString(attendanceDate, standardCheckOut);
        }
        attendance.status = 'Present';
        break;
        
      case 'Missed Check-Out':
        // Insert check-out time (default: 5:00 PM or based on working hours)
        const checkOutTime = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.checkOut = checkOutTime;
        if (!attendance.checkIn) {
          attendance.checkIn = this.createTimeFromString(attendanceDate, standardCheckIn);
        }
        attendance.status = 'Present';
        break;
        
      case 'Missed Both':
        // Insert both check-in and check-out (default 9:00 AM to 5:00 PM)
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = 'Present';
        break;
        
      case 'Late Arrival':
        // Change status from "Late" to "Present" and adjust check-in time
        if (this.requestedCheckIn) {
          attendance.checkIn = this.requestedCheckIn;
        }
        attendance.status = 'Present';
        attendance.isLate = false;
        attendance.lateMinutes = 0;
        break;
        
      case 'Early Departure':
        // Accept early checkout; do not mark as "Short Hours"
        if (this.requestedCheckOut) {
          attendance.checkOut = this.requestedCheckOut;
        }
        attendance.status = 'Present';
        attendance.isEarly = false;
        attendance.earlyMinutes = 0;
        break;
        
      case 'Absent to Present':
        // Insert both check-in and check-out for full day; mark status as Present
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = 'Present';
        break;
        
      case 'Absent to Half Day':
        // Insert 4-hour window (e.g., 9:00 AM–1:00 PM); mark as Half Day
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, '13:00'); // 1:00 PM
        attendance.status = 'Half Day';
        break;
        
      case 'System Error':
        // Allow manual override of time data
        if (this.requestedCheckIn) attendance.checkIn = this.requestedCheckIn;
        if (this.requestedCheckOut) attendance.checkOut = this.requestedCheckOut;
        attendance.status = this.requestedStatus || 'Present';
        break;
        
      case 'Work From Home':
        // Mark attendance with "WFH" status for that day
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = 'Present';
        attendance.location = 'Remote';
        attendance.notes = 'Work From Home - Regularized';
        break;
        
      case 'Field Work':
        // Mark attendance with "Field Work" tag and Present status
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = 'Present';
        attendance.location = 'Client Site';
        attendance.notes = 'Field Work - Regularized';
        break;
        
      case 'Medical Emergency':
        // Mark as Present (based on policy)
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = 'Present';
        attendance.notes = 'Medical Emergency - Regularized';
        break;
        
      case 'Transport Issue':
        // Change status from "Late" or "Absent" to Present
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        if (!attendance.checkOut) {
          attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        }
        attendance.status = 'Present';
        attendance.isLate = false;
        attendance.lateMinutes = 0;
        attendance.notes = 'Transport Issue - Regularized';
        break;
        
      case 'Other':
        // Allow HR to manually input check-in/out and mark as Present
        if (this.requestedCheckIn) attendance.checkIn = this.requestedCheckIn;
        if (this.requestedCheckOut) attendance.checkOut = this.requestedCheckOut;
        attendance.status = this.requestedStatus || 'Present';
        break;
        
      default:
        // Default case - mark as present with provided times or defaults
        attendance.checkIn = this.requestedCheckIn || this.createTimeFromString(attendanceDate, standardCheckIn);
        attendance.checkOut = this.requestedCheckOut || this.createTimeFromString(attendanceDate, standardCheckOut);
        attendance.status = this.requestedStatus || 'Present';
    }
    
    // Mark as regularized
    attendance.isRegularized = true;
    attendance.regularizationId = this._id;
    attendance.updatedBy = this.hrApproval.approver;
    
    // Save the attendance record (this will trigger pre-save middleware for calculations)
    await attendance.save();
    
    // Store updated attendance details
    this.updatedAttendance = {
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workingHours: attendance.totalHours,
      overtime: attendance.overtime,
      isLate: attendance.isLate,
      lateBy: attendance.lateMinutes,
      isRegularized: true
    };
    
    this.attendanceUpdated = true;
    
    return attendance;
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
};

// Helper method to create time from string
regularizationSchema.methods.createTimeFromString = function(date, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

// Static method to get pending approvals based on user role
regularizationSchema.statics.getPendingApprovals = async function(userId) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  if (!user) {
    return [];
  }
  
  let query = {};
  
  // Determine what requests the user can see based on their role
  if (['Team Leader', 'Team Lead'].includes(user.role)) {
    query = {
      status: 'Pending',
      currentLevel: 'Team Leader'
    };
  } else if (['Team Manager', 'Manager'].includes(user.role)) {
    query = {
      status: 'Pending',
      currentLevel: 'Team Manager'
    };
  } else if (['HR Manager', 'HR BP', 'HR Executive'].includes(user.role)) {
    // HR can view all requests but cannot approve/reject
    query = {};
  } else {
    return []; // No access for other roles
  }
  
  return this.find(query)
    .populate('employee', 'firstName lastName employeeId email')
    .populate('teamLeaderApproval.approver', 'firstName lastName role')
    .populate('teamManagerApproval.approver', 'firstName lastName role')
    .populate('hrApproval.approver', 'firstName lastName role')
    .sort({ submittedDate: -1 });
};

// Static method to get all regularizations for a specific level
regularizationSchema.statics.getRegularizationsByLevel = async function(level, userId) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  if (!user) {
    return [];
  }
  
  // Verify user has permission to view this level
  const hasPermission = 
    (level === 'Team Leader' && ['Team Leader', 'Team Lead'].includes(user.role)) ||
    (level === 'Team Manager' && ['Team Manager', 'Manager'].includes(user.role)) ||
    (level === 'HR' && ['HR Manager', 'HR BP', 'HR Executive'].includes(user.role));
  
  if (!hasPermission) {
    return [];
  }
  
  return this.find({
    currentLevel: level
  })
    .populate('employee', 'firstName lastName employeeId email')
    .populate('teamLeaderApproval.approver', 'firstName lastName role')
    .populate('teamManagerApproval.approver', 'firstName lastName role')
    .populate('hrApproval.approver', 'firstName lastName role')
    .sort({ submittedDate: -1 });
};

// Static method to get regularization statistics
regularizationSchema.statics.getStatistics = async function(employeeId, startDate, endDate) {
  const matchQuery = { employee: employeeId };
  
  if (startDate && endDate) {
    matchQuery.attendanceDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRequests: { $sum: 1 }
      }
    }
  ]);
  
  return stats;
};

// Add pagination plugin
regularizationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Regularization', regularizationSchema);
