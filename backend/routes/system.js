const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const SystemSettings = require('../models/SystemSettings');

// @desc    Get work hours configuration
// @route   GET /api/system/work-hours
// @access  Private
const getWorkHours = async (req, res) => {
  try {
    const workHours = await SystemSettings.getWorkHours();
    
    res.json({
      success: true,
      workHours: {
        checkInTime: workHours.checkInTime,
        checkOutTime: workHours.checkOutTime,
        workingHours: workHours.workingHours
      }
    });
  } catch (error) {
    console.error('Get work hours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work hours',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all system settings (Admin/HR only)
// @route   GET /api/system/settings
// @access  Private (Admin/HR)
const getSystemSettings = async (req, res) => {
  try {
    // Check if user is admin or HR (including HR-related roles)
    const allowedRoles = ['Admin', 'HR', 'Manager', 'HR Manager', 'HR Executive', 'HR BP'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or HR privileges required.'
      });
    }

    const settings = await SystemSettings.find().sort({ category: 1, settingKey: 1 });
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update system setting (Admin/HR only)
// @route   PUT /api/system/settings/:key
// @access  Private (Admin/HR)
const updateSystemSetting = async (req, res) => {
  try {
    // Check if user is admin or HR (including HR-related roles)
    const allowedRoles = ['Admin', 'HR', 'Manager', 'HR Manager', 'HR Executive', 'HR BP'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or HR privileges required.'
      });
    }

    const { key } = req.params;
    const { settingValue, description } = req.body;

    if (settingValue === undefined || settingValue === null) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }

    const setting = await SystemSettings.setSetting(
      key,
      settingValue,
      description || `${key} setting`,
      'attendance',
      req.user._id
    );

    res.json({
      success: true,
      message: 'System setting updated successfully',
      setting
    });
  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system setting',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.get('/work-hours', auth, getWorkHours);
router.get('/settings', auth, getSystemSettings);
router.put('/settings/:key', auth, updateSystemSetting);

module.exports = router;
