# Smart Overtime & Auto-Checkout Implementation Summary

## Overview
This implementation adds two key features to the HRM attendance system:

1. **Smart Overtime Calculation**: Extra hours worked after checkout time first reduce shortage hours from late arrivals before counting as overtime
2. **Auto-Checkout on Inactivity**: Employees are automatically checked out after 5-10 minutes of mouse inactivity past checkout time

## Features Implemented

### 1. Smart Overtime Calculation

#### How it Works:
- When an employee is late (shortage hours) but works extra after checkout time
- Extra hours first reduce the shortage hours before calculating overtime
- Only remaining extra hours after reducing shortage count as overtime

#### Example Scenarios:
- **Scenario 1**: 30 min late + 30 min extra = No shortage, No overtime
- **Scenario 2**: 60 min late + 30 min extra = 30 min shortage remaining, No overtime  
- **Scenario 3**: 30 min late + 60 min extra = No shortage, 30 min overtime
- **Scenario 4**: On time + 60 min extra = No shortage, 60 min overtime

### 2. Auto-Checkout System

#### Features:
- Tracks mouse movement, clicks, keyboard activity, and scrolling
- Starts tracking when employee checks in
- Stops tracking when employee checks out
- Shows warning 2 minutes before auto-checkout
- Auto-checks out after 10 minutes of inactivity (configurable)
- Only activates after standard checkout time
- Updates activity status every 2 minutes to backend

#### User Experience:
- Seamless background tracking
- Warning modal before auto-checkout
- Notification when auto-checkout occurs
- Visual indicators for auto-checked out employees

## Technical Implementation

### Backend Changes

#### 1. Attendance Model (`backend/models/Attendance.js`)
**New Fields:**
- `shortageHours`: Hours of shortage from late arrival
- `adjustedOvertimeHours`: Final overtime after reducing shortage
- `lastActivityTime`: Last recorded user activity
- `autoCheckedOut`: Flag indicating auto-checkout

**Smart Overtime Logic:**
```javascript
// Calculate shortage hours first (based on late arrival)
this.shortageHours = 0;
if (this.isLate && this.lateMinutes > 0) {
  this.shortageHours = this.lateMinutes / 60;
}

// Smart overtime calculation
if (this.totalHours > standardWorkingHours) {
  const extraHours = this.totalHours - standardWorkingHours;
  
  if (this.shortageHours > 0) {
    // First, use extra hours to reduce shortage hours
    const shortageReduction = Math.min(extraHours, this.shortageHours);
    this.shortageHours = Math.max(0, this.shortageHours - shortageReduction);
    
    // Remaining extra hours become overtime
    this.adjustedOvertimeHours = Math.max(0, extraHours - shortageReduction);
    this.overtime = this.adjustedOvertimeHours;
  } else {
    // No shortage hours, all extra hours are overtime
    this.overtime = extraHours;
    this.adjustedOvertimeHours = extraHours;
  }
}
```

**Auto-Checkout Methods:**
- `updateActivity()`: Updates last activity time
- `autoCheckOut()`: Performs auto-checkout
- `autoCheckoutInactiveEmployees()`: Static method to find and auto-checkout inactive employees

#### 2. Attendance Controller (`backend/controllers/attendanceController.js`)
**New Endpoints:**
- `POST /api/attendance/activity`: Update employee activity
- `GET /api/attendance/auto-checkout-check`: Check for auto-checkout candidates
- `GET /api/attendance/smart-overtime/:id`: Get smart overtime details

**Enhanced Checkout Response:**
```javascript
res.json({
  message: 'Check-out successful',
  attendance: attendance,
  smartOvertimeInfo: {
    shortageHours: attendance.shortageHours || 0,
    adjustedOvertimeHours: attendance.adjustedOvertimeHours || 0,
    originalOvertimeHours: attendance.overtime || 0
  }
});
```

#### 3. System Settings (`backend/models/SystemSettings.js`)
**New Settings:**
- `autoCheckoutTimeout`: Inactivity timeout (default: 10 minutes)
- `autoCheckoutEnabled`: Enable/disable feature (default: true)
- `autoCheckoutWarningTime`: Warning time before auto-checkout (default: 2 minutes)
- `activityUpdateFrequency`: Activity update frequency (default: 2 minutes)

#### 4. Routes (`backend/routes/attendance.js`)
**New Routes Added:**
```javascript
router.post('/activity', auth, updateActivity);
router.get('/auto-checkout-check', [auth, roleAccess([...])], checkAutoCheckout);
router.get('/smart-overtime/:id', auth, getSmartOvertimeDetails);
```

### Frontend Changes

