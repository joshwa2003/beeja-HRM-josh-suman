const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm_system');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const markAbsentEmployees = async (targetDate = null) => {
  try {
    await connectDB();
    
    // Use provided date or yesterday (since we check at end of day)
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    if (!targetDate) {
      checkDate.setDate(checkDate.getDate() - 1); // Yesterday
    }
    
    // Set to start of day
    checkDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log(`Checking attendance for date: ${checkDate.toDateString()}`);
    
    // Get all active employees
    const employees = await User.find({ 
      role: { $in: ['Employee', 'Team Leader', 'Team Manager'] },
      isActive: { $ne: false }
    });
    
    console.log(`Found ${employees.length} employees to check`);
    
    let markedAbsent = 0;
    
    for (const employee of employees) {
      // Check if employee has attendance record for this date
      const existingAttendance = await Attendance.findOne({
        employee: employee._id,
        date: { $gte: checkDate, $lt: nextDay }
      });
      
      if (!existingAttendance) {
        // Create absent record
        const absentRecord = new Attendance({
          employee: employee._id,
          date: checkDate,
          status: 'Absent',
          totalHours: 0,
          isLate: false,
          lateMinutes: 0,
          overtime: 0
        });
        
        await absentRecord.save();
        markedAbsent++;
        
        console.log(`Marked ${employee.firstName} ${employee.lastName} as absent for ${checkDate.toDateString()}`);
      }
    }
    
    console.log(`\nCompleted: Marked ${markedAbsent} employees as absent`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error marking absent employees:', error);
    process.exit(1);
  }
};

// Allow running with specific date: node markAbsentEmployees.js 2025-01-15
const targetDate = process.argv[2];
markAbsentEmployees(targetDate);
