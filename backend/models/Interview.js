const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  // Application Reference
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: [true, 'Application reference is required']
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required']
  },
  
  // Interview Details
  round: {
    type: Number,
    required: [true, 'Interview round is required'],
    min: [1, 'Round must be at least 1']
  },
  title: {
    type: String,
    required: [true, 'Interview title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['Technical', 'HR', 'Managerial', 'Cultural Fit', 'Final', 'Panel', 'Group', 'Other'],
    required: [true, 'Interview type is required']
  },
  
  // Scheduling Information
  scheduledDate: {
    type: Date,
    required: [true, 'Interview date is required']
  },
  scheduledTime: {
    type: String,
    required: [true, 'Interview time is required']
  },
  duration: {
    type: Number, // in minutes
    default: 60,
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  
  // Interview Mode
  mode: {
    type: String,
    enum: ['Online', 'Offline', 'Phone', 'Video Call'],
    required: [true, 'Interview mode is required']
  },
  location: {
    type: String,
    trim: true
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingId: {
    type: String,
    trim: true
  },
  meetingPassword: {
    type: String,
    trim: true
  },
  
  // Interviewer Information
  primaryInterviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Primary interviewer is required']
  },
  additionalInterviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Interviewer is required']
  },
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Scheduled by is required']
  },
  
  // Interview Status
  status: {
    type: String,
    enum: [
      'Scheduled',
      'Confirmed',
      'In Progress',
      'Completed',
      'Cancelled',
      'Rescheduled',
      'No Show - Candidate',
      'No Show - Interviewer',
      'Technical Issues'
    ],
    default: 'Scheduled'
  },
  
  // Candidate Confirmation
  candidateConfirmed: {
    type: Boolean,
    default: false
  },
  candidateConfirmedAt: Date,
  candidateResponse: {
    type: String,
    enum: ['Accepted', 'Declined', 'Requested Reschedule'],
    default: 'Accepted'
  },
  candidateNotes: {
    type: String,
    maxlength: [500, 'Candidate notes cannot exceed 500 characters']
  },
  
  // Interview Preparation
  interviewQuestions: [{
    question: String,
    category: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Situational', 'Company Culture', 'Role Specific']
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard']
    }
  }],
  requiredDocuments: [{
    type: String,
    trim: true
  }],
  interviewInstructions: {
    type: String,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  
  // Rescheduling Information
  originalDate: Date,
  originalTime: String,
  rescheduleReason: {
    type: String,
    maxlength: [300, 'Reschedule reason cannot exceed 300 characters']
  },
  rescheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rescheduledAt: Date,
  rescheduleCount: {
    type: Number,
    default: 0
  },
  
  // Cancellation Information
  cancellationReason: {
    type: String,
    maxlength: [300, 'Cancellation reason cannot exceed 300 characters']
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  
  // Interview Completion
  actualStartTime: Date,
  actualEndTime: Date,
  actualDuration: Number, // in minutes
  
  // System Fields
  scheduledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Scheduled by is required']
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Email Notifications
  emailsSent: {
    candidateInvite: { sent: Boolean, sentAt: Date },
    interviewerNotification: { sent: Boolean, sentAt: Date },
    reminder24h: { sent: Boolean, sentAt: Date },
    reminder2h: { sent: Boolean, sentAt: Date },
    completion: { sent: Boolean, sentAt: Date }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
interviewSchema.index({ application: 1, round: 1 });
interviewSchema.index({ job: 1 });
interviewSchema.index({ primaryInterviewer: 1, scheduledDate: 1 });
interviewSchema.index({ scheduledDate: 1, status: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ scheduledBy: 1 });

// Virtual for interview date-time
interviewSchema.virtual('scheduledDateTime').get(function() {
  if (this.scheduledDate && this.scheduledTime) {
    const [hours, minutes] = this.scheduledTime.split(':');
    const dateTime = new Date(this.scheduledDate);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dateTime;
  }
  return null;
});

// Virtual for all interviewers
interviewSchema.virtual('allInterviewers').get(function() {
  const interviewers = [this.primaryInterviewer];
  if (this.additionalInterviewers && this.additionalInterviewers.length > 0) {
    interviewers.push(...this.additionalInterviewers);
  }
  return interviewers;
});

// Method to confirm candidate attendance
interviewSchema.methods.confirmCandidate = function(response, notes) {
  this.candidateConfirmed = true;
  this.candidateConfirmedAt = new Date();
  this.candidateResponse = response;
  if (notes) this.candidateNotes = notes;
  
  if (response === 'Accepted') {
    this.status = 'Confirmed';
  }
  
  return this.save();
};

// Method to reschedule interview
interviewSchema.methods.reschedule = function(newDate, newTime, reason, rescheduledBy) {
  this.originalDate = this.scheduledDate;
  this.originalTime = this.scheduledTime;
  this.scheduledDate = newDate;
  this.scheduledTime = newTime;
  this.rescheduleReason = reason;
  this.rescheduledBy = rescheduledBy;
  this.rescheduledAt = new Date();
  this.rescheduleCount += 1;
  this.status = 'Rescheduled';
  this.candidateConfirmed = false;
  this.lastUpdatedBy = rescheduledBy;
  
  // Reset email notifications
  this.emailsSent = {
    candidateInvite: { sent: false },
    interviewerNotification: { sent: false },
    reminder24h: { sent: false },
    reminder2h: { sent: false },
    completion: { sent: false }
  };
  
  return this.save();
};

// Method to cancel interview
interviewSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'Cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.lastUpdatedBy = cancelledBy;
  return this.save();
};

// Method to start interview
interviewSchema.methods.startInterview = function() {
  this.status = 'In Progress';
  this.actualStartTime = new Date();
  return this.save();
};

// Method to complete interview
interviewSchema.methods.completeInterview = function() {
  this.status = 'Completed';
  this.actualEndTime = new Date();
  
  if (this.actualStartTime) {
    this.actualDuration = Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60));
  }
  
  return this.save();
};

