
const mongoose = require('mongoose');
const SystemSettings = require('./SystemSettings');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  breakTime: {
    start: Date,
    end: Date,
    duration: {
      type: Number, // in minutes
      default: 0
    }
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday'],
    default: 'Absent'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  isEarly: {
    type: Boolean,
    default: false
  },
  earlyMinutes: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  shortageHours: {
    type: Number,
    default: 0
  },
  adjustedOvertimeHours: {
    type: Number,
    default: 0
  },
  lastActivityTime: {
    type: Date
  },
  autoCheckedOut: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    enum: ['Office', 'Remote', 'Client Site'],
    default: 'Office'
  },
  ipAddress: {
    type: String
  },
  device: {
    type: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  },
  isRegularized: {
    type: Boolean,
    default: false
  },
  regularizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  regularizedDate: {
    type: Date
  },
  regularizationReason: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for employee and date uniqueness
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isLate: 1 });

// Pre-save middleware to calculate total hours and status
attendanceSchema.pre('save', async function(next) {
  // Skip automatic status calculation for regularized records
  // Regularized records should maintain their explicitly set status
  const isRegularizedUpdate = this.isRegularized && this.isModified('status');
  
  // Get work hours from system settings
  const workHours = await SystemSettings.getWorkHours();
  const [checkInHour, checkInMinute] = workHours.checkInTime.split(':').map(Number);
  const [checkOutHour, checkOutMinute] = workHours.checkOutTime.split(':').map(Number);
  const dailyWorkingHours = workHours.workingHours;
  const minimumWorkingHours = workHours.minimumWorkHours;
  const lateThresholdMinutes = workHours.lateThreshold;
  
  // Check for late arrival if check-in is present
  if (this.checkIn) {
    // Create standard check-in time for the same date as the actual check-in
    const checkInDate = new Date(this.checkIn);
    const standardCheckIn = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
    standardCheckIn.setHours(checkInHour, checkInMinute, 0, 0);
    
    // Calculate time difference in minutes using HR-configured threshold
    const timeDiffMs = this.checkIn.getTime() - standardCheckIn.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    if (timeDiffMinutes > lateThresholdMinutes) {
      // Check-in is more than HR-configured threshold after standard time - LATE
      this.isLate = true;
      this.lateMinutes = Math.floor(timeDiffMinutes);
    } else {
      // Check-in is within threshold of standard time OR early - NOT LATE
      this.isLate = false;
      this.lateMinutes = 0;
    }
  }
  
  // Calculate total hours and other metrics if both check-in and check-out are present
  if (this.checkIn && this.checkOut) {
    // Calculate total hours
    const timeDiff = this.checkOut.getTime() - this.checkIn.getTime();
    let totalMinutes = Math.floor(timeDiff / (1000 * 60));
    
    // Subtract break time
    if (this.breakTime && this.breakTime.duration) {
      totalMinutes -= this.breakTime.duration;
    }
    
    this.totalHours = Math.max(0, totalMinutes / 60);
    
    // Only auto-calculate status if this is NOT a regularized record being updated
    if (!this.isRegularized || !isRegularizedUpdate) {
      // Determine status based on minimum working hours (more flexible)
      if (this.totalHours >= minimumWorkingHours) {
        // If employee worked minimum required hours, they are Present
        // Even if they arrived late, they are still Present (not "Late" status)
        this.status = 'Present';
      } else if (this.totalHours >= minimumWorkingHours / 2) {
        this.status = 'Half Day';
      } else {
        this.status = 'Absent';
      }
    }
    // If this is a regularized record, preserve the explicitly set status
    
    // Note: isLate flag remains true if they arrived late, regardless of status
    // This allows tracking both Present days and Late days in monthly summary
    // Status = 'Present' + isLate = true means "Present but Late"
    
    // Check for early departure using configurable check-out time
    const checkOutDate = new Date(this.checkOut);
    const standardCheckOutForEarly = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
    standardCheckOutForEarly.setHours(checkOutHour, checkOutMinute, 0, 0);
    
    if (this.checkOut < standardCheckOutForEarly) {
      this.isEarly = true;
      this.earlyMinutes = Math.floor((standardCheckOutForEarly.getTime() - this.checkOut.getTime()) / (1000 * 60));
    } else {
      this.isEarly = false;
      this.earlyMinutes = 0;
    }
    
    // Calculate shortage hours first (based on late arrival)
    this.shortageHours = 0;
    if (this.isLate && this.lateMinutes > 0) {
      this.shortageHours = this.lateMinutes / 60; // Convert minutes to hours
    }
    
    // Smart overtime calculation: Extra hours first reduce shortage, then count as overtime
    const standardWorkingHours = dailyWorkingHours || 8;
    
    if (this.totalHours > standardWorkingHours) {
      const extraHours = this.totalHours - standardWorkingHours;
      
      if (this.shortageHours > 0) {
        // First, use extra hours to reduce shortage hours
        const shortageReduction = Math.min(extraHours, this.shortageHours);
        this.shortageHours = Math.max(0, this.shortageHours - shortageReduction);
        
        // Remaining extra hours after reducing shortage become overtime
        this.adjustedOvertimeHours = Math.max(0, extraHours - shortageReduction);
        
        // Keep original overtime for backward compatibility
        this.overtime = this.adjustedOvertimeHours;
      } else {
        // No shortage hours, all extra hours are overtime
        this.overtime = extraHours;
        this.adjustedOvertimeHours = extraHours;
      }
    } else {
      // No extra hours worked
      this.overtime = 0;
      this.adjustedOvertimeHours = 0;
    }
  } else if (this.checkIn && !this.checkOut) {
    // If only check-in is present, set initial status as Present (unless regularized)
    if (!this.isRegularized || !isRegularizedUpdate) {
      // Even if they're late, they are still Present (not "Late" status)
      this.status = 'Present'; // Will be recalculated on check-out based on total hours
    }
    
    // No overtime calculation for incomplete records (only check-in)
    // Overtime will be calculated when check-out is completed
    this.overtime = 0;
  }
  
  next();
});

