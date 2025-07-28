const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['checkout_reminder', 'auto_checkout', 'overtime_alert', 'general', 'system'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional data for the notification
    default: {}
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create checkout reminder notification
notificationSchema.statics.createCheckoutReminder = async function(userId, workHours, currentHours) {
  const notification = new this({
    recipient: userId,
    title: '⏰ Checkout Reminder',
    message: `You have completed ${currentHours.toFixed(1)} hours of work (${workHours} hours required). Consider checking out if you're done for the day.`,
    type: 'checkout_reminder',
    priority: 'medium',
    data: {
      workHours: workHours,
      currentHours: currentHours,
      timestamp: new Date()
    }
  });
  
  return await notification.save();
};

// Static method to create auto-checkout notification
notificationSchema.statics.createAutoCheckoutNotification = async function(userId, checkoutTime) {
  const notification = new this({
    recipient: userId,
    title: '🤖 Auto-Checkout Completed',
    message: `You have been automatically checked out at ${checkoutTime.toLocaleTimeString()} due to inactivity.`,
    type: 'auto_checkout',
    priority: 'high',
    data: {
      checkoutTime: checkoutTime,
      reason: 'inactivity'
    }
  });
  
  return await notification.save();
};

// Static method to create overtime alert notification
notificationSchema.statics.createOvertimeAlert = async function(userId, overtimeHours, shortageReduced) {
  let message = `You have earned ${overtimeHours.toFixed(1)} hours of overtime.`;
  
  if (shortageReduced > 0) {
    message = `Smart overtime applied: ${shortageReduced.toFixed(1)} hours reduced from shortage, ${overtimeHours.toFixed(1)} hours counted as overtime.`;
  }
  
  const notification = new this({
    recipient: userId,
    title: '💰 Overtime Earned',
    message: message,
    type: 'overtime_alert',
    priority: 'medium',
    data: {
      overtimeHours: overtimeHours,
      shortageReduced: shortageReduced || 0
    }
  });
  
  return await notification.save();
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = async function(notificationIds, userId) {
  return await this.updateMany(
    { 
      _id: { $in: notificationIds },
      recipient: userId 
    },
    { 
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

// Transform output
notificationSchema.methods.toJSON = function() {
  const notificationObject = this.toObject();
  return notificationObject;
};

module.exports = mongoose.model('Notification', notificationSchema);
