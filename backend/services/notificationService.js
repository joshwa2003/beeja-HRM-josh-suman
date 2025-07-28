const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const SystemSettings = require('../models/SystemSettings');

class NotificationService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  // Start the notification service
  start() {
    if (this.isRunning) {
      console.log('⚠️  Notification service is already running');
      return;
    }

    // Check for checkout reminders every 30 minutes
    this.checkInterval = setInterval(async () => {
      await this.checkForCheckoutReminders();
    }, 30 * 60 * 1000); // 30 minutes

    this.isRunning = true;
    console.log('🔔 Notification service started - checking every 30 minutes');
  }

  // Stop the notification service
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Notification service stopped');
  }

  // Check for employees who have completed their work hours and send checkout reminders
  async checkForCheckoutReminders() {
    try {
      console.log('🔍 Checking for checkout reminders...');

      // Get work hours settings
      const workHours = await SystemSettings.getWorkHours();
      const standardWorkingHours = workHours.workingHours || 8;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find employees who are checked in but not checked out
      const activeAttendances = await Attendance.find({
        date: { $gte: today, $lt: tomorrow },
        checkIn: { $exists: true, $ne: null },
        checkOut: { $exists: false }
      }).populate('employee', 'firstName lastName email');

      const now = new Date();
      let remindersSent = 0;

      for (const attendance of activeAttendances) {
        // Calculate current work hours
        const checkInTime = new Date(attendance.checkIn);
        const timeDiff = now.getTime() - checkInTime.getTime();
        const currentHours = timeDiff / (1000 * 60 * 60); // Convert to hours

        // Check if employee has completed standard work hours
        if (currentHours >= standardWorkingHours) {
          // Check if we already sent a reminder today
          const existingReminder = await Notification.findOne({
            recipient: attendance.employee._id,
            type: 'checkout_reminder',
            createdAt: { $gte: today, $lt: tomorrow }
          });

          if (!existingReminder) {
            // Send checkout reminder
            await this.sendCheckoutReminder(
              attendance.employee._id,
              standardWorkingHours,
              currentHours
            );
            remindersSent++;
          }
        }
      }

      if (remindersSent > 0) {
        console.log(`🔔 Sent ${remindersSent} checkout reminders`);
      } else {
        console.log('✅ No checkout reminders needed at this time');
      }

    } catch (error) {
      console.error('❌ Error checking for checkout reminders:', error);
    }
  }

  // Send checkout reminder notification
  async sendCheckoutReminder(userId, workHours, currentHours) {
    try {
      await Notification.createCheckoutReminder(userId, workHours, currentHours);
      console.log(`📤 Checkout reminder sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending checkout reminder:', error);
    }
  }

  // Send auto-checkout notification
  async sendAutoCheckoutNotification(userId, checkoutTime) {
    try {
      await Notification.createAutoCheckoutNotification(userId, checkoutTime);
      console.log(`📤 Auto-checkout notification sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending auto-checkout notification:', error);
    }
  }

  // Send overtime alert notification
  async sendOvertimeAlert(userId, overtimeHours, shortageReduced = 0) {
    try {
      await Notification.createOvertimeAlert(userId, overtimeHours, shortageReduced);
      console.log(`📤 Overtime alert sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending overtime alert:', error);
    }
  }

  // Send bulk notifications to multiple users
  async sendBulkNotification(userIds, title, message, type = 'general', priority = 'medium', data = {}) {
    try {
      const notifications = userIds.map(userId => ({
        recipient: userId,
        title,
        message,
        type,
        priority,
        data
      }));

      await Notification.insertMany(notifications);
      console.log(`📤 Bulk notification sent to ${userIds.length} users`);
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error);
    }
  }

  // Send system notification to all active users
  async sendSystemNotification(title, message, priority = 'medium', data = {}) {
    try {
      const User = require('../models/User');
      const activeUsers = await User.find({ isActive: true }).select('_id');
      const userIds = activeUsers.map(user => user._id);

      await this.sendBulkNotification(userIds, title, message, 'system', priority, data);
      console.log(`📤 System notification sent to ${userIds.length} active users`);
    } catch (error) {
      console.error('❌ Error sending system notification:', error);
    }
  }

  // Clean up old notifications (run daily)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
    } catch (error) {
      console.error('❌ Error cleaning up old notifications:', error);
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextCheck: this.checkInterval ? new Date(Date.now() + 30 * 60 * 1000) : null
    };
  }

  // Manual trigger for testing
  async manualTrigger() {
    console.log('🔧 Manual notification check triggered');
    await this.checkForCheckoutReminders();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
