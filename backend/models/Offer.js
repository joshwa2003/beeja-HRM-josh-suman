const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  // References
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
  candidate: {
    firstName: {
      type: String,
      required: [true, 'Candidate first name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Candidate last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Candidate email is required'],
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Candidate phone number is required'],
      trim: true
    }
  },
  
  // Offer Details
  offerNumber: {
    type: String,
    unique: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Employment Terms
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    required: [true, 'Employment type is required'],
    default: 'Full-time'
  },
  workMode: {
    type: String,
    enum: ['On-site', 'Remote', 'Hybrid'],
    required: [true, 'Work mode is required'],
    default: 'On-site'
  },
  workLocation: {
    type: String,
    required: [true, 'Work location is required'],
    trim: true
  },
  
  // Salary and Compensation
  salary: {
    basic: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative']
    },
    hra: {
      type: Number,
      default: 0,
      min: [0, 'HRA cannot be negative']
    },
    allowances: {
      transport: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      special: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    variablePay: {
      type: Number,
      default: 0,
      min: [0, 'Variable pay cannot be negative']
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, 'Bonus cannot be negative']
    },
    totalCTC: {
      type: Number,
      required: [true, 'Total CTC is required'],
      min: [0, 'Total CTC cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  
  // Benefits
  benefits: {
    healthInsurance: {
      included: { type: Boolean, default: true },
      coverage: String,
      premium: Number
    },
    lifeInsurance: {
      included: { type: Boolean, default: false },
      coverage: String,
      premium: Number
    },
    providentFund: {
      included: { type: Boolean, default: true },
      employeeContribution: { type: Number, default: 12 },
      employerContribution: { type: Number, default: 12 }
    },
    gratuity: {
      included: { type: Boolean, default: true },
      eligibility: String
    },
    leavePolicy: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 12 },
      earned: { type: Number, default: 21 },
      maternity: { type: Number, default: 180 },
      paternity: { type: Number, default: 15 }
    },
    otherBenefits: [{
      type: String,
      trim: true
    }]
  },
  
  // Joining Details
  proposedJoiningDate: {
    type: Date,
    required: [true, 'Proposed joining date is required']
  },
  actualJoiningDate: Date,
  probationPeriod: {
    duration: {
      type: Number,
      default: 6, // in months
      min: [0, 'Probation period cannot be negative']
    },
    terms: {
      type: String,
      maxlength: [500, 'Probation terms cannot exceed 500 characters']
    }
  },
  noticePeriod: {
    type: String,
    enum: ['1 month', '2 months', '3 months', '6 months'],
    default: '1 month'
  },
  
  // Offer Status
  status: {
    type: String,
    enum: [
      'Draft',
      'Generated',
      'Sent',
      'Viewed',
      'Accepted',
      'Rejected',
      'Expired',
      'Withdrawn',
      'Negotiation',
      'Revised'
    ],
    default: 'Draft'
  },
  
  // Offer Validity
  validUntil: {
    type: Date,
    required: [true, 'Offer validity date is required']
  },
  
  // Document Management
  offerLetter: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    generatedAt: Date,
    template: String
  },
  appointmentLetter: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    generatedAt: Date
  },
  
  // Candidate Response
  candidateResponse: {
    status: {
      type: String,
      enum: ['Accepted', 'Rejected', 'Negotiation Requested']
    },
    responseDate: Date,
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    },
    negotiationPoints: [{
      aspect: {
        type: String,
        enum: ['Salary', 'Joining Date', 'Work Location', 'Benefits', 'Other']
      },
      currentValue: String,
      requestedValue: String,
      reason: String,
      status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'Counter Offered']
      }
    }]
  },
  
  // Revision History
  revisions: [{
    version: Number,
    changes: [{
      field: String,
      oldValue: String,
      newValue: String,
      reason: String
    }],
    revisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    revisedAt: {
      type: Date,
      default: Date.now
    },
    document: {
      filename: String,
      path: String
    }
  }],
  currentVersion: {
    type: Number,
    default: 1
  },
  
  // Approval Workflow
  approvals: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['HR Manager', 'Department Head', 'Finance', 'CEO', 'Other']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    comments: String,
    approvedAt: Date,
    order: Number
  }],
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  
  // Communication Log
  communications: [{
    type: {
      type: String,
      enum: ['Email Sent', 'Phone Call', 'Meeting', 'Document Shared', 'Reminder', 'Other']
    },
    subject: String,
    content: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    deliveryStatus: {
      type: String,
      enum: ['Sent', 'Delivered', 'Read', 'Failed']
    }
  }],
  
  // System Fields
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Generated by is required']
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentAt: Date,
  viewedAt: Date,
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional Terms
  specialTerms: [{
    type: String,
    trim: true,
    maxlength: [300, 'Special term cannot exceed 300 characters']
  }],
  confidentialityClause: {
    type: Boolean,
    default: true
  },
  nonCompeteClause: {
    type: Boolean,
    default: false
  },
  
  // Onboarding Integration
  onboardingInitiated: {
    type: Boolean,
    default: false
  },
  userAccountCreated: {
    type: Boolean,
    default: false
  },
  createdUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
