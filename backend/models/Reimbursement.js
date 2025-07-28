const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reimbursementSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  
  // Reimbursement Details
  category: {
    type: String,
    required: [true, 'Reimbursement category is required'],
    enum: [
      'Travel',
      'Food',
      'Internet',
      'Office Supplies',
      'Medical',
      'Communication',
      'Training',
      'Fuel',
      'Accommodation',
      'Other'
    ]
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
    max: [100000, 'Amount cannot exceed 1,00,000']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  
  // Request Details
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Expense date cannot be in the future'
    }
  },
  businessPurpose: {
    type: String,
    required: [true, 'Business purpose is required'],
    trim: true,
    maxlength: [300, 'Business purpose cannot exceed 300 characters']
  },
  
  // Supporting Documents
  receipts: [{
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Approval Workflow
  status: {
    type: String,
    enum: [
      'Draft',
      'Submitted',
      'Team Lead Review',
      'Team Manager Review',
      'HR Review',
      'Approved',
      'Rejected',
      'Paid',
      'Cancelled'
    ],
    default: 'Draft'
  },
  
  // Approval Chain
  approvalChain: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['Team Lead', 'Team Manager', 'HR', 'Admin'],
      required: true
    },
    action: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [500, 'Comments cannot exceed 500 characters']
    },
    actionDate: {
      type: Date
    },
    order: {
      type: Number,
      required: true
    },
    level: {
      type: String,
      enum: ['Team Lead', 'Team Manager', 'HR'],
      required: true
    }
  }],
  
  // Current Approver
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Payment Details
  paymentDetails: {
    method: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Cheque', 'Payroll Integration'],
      default: 'Bank Transfer'
    },
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative']
    },
    paidDate: {
      type: Date
    },
    transactionId: {
      type: String,
      trim: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Policy Compliance
  policyCompliance: {
    isCompliant: {
      type: Boolean,
      default: true
    },
    violations: [{
      rule: String,
      description: String,
      severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
      }
    }],
    overrideReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Override reason cannot exceed 300 characters']
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Monthly Limits Tracking
  monthlyLimitUsage: {
    month: Number,
    year: Number,
    categoryLimit: Number,
    usedAmount: Number,
    remainingAmount: Number
  },
  
  // Integration with Payroll
  payrollIntegration: {
    includeInPayroll: {
      type: Boolean,
      default: false
    },
    payrollMonth: Number,
    payrollYear: Number,
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll'
    }
  },
  
  // Audit Trail
  auditTrail: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      trim: true
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // System Fields
  submittedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
reimbursementSchema.index({ employee: 1, status: 1 });
reimbursementSchema.index({ status: 1, createdAt: -1 });
reimbursementSchema.index({ category: 1, expenseDate: -1 });
reimbursementSchema.index({ currentApprover: 1, status: 1 });
reimbursementSchema.index({ 'payrollIntegration.payrollMonth': 1, 'payrollIntegration.payrollYear': 1 });

// Virtual for reimbursement ID
reimbursementSchema.virtual('reimbursementId').get(function() {
  const date = this.createdAt || new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const id = this._id.toString().slice(-6).toUpperCase();
  return `RMB${year}${month}${id}`;
});

// Method to submit reimbursement for approval
reimbursementSchema.methods.submit = async function() {
  if (this.status !== 'Draft') {
    throw new Error('Only draft reimbursements can be submitted');
  }
  
  this.status = 'Submitted';
  this.submittedAt = new Date();
  
  // Set current approver to first in chain (Team Lead)
  if (this.approvalChain.length > 0) {
    this.currentApprover = this.approvalChain[0].approver;
    this.status = 'Team Lead Review';
  }
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Submitted for approval',
    performedBy: this.employee,
    details: 'Reimbursement submitted for Team Lead approval'
  });
  
  return this.save();
};

// Method to approve reimbursement
reimbursementSchema.methods.approve = async function(approverId, comments = '') {
  const currentApproval = this.approvalChain.find(
    approval => approval.approver.toString() === approverId.toString() && approval.action === 'Pending'
  );
  
  if (!currentApproval) {
    throw new Error('You are not authorized to approve this reimbursement');
  }
  
  currentApproval.action = 'Approved';
  currentApproval.comments = comments;
  currentApproval.actionDate = new Date();
  
  // Find next approver
  const nextApproval = this.approvalChain.find(
    approval => approval.order > currentApproval.order && approval.action === 'Pending'
  );
  
  if (nextApproval) {
    this.currentApprover = nextApproval.approver;
    // Set status based on next approver's level
    if (nextApproval.level === 'Team Manager') {
      this.status = 'Team Manager Review';
    } else if (nextApproval.level === 'HR') {
      this.status = 'HR Review';
    }
  } else {
    this.status = 'Approved';
    this.currentApprover = null;
    this.completedAt = new Date();
  }
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Approved',
    performedBy: approverId,
    details: `Approved by ${currentApproval.level}${comments ? ': ' + comments : ''}`
  });
  
  return this.save();
};

// Method to reject reimbursement
reimbursementSchema.methods.reject = async function(approverId, reason) {
  const currentApproval = this.approvalChain.find(
    approval => approval.approver.toString() === approverId.toString() && approval.action === 'Pending'
  );
  
  if (!currentApproval) {
    throw new Error('You are not authorized to reject this reimbursement');
  }
  
  currentApproval.action = 'Rejected';
  currentApproval.comments = reason;
  currentApproval.actionDate = new Date();
  
  this.status = 'Rejected';
  this.rejectionReason = reason;
  this.currentApprover = null;
  this.completedAt = new Date();
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Rejected',
    performedBy: approverId,
    details: `Rejected by ${currentApproval.level}: ${reason}`
  });
  
  return this.save();
};

// Method to mark as paid
reimbursementSchema.methods.markAsPaid = async function(paidBy, paymentDetails) {
  if (this.status !== 'Approved') {
    throw new Error('Only approved reimbursements can be marked as paid');
  }
  
  this.status = 'Paid';
  this.paymentDetails = {
    ...this.paymentDetails,
    ...paymentDetails,
    processedBy: paidBy,
    paidDate: new Date()
  };
  
  // Add audit trail
  this.auditTrail.push({
    action: 'Marked as Paid',
    performedBy: paidBy,
    details: `Payment processed via ${paymentDetails.method}`
  });
  
  return this.save();
};

// Static method to get reimbursements pending approval for a user
reimbursementSchema.statics.getPendingApprovals = async function(approverId) {
  return this.find({
    currentApprover: approverId,
    status: { $in: ['Team Lead Review', 'Team Manager Review', 'HR Review'] }
  })
  .populate('employee', 'firstName lastName email employeeId')
  .populate('approvalChain.approver', 'firstName lastName role')
  .sort({ createdAt: 1 });
};

// Static method to get monthly summary for an employee
reimbursementSchema.statics.getMonthlySummary = async function(employeeId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const summary = await this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        expenseDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$amount', 0] }
        },
        pending: {
          $sum: { $cond: [{ $in: ['$status', ['Submitted', 'Under Review', 'HR Review', 'Finance Review']] }, '$amount', 0] }
        }
      }
    }
  ]);
  
  return summary;
};

// Pre-save middleware to update audit trail
reimbursementSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.employee;
  }
  next();
});

// Add pagination plugin
reimbursementSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Reimbursement', reimbursementSchema);
