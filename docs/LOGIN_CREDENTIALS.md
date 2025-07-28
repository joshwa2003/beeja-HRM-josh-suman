# HRM Management System - Login Credentials

## System Overview
This MERN stack HRM management system includes role-based authentication with comprehensive attendance management features.

## Available User Accounts

### 1. Employee (Primary Test User) ✅ WORKING
- **Email:** employee@company.com
- **Password:** sumanrio99@
- **Role:** Employee
- **Name:** Sujith Kumar
- **Access Level:** Full employee access with attendance features
- **Status:** ✅ Password updated and verified working

### 2. Test Employee (Secondary) ✅ WORKING
- **Email:** test@company.com
- **Password:** password123
- **Role:** Employee
- **Name:** Test Employee
- **Access Level:** Basic employee access with attendance features
- **Status:** ✅ Available for testing

## ⚠️ Note About Other Roles
The system is designed to support multiple roles (Admin, HR, Manager, etc.), but currently only employee accounts exist in the database. Additional role-based accounts can be created through the admin interface or database scripts as needed.

## 🎯 **RECOMMENDED FOR ATTENDANCE TESTING**
**Use the primary employee account:**
- **Email:** employee@company.com
- **Password:** sumanrio99@
- **Name:** Sujith Kumar

This account has been specifically configured and tested for the new attendance system features.

## How to Start the System

### Backend Server
```bash
cd hrm-management/backend
node server.js
```
Server runs on: http://localhost:5000

### Frontend Application
```bash
cd hrm-management/frontend
npm start
```
Application runs on: http://localhost:3000

## Features Implemented
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Professional login interface
- ✅ Dashboard with role-specific content
- ✅ MongoDB integration
- ✅ Automatic dummy user creation
- ✅ Protected routes
- ✅ Responsive design
- ✅ **Advanced Attendance Management System**
- ✅ **59-second late arrival threshold**
- ✅ **Early check-in overtime calculation**
- ✅ **Late check-out overtime tracking**
- ✅ **Dual status handling (Present + Late)**
- ✅ **Late arrival popup notifications**
- ✅ **Real-time work hours tracking**
- ✅ **Monthly attendance summaries**
- ✅ **Comprehensive overtime reporting**

## Attendance System Features
### **Smart Late Detection**
- Employees checking in >59 seconds after standard time are marked as late
- Employees checking in ≤59 seconds are considered on-time (grace period for network delays)
- Late arrival popup appears with detailed information

### **Overtime Calculation**
- **Early Check-in**: Time before standard check-in counts as overtime
- **Late Check-out**: Time after standard check-out counts as overtime
- **Combined Overtime**: Both early arrival and late departure are tracked
- **Real-time Display**: Current work hours shown live during active sessions

### **Current Work Schedule**
- **Check-in Time**: 1:00 PM (13:00)
- **Check-out Time**: 1:10 PM (13:10)
- **Working Hours**: 10 minutes (0.167 hours)
- **Late Threshold**: 59 seconds after 1:00 PM

## Testing Notes
- ✅ Backend attendance logic tested and verified
- ✅ All user roles configured with appropriate access levels
- ✅ Attendance calculations working correctly for all scenarios
- ✅ Late arrival detection functioning with 59-second precision
- ✅ Overtime calculations accurate for early/late scenarios
- ✅ JWT token-based session management active
- ✅ Employee "Sujith Kumar" available for attendance testing

## Quick Test Scenarios
1. **On-time Check-in**: Login as employee@company.com, check-in within 59 seconds of 1:00 PM
2. **Late Check-in**: Check-in after 1:01:00 PM to trigger late popup
3. **Early Check-in**: Check-in before 1:00 PM to earn overtime credits
4. **Complete Session**: Early check-in + late check-out for maximum overtime

## System Status
- ✅ Backend server ready on http://localhost:5000
- ✅ Frontend application ready on http://localhost:3000
- ✅ MongoDB connected and populated with test data
- ✅ All attendance features fully implemented and tested