// Method to mark email as sent
interviewSchema.methods.markEmailSent = function(emailType) {
  if (this.emailsSent[emailType]) {
    this.emailsSent[emailType].sent = true;
    this.emailsSent[emailType].sentAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get interviews by interviewer
interviewSchema.statics.getByInterviewer = function(interviewerId, filters = {}) {
  const query = {
    $or: [
      { primaryInterviewer: interviewerId },
      { additionalInterviewers: interviewerId }
    ],
    ...filters
  };
  
  return this.find(query)
    .populate('application', 'firstName lastName email phoneNumber applicationNumber')
    .populate('job', 'title code department')
    .populate('primaryInterviewer', 'firstName lastName email')
    .populate('additionalInterviewers', 'firstName lastName email')
    .populate('scheduledBy', 'firstName lastName')
    .sort({ scheduledDate: 1, scheduledTime: 1 });
};

// Static method to get interviews by date range
interviewSchema.statics.getByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  };
  
  return this.find(query)
    .populate('application', 'firstName lastName email phoneNumber')
    .populate('job', 'title code')
    .populate('primaryInterviewer', 'firstName lastName')
    .sort({ scheduledDate: 1, scheduledTime: 1 });
};

// Static method to get upcoming interviews
interviewSchema.statics.getUpcoming = function(filters = {}) {
  const now = new Date();
  const query = {
    scheduledDate: { $gte: now },
    status: { $in: ['Scheduled', 'Confirmed'] },
    ...filters
  };
  
  return this.find(query)
    .populate('application', 'firstName lastName email phoneNumber')
    .populate('job', 'title code')
    .populate('primaryInterviewer', 'firstName lastName')
    .sort({ scheduledDate: 1, scheduledTime: 1 });
};

// Transform output
interviewSchema.methods.toJSON = function() {
  const interviewObject = this.toObject();
  return interviewObject;
};

module.exports = mongoose.model('Interview', interviewSchema);