offerSchema.index({ application: 1 });
offerSchema.index({ job: 1 });
offerSchema.index({ 'candidate.email': 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ validUntil: 1 });
offerSchema.index({ proposedJoiningDate: 1 });
offerSchema.index({ generatedBy: 1 });
offerSchema.index({ offerNumber: 1 });

// Virtual for candidate full name
offerSchema.virtual('candidateFullName').get(function() {
  return `${this.candidate.firstName} ${this.candidate.lastName}`;
});

// Virtual for total allowances
offerSchema.virtual('totalAllowances').get(function() {
  const allowances = this.salary.allowances;
  return (allowances.transport || 0) + 
         (allowances.medical || 0) + 
         (allowances.special || 0) + 
         (allowances.other || 0);
});

// Virtual for offer validity status
offerSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Pre-save middleware to generate offer number
offerSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.offerNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Count offers for this month
      const startOfMonth = new Date(year, new Date().getMonth(), 1);
      const endOfMonth = new Date(year, new Date().getMonth() + 1, 0);
      
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });
      
      const sequence = String(count + 1).padStart(4, '0');
      this.offerNumber = `OFF${year}${month}${sequence}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to send offer
offerSchema.methods.sendOffer = function(sentBy) {
  this.status = 'Sent';
  this.sentBy = sentBy;
  this.sentAt = new Date();
  this.lastUpdatedBy = sentBy;
  return this.save();
};

// Method to mark as viewed
offerSchema.methods.markAsViewed = function() {
  if (this.status === 'Sent') {
    this.status = 'Viewed';
    this.viewedAt = new Date();
  }
  return this.save();
};

// Method to accept offer
offerSchema.methods.acceptOffer = function(comments) {
  this.status = 'Accepted';
  this.candidateResponse = {
    status: 'Accepted',
    responseDate: new Date(),
    comments: comments
  };
  return this.save();
};

// Method to reject offer
offerSchema.methods.rejectOffer = function(comments) {
  this.status = 'Rejected';
  this.candidateResponse = {
    status: 'Rejected',
    responseDate: new Date(),
    comments: comments
  };
  return this.save();
};

// Method to request negotiation
offerSchema.methods.requestNegotiation = function(negotiationPoints, comments) {
  this.status = 'Negotiation';
  this.candidateResponse = {
    status: 'Negotiation Requested',
    responseDate: new Date(),
    comments: comments,
    negotiationPoints: negotiationPoints
  };
  return this.save();
};

// Method to add revision
offerSchema.methods.addRevision = function(changes, revisedBy, reason) {
  this.currentVersion += 1;
  this.revisions.push({
    version: this.currentVersion,
    changes: changes,
    revisedBy: revisedBy,
    reason: reason
  });
  this.status = 'Revised';
  this.lastUpdatedBy = revisedBy;
  return this.save();
};

// Method to add approval
offerSchema.methods.addApproval = function(approverId, role, status, comments) {
  const approval = this.approvals.find(a => a.approver.toString() === approverId.toString());
  
  if (approval) {
    approval.status = status;
    approval.comments = comments;
    if (status === 'Approved') {
      approval.approvedAt = new Date();
    }
  } else {
    this.approvals.push({
      approver: approverId,
      role: role,
      status: status,
      comments: comments,
      approvedAt: status === 'Approved' ? new Date() : undefined,
      order: this.approvals.length + 1
    });
  }
  
  // Update overall approval status
  const pendingApprovals = this.approvals.filter(a => a.status === 'Pending');
  const rejectedApprovals = this.approvals.filter(a => a.status === 'Rejected');
  
  if (rejectedApprovals.length > 0) {
    this.approvalStatus = 'Rejected';
  } else if (pendingApprovals.length === 0) {
    this.approvalStatus = 'Approved';
  }
  
  return this.save();
};

// Method to log communication
offerSchema.methods.logCommunication = function(type, subject, content, sentBy, deliveryStatus) {
  this.communications.push({
    type: type,
    subject: subject,
    content: content,
    sentBy: sentBy,
    deliveryStatus: deliveryStatus || 'Sent'
  });
  return this.save();
};

// Static method to get offers by status
offerSchema.statics.getByStatus = function(status, filters = {}) {
  const query = { status, ...filters };
  return this.find(query)
    .populate('application', 'firstName lastName applicationNumber')
    .populate('job', 'title code department')
    .populate('department', 'name')
    .populate('generatedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get expiring offers
offerSchema.statics.getExpiring = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: { $in: ['Sent', 'Viewed'] },
    validUntil: { $lte: futureDate, $gte: new Date() }
  })
    .populate('application', 'firstName lastName')
    .populate('job', 'title')
    .sort({ validUntil: 1 });
};

// Transform output
offerSchema.methods.toJSON = function() {
  const offerObject = this.toObject();
  return offerObject;
};

module.exports = mongoose.model('Offer', offerSchema);
