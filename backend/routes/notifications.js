const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const {
  getMyNotifications,
  getUnreadCount,
  getRecentNotifications,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationStats
} = require('../controllers/notificationController');

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, getMyNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', auth, getUnreadCount);

// @route   GET /api/notifications/recent
// @desc    Get recent notifications (for navbar dropdown)
// @access  Private
router.get('/recent', auth, getRecentNotifications);

// @route   GET /api/notifications/stats
// @desc    Get notification statistics (Admin/HR use)
// @access  Private (Admin/HR/Manager)
router.get('/stats', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager'])
], getNotificationStats);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, markAsRead);

// @route   PUT /api/notifications/mark-multiple-read
// @desc    Mark multiple notifications as read
// @access  Private
router.put('/mark-multiple-read', [
  auth,
  body('notificationIds').isArray().withMessage('Notification IDs must be an array')
], markMultipleAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, deleteNotification);

// @route   POST /api/notifications
// @desc    Create notification (Admin/System use)
// @access  Private (Admin/HR/Manager)
router.post('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager']),
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
  body('type').optional().isIn(['checkout_reminder', 'auto_checkout', 'overtime_alert', 'general', 'system']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
], createNotification);

module.exports = router;