// Method to mark check-in
attendanceSchema.methods.checkInEmployee = function(location = 'Office', ipAddress, device) {
  this.checkIn = new Date();
  this.location = location;
  this.ipAddress = ipAddress;
  this.device = device;
  return this.save();
};

// Method to mark check-out
attendanceSchema.methods.checkOutEmployee = function() {
  this.checkOut = new Date();
  return this.save();
};

// Method to regularize attendance
attendanceSchema.methods.regularize = function(regularizedBy, reason, checkIn, checkOut) {
  this.isRegularized = true;
  this.regularizedBy = regularizedBy;
  this.regularizedDate = new Date();
  this.regularizationReason = reason;
  this.updatedBy = regularizedBy;
  
  if (checkIn) this.checkIn = checkIn;
  if (checkOut) this.checkOut = checkOut;
  
  return this.save();
};

// Method to update activity time
attendanceSchema.methods.updateActivity = function() {
  this.lastActivityTime = new Date();
  return this.save();
};

// Method to auto checkout
attendanceSchema.methods.autoCheckOut = function() {
  if (!this.checkOut) {
    this.checkOut = new Date();
    this.autoCheckedOut = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to check for inactive employees and auto checkout
attendanceSchema.statics.autoCheckoutInactiveEmployees = async function() {
  const SystemSettings = require('./SystemSettings');
  const inactivityTimeout = parseInt(await SystemSettings.getSetting('autoCheckoutTimeout', '10')); // Default 10 minutes
  
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - inactivityTimeout);
  
  // Get work hours to determine if it's past checkout time
  const workHours = await SystemSettings.getWorkHours();
  const [checkOutHour, checkOutMinute] = workHours.checkOutTime.split(':').map(Number);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Create standard checkout time for today
  const standardCheckOut = new Date();
  standardCheckOut.setHours(checkOutHour, checkOutMinute, 0, 0);
  
  // Only auto-checkout if current time is past standard checkout time
  const now = new Date();
  if (now <= standardCheckOut) {
    return []; // Don't auto-checkout before standard checkout time
  }
  
  // Find employees who are checked in but not checked out, and have been inactive
  const inactiveEmployees = await this.find({
    date: { $gte: today, $lt: tomorrow },
    checkIn: { $exists: true, $ne: null },
    checkOut: { $exists: false },
    autoCheckedOut: { $ne: true },
    $or: [
      { lastActivityTime: { $lt: cutoffTime } },
      { lastActivityTime: { $exists: false } }
    ]
  }).populate('employee', 'firstName lastName email');
  
  const autoCheckedOutEmployees = [];
  
  for (const attendance of inactiveEmployees) {
    await attendance.autoCheckOut();

    // Send auto-checkout notification
    const notificationService = require('../services/notificationService');
    await notificationService.sendAutoCheckoutNotification(
      attendance.employee._id,
      attendance.checkOut
    );

    autoCheckedOutEmployees.push({
      employee: attendance.employee,
      checkOutTime: attendance.checkOut,
      wasAutoCheckedOut: true
    });
  }
  
  return autoCheckedOutEmployees;
};

// Static method to get monthly attendance summary
attendanceSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const attendance = await this.find({
    employee: userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  // Get work hours from system settings for shortage calculation
  const workHours = await SystemSettings.getWorkHours();
  const minimumWorkingHours = workHours.minimumWorkHours || 6; // Use minimum hours for shortage calculation
  
  // Calculate total hours and shortage hours based on check-in time differences
  let totalHours = 0;
  let totalShortageHours = 0;
  const now = new Date();
  const [checkInHour, checkInMinute] = workHours.checkInTime.split(':').map(Number);
  
  attendance.forEach(record => {
    if (record.checkIn && record.checkOut) {
      // For completed records, use the calculated totalHours
      totalHours += record.totalHours || 0;
    } else if (record.checkIn && !record.checkOut) {
      // Calculate current work hours for incomplete records using same logic as frontend
      const timeDiff = now.getTime() - record.checkIn.getTime();
      const totalMinutes = Math.floor(timeDiff / (1000 * 60));
      
      if (totalMinutes > 0) {
        const currentHours = totalMinutes / 60;
        totalHours += currentHours;
      }
    }
    
    // Calculate shortage hours based on check-in time difference (full late time, not excluding grace period)
    if (record.checkIn) {
      const checkInDate = new Date(record.checkIn);
      const standardCheckIn = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
      standardCheckIn.setHours(checkInHour, checkInMinute, 0, 0);
      
      // If employee checked in late, calculate the full shortage time
      if (record.checkIn > standardCheckIn) {
        const lateMinutes = Math.floor((record.checkIn.getTime() - standardCheckIn.getTime()) / (1000 * 60));
        
        // Count full shortage time (grace period is only for late marking, not shortage calculation)
        const shortageHours = lateMinutes / 60;
        totalShortageHours += shortageHours;
      }
    }
  });
  
  // Calculate expected working hours for the month
  // Count actual working days (days with attendance records)
  const workingDays = attendance.length;
  
  // Expected hours = working days * standard working hours
  const standardWorkingHours = workHours.workingHours || 8;
  const expectedHours = workingDays * standardWorkingHours;
  
  // Final shortage hours is the sum of late check-in time losses
  const shortageHours = Math.max(0, totalShortageHours);
  
  const summary = {
    totalDays: attendance.length,
    presentDays: attendance.filter(a => a.status === 'Present').length,
    absentDays: attendance.filter(a => a.status === 'Absent').length,
    lateDays: attendance.filter(a => a.isLate).length,
    halfDays: attendance.filter(a => a.status === 'Half Day').length,
    totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
    overtimeHours: Math.round(attendance.reduce((sum, a) => sum + (a.overtime || 0), 0) * 100) / 100,
    expectedHours: Math.round(expectedHours * 100) / 100,
    shortageHours: Math.round(shortageHours * 100) / 100
  };
  
  return summary;
};

// Transform output
attendanceSchema.methods.toJSON = function() {
  const attendanceObject = this.toObject();
  return attendanceObject;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
