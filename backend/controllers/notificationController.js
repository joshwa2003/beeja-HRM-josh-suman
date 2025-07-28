const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, isRead, search } = req.query;

    // Build filter
    let filter = { recipient: userId };
    
    if (type) {
      filter.type = type;
    }
    
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName');

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get recent notifications (for navbar dropdown)
// @route   GET /api/notifications/recent
// @access  Private
const getRecentNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 5;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName');

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Get recent notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recent notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Mark multiple notifications as read
// @route   PUT /api/notifications/mark-multiple-read
// @access  Private
const markMultipleAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user._id;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification IDs provided'
      });
    }

    const result = await Notification.markMultipleAsRead(notificationIds, userId);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark multiple as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create notification (Admin/System use)
// @route   POST /api/notifications
// @access  Private (Admin/HR/Manager)
const createNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { recipient, title, message, type = 'general', priority = 'medium', data = {} } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }

    const notification = new Notification({
      recipient,
      title,
      message,
      type,
      priority,
      data,
      createdBy: req.user._id
    });

    await notification.save();
    await notification.populate('recipient', 'firstName lastName email');
    await notification.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating notification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get notification statistics (Admin/HR use)
// @route   GET /api/notifications/stats
// @access  Private (Admin/HR/Manager)
const getNotificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const stats = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          },
          unreadNotifications: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          byType: {
            $push: {
              type: '$type',
              isRead: '$isRead'
            }
          }
        }
      }
    ]);

    // Get type breakdown
    const typeStats = await Notification.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          readCount: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalNotifications: 0,
        readNotifications: 0,
        unreadNotifications: 0
      },
      typeStats
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching notification statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  getRecentNotifications,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationStats
};
