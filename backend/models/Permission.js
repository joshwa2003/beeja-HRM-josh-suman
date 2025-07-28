const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responsiblePerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workDescription: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Team Leader Approved', 'Team Manager Approved', 'HR Approved', 'Rejected'],
    default: 'Pending'
  },
  currentApprovalLevel: {
    type: String,
    enum: ['Team Leader', 'Team Manager', 'HR'],
    default: 'Team Leader'
  },
  approvalHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['Approved', 'Rejected']
    },
    comments: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['Team Leader', 'Team Manager', 'HR']
    }
  }],
  rejectionReason: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  finalApprovedAt: Date,
  finalApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
permissionSchema.index({ employee: 1, status: 1 });
permissionSchema.index({ status: 1, currentApprovalLevel: 1 });
permissionSchema.index({ startDate: 1, endDate: 1 });

// Virtual for permission ID display
permissionSchema.virtual('permissionId').get(function() {
  return `PR${this._id.toString().slice(-6).toUpperCase()}`;
});

// Method to check if user can approve at current level
permissionSchema.methods.canApprove = function(user) {
  if (this.status !== 'Pending' && 
      this.status !== 'Team Leader Approved' && 
      this.status !== 'Team Manager Approved') {
    return false;
  }

  const userRole = user.role;
  const currentLevel = this.currentApprovalLevel;

  if (currentLevel === 'Team Leader' && ['Team Leader', 'Team Lead'].includes(userRole)) {
    return true;
  }
  if (currentLevel === 'Team Manager' && userRole === 'Team Manager') {
    return true;
  }
  if (currentLevel === 'HR' && ['HR Manager', 'HR BP', 'HR Executive'].includes(userRole)) {
    return true;
  }

  return false;
};

// Method to advance to next approval level
permissionSchema.methods.advanceApprovalLevel = function() {
  if (this.currentApprovalLevel === 'Team Leader') {
    this.currentApprovalLevel = 'Team Manager';
    this.status = 'Team Leader Approved';
  } else if (this.currentApprovalLevel === 'Team Manager') {
    this.currentApprovalLevel = 'HR';
    this.status = 'Team Manager Approved';
  } else if (this.currentApprovalLevel === 'HR') {
    this.status = 'HR Approved';
    this.finalApprovedAt = new Date();
  }
};

// Method to reject permission
permissionSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'Rejected';
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.rejectedAt = new Date();
};

permissionSchema.set('toJSON', { virtuals: true });
permissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Permission', permissionSchema);
