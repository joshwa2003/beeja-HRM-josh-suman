const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Job Reference
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required']
  },
  
  // Applicant Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  
  yearsOfExperience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  currentDesignation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  currentCompany: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  currentSalary: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  expectedSalary: {
    type: Number,
    min: [0, 'Expected salary cannot be negative']
  },
  noticePeriod: {
    type: String,
    enum: ['Immediate', '15 days', '1 month', '2 months', '3 months', 'More than 3 months'],
    default: '1 month'
  },
  
  // Skills and Qualifications
  technicalSkills: [{
    type: String,
    trim: true
  }],
  education: {
    degree: String,
    specialization: String,
    university: String,
    graduationYear: Number,
    percentage: Number
  },
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date
  }],
  
  // Documents
  resume: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  portfolioUrl: {
    type: String,
    trim: true
  },
  linkedinUrl: {
    type: String,
    trim: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: [
      'Pending',
      'Reviewed', 
      'Shortlisted',
      'Interview Round 1',
      'Interview Round 2', 
      'Interview Round 3',
      'Interview Round 4',
      'Interview Round 5',
      'Selected',
      'Rejected',
      'Offer Sent',
      'Offer Accepted',
      'Offer Rejected',
      'Withdrawn',
      'On Hold'
    ],
    default: 'Pending'
  },
  
  // Application Tracking
  applicationSource: {
    type: String,
    enum: ['Direct Application', 'Employee Referral', 'Job Portal', 'Social Media', 'Campus Hiring', 'Consultant', 'Other'],
    default: 'Direct Application'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: {
    type: String,
    maxlength: [1000, 'Review notes cannot exceed 1000 characters']
  },
  
  // Interview Information
  currentInterviewRound: {
    type: Number,
    default: 0
  },
  totalInterviewRounds: {
    type: Number,
    default: 1
  },
  
  // Rejection Information
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  
  // Selection Information
  selectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  selectedAt: Date,
  selectionNotes: {
    type: String,
    maxlength: [1000, 'Selection notes cannot exceed 1000 characters']
  },
  
  // Additional Information
  availableForInterview: {
    type: Boolean,
    default: true
  },
  preferredInterviewTime: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening', 'Flexible']
  },
  relocatable: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: String,
    trim: true
  },
  
  // System Fields
  applicationNumber: {
    type: String,
    unique: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Offer Letter Reference
  offerLetter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfferLetter'
  },
  
  // Source tracking
  applicationSource: {
    type: String,
    enum: ['Direct Application', 'Referral', 'Job Portal', 'Social Media', 'Other'],
    default: 'Direct Application'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // System fields
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ job: 1, appliedAt: -1 });

// Virtual for full name
applicationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to generate application number
applicationSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.applicationNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Count applications for this month
      const startOfMonth = new Date(year, new Date().getMonth(), 1);
      const endOfMonth = new Date(year, new Date().getMonth() + 1, 0);
      
      const count = await this.constructor.countDocuments({
        submittedAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });
      
      const sequence = String(count + 1).padStart(4, '0');
      this.applicationNumber = `APP${year}${month}${sequence}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to update status
applicationSchema.methods.updateStatus = function(newStatus, updatedBy, notes) {
  this.status = newStatus;
  this.lastUpdatedBy = updatedBy;
  
  // Set specific fields based on status
  switch (newStatus) {
    case 'Reviewed':
      this.reviewedBy = updatedBy;
      this.reviewedAt = new Date();
      if (notes) this.reviewNotes = notes;
      break;
    case 'Rejected':
      this.rejectedBy = updatedBy;
      this.rejectedAt = new Date();
      if (notes) this.rejectionReason = notes;
      break;
    case 'Selected':
      this.selectedBy = updatedBy;
      this.selectedAt = new Date();
      if (notes) this.selectionNotes = notes;
      break;
  }
  
  return this.save();
};

// Method to advance to next interview round
applicationSchema.methods.advanceToNextRound = function(updatedBy) {
  this.currentInterviewRound += 1;
  this.status = `Interview Round ${this.currentInterviewRound}`;
  this.lastUpdatedBy = updatedBy;
  return this.save();
};

// Static method to get applications by job
applicationSchema.statics.getByJob = function(jobId, filters = {}) {
  const query = { job: jobId, ...filters };
  return this.find(query)
    .populate('job', 'title code department')
    .populate('reviewedBy', 'firstName lastName')
    .populate('rejectedBy', 'firstName lastName')
    .populate('selectedBy', 'firstName lastName')
    .populate('referredBy', 'firstName lastName')
    .sort({ submittedAt: -1 });
};

// Static method to get applications by status
applicationSchema.statics.getByStatus = function(status, filters = {}) {
  const query = { status, ...filters };
  return this.find(query)
    .populate('job', 'title code department')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ submittedAt: -1 });
};

// Static method to check if user has already applied
applicationSchema.statics.hasApplied = function(email, jobId) {
  return this.findOne({
    email: email.toLowerCase(),
    job: jobId,
    isActive: true
  });
};

// Transform output
applicationSchema.methods.toJSON = function() {
  const applicationObject = this.toObject();
  return applicationObject;
};

module.exports = mongoose.model('Application', applicationSchema);