#### 1. Mouse Activity Service (`frontend/src/services/mouseActivityService.js`)
**Features:**
- Tracks mouse movements, clicks, keyboard input, scrolling
- Sends periodic activity updates to backend
- Shows warning before auto-checkout
- Handles auto-checkout process
- Configurable timeout settings

**Key Methods:**
- `startTracking()`: Begin activity monitoring
- `stopTracking()`: Stop activity monitoring
- `handleActivity()`: Record user activity
- `updateActivity()`: Send activity to backend
- `checkInactivity()`: Check for inactivity and trigger warnings/auto-checkout

#### 2. MyAttendance Component (`frontend/src/components/MyAttendance.js`)
**Enhancements:**
- Integrated mouse activity service
- Smart overtime information display
- Auto-checkout status indicators
- Enhanced checkout success messages with overtime details

**New UI Elements:**
- Smart overtime summary in completed attendance
- Shortage hours display in attendance history
- Auto-checkout indicators
- Activity status tracking

#### 3. API Utils (`frontend/src/utils/api.js`)
**New API Methods:**
```javascript
updateActivity: () => api.post('/attendance/activity'),
checkAutoCheckout: () => api.get('/attendance/auto-checkout-check'),
getSmartOvertimeDetails: (id) => api.get(`/attendance/smart-overtime/${id}`),
```

### Supporting Services

#### 1. Auto-Checkout Scheduler (`backend/services/autoCheckoutScheduler.js`)
**Features:**
- Cron job running every 5 minutes
- Checks for inactive employees
- Performs bulk auto-checkout
- Notification system for HR/Admin
- Manual trigger capability

#### 2. Initialization Scripts
- `backend/scripts/initializeAutoCheckoutSettings.js`: Sets up system settings
- `backend/test-smart-overtime.js`: Comprehensive testing script

## Configuration

### System Settings
```javascript
{
  autoCheckoutTimeout: '10',        // Minutes of inactivity
  autoCheckoutEnabled: 'true',      // Enable/disable feature
  autoCheckoutWarningTime: '2',     // Warning time in minutes
  activityUpdateFrequency: '2'      // Activity update frequency
}
```

### Work Hours Integration
- Uses existing `checkInTime`, `checkOutTime`, `workingHours` settings
- Respects `lateThreshold` for shortage calculation
- Only activates auto-checkout after standard checkout time

## Testing Results

### Smart Overtime Test Results:
✅ **Scenario 1**: 30 min late + 30 min extra = No shortage, No overtime  
✅ **Scenario 2**: 60 min late + 30 min extra = 30 min shortage remaining, No overtime  
✅ **Scenario 3**: 30 min late + 60 min extra = No shortage, 30 min overtime  
✅ **Scenario 4**: On time + 60 min extra = No shortage, 60 min overtime  

### Auto-Checkout Features:
✅ Activity tracking starts on check-in  
✅ Activity tracking stops on check-out  
✅ Inactivity detection after checkout time  
✅ Warning system before auto-checkout  
✅ Automatic checkout after timeout  
✅ Visual indicators for auto-checked out employees  

## Installation & Setup

### 1. Initialize Settings
```bash
cd backend
node scripts/initializeAutoCheckoutSettings.js
```

### 2. Test Implementation
```bash
cd backend
node test-smart-overtime.js
```

### 3. Start Auto-Checkout Scheduler (Optional)
```javascript
const autoCheckoutScheduler = require('./services/autoCheckoutScheduler');
autoCheckoutScheduler.start();
```

## Benefits

### For Employees:
- Fair overtime calculation that considers late arrivals
- Automatic checkout prevents forgotten check-outs
- Clear visibility of shortage vs overtime hours
- Reduced manual intervention for attendance corrections

### For HR/Management:
- More accurate attendance tracking
- Reduced administrative overhead
- Better overtime cost management
- Automated compliance with work hour policies
- Detailed audit trail of auto-checkouts

### For System:
- Improved data accuracy
- Reduced manual regularization requests
- Better integration with payroll calculations
- Enhanced reporting capabilities

## Future Enhancements

1. **Email Notifications**: Notify HR when employees are auto-checked out
2. **Mobile App Integration**: Extend activity tracking to mobile devices
3. **Advanced Analytics**: Detailed reports on overtime patterns and auto-checkouts
4. **Customizable Rules**: Department-specific overtime and auto-checkout rules
5. **Integration with Biometric Systems**: Combine with physical attendance systems

## Security Considerations

- Activity tracking is privacy-conscious (only tracks presence, not content)
- All data is encrypted in transit and at rest
- Role-based access control for auto-checkout management
- Audit logs for all auto-checkout events
- Configurable timeout settings per organization policy

---

**Implementation Status**: ✅ Complete and Tested  
**Version**: 1.0.0  
**Last Updated**: December 2024
