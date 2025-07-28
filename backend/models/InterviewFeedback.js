const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
  // References
  interview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: [true, 'Interview reference is required']
  },
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
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Interviewer reference is required']
  },
  
  // Overall Assessment
  overallRating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [10, 'Rating cannot exceed 10']
  },
  recommendation: {
    type: String,
    enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire'],
    required: [true, 'Recommendation is required']
  },
  
  // Detailed Ratings
  technicalSkills: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  problemSolving: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  communication: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  culturalFit: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  leadership: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  motivation: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  
  // Specific Feedback Areas
  strengths: [{
    type: String,
    trim: true,
    maxlength: [200, 'Strength cannot exceed 200 characters']
  }],
  weaknesses: [{
    type: String,
    trim: true,
    maxlength: [200, 'Weakness cannot exceed 200 characters']
  }],
  improvementAreas: [{
    type: String,
    trim: true,
    maxlength: [200, 'Improvement area cannot exceed 200 characters']
  }],
  
  // Interview Questions and Responses
  questionsAsked: [{
    question: {
      type: String,
      required: true,
      maxlength: [500, 'Question cannot exceed 500 characters']
    },
    category: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Situational', 'Company Culture', 'Role Specific']
    },
    candidateResponse: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }],
  
  // Overall Comments
  detailedFeedback: {
    type: String,
    required: [true, 'Detailed feedback is required'],
    maxlength: [2000, 'Detailed feedback cannot exceed 2000 characters']
  },
  interviewerNotes: {
    type: String,
    maxlength: [1000, 'Interviewer notes cannot exceed 1000 characters']
  },
  
  // Candidate Behavior
  punctuality: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor']
  },
  preparedness: {
    type: String,
    enum: ['Well Prepared', 'Adequately Prepared', 'Somewhat Prepared', 'Unprepared']
  },
  professionalism: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor']
  },
  enthusiasm: {
    type: String,
    enum: ['Very Enthusiastic', 'Enthusiastic', 'Moderate', 'Low', 'Very Low']
  },
  
  // Technical Assessment (if applicable)
  codingSkills: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  systemDesign: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10']
    },
    comments: {
      type: String,
      maxlength: [1000, 'Comments cannot exceed 1000 characters']
    }
  },
  
  // Next Steps
  nextRoundRecommendation: {
    type: String,
    enum: ['Proceed to Next Round', 'Final Round', 'Make Offer', 'Reject', 'On Hold']
  },
  suggestedInterviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  additionalAssessments: [{
    type: String,
    trim: true
  }],
  
  // Salary Discussion (if applicable)
  salaryDiscussed: {
    type: Boolean,
    default: false
  },
  candidateExpectation: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  salaryNegotiable: {
    type: Boolean,
    default: true
  },
  
  // Availability and Joining
  noticePeriod: {
    type: String,
    enum: ['Immediate', '15 days', '1 month', '2 months', '3 months', 'More than 3 months']
  },
  availableForJoining: {
    type: Boolean,
    default: true
  },
  joiningConcerns: {
    type: String,
    maxlength: [500, 'Joining concerns cannot exceed 500 characters']
  },
  
  // Interview Quality
  interviewDuration: {
    type: Number, // in minutes
    min: [1, 'Duration must be at least 1 minute']
  },
  interviewQuality: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor']
  },
  technicalIssues: {
    type: Boolean,
    default: false
  },
  issueDescription: {
    type: String,
    maxlength: [300, 'Issue description cannot exceed 300 characters']
  },
  
  // Feedback Status
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Reviewed'],
    default: 'Draft'
  },
  submittedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  
  // HR Review
  hrComments: {
    type: String,
    maxlength: [1000, 'HR comments cannot exceed 1000 characters']
  },
  hrRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [10, 'Rating cannot exceed 10']
  },
  
  // System Fields
  feedbackNumber: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
interviewFeedbackSchema.index({ interview: 1 });
interviewFeedbackSchema.index({ application: 1 });
interviewFeedbackSchema.index({ job: 1 });
interviewFeedbackSchema.index({ interviewer: 1 });
interviewFeedbackSchema.index({ status: 1 });
interviewFeedbackSchema.index({ overallRating: 1 });
interviewFeedbackSchema.index({ recommendation: 1 });
interviewFeedbackSchema.index({ submittedAt: -1 });

// Virtual for average rating
interviewFeedbackSchema.virtual('averageRating').get(function() {
  const ratings = [];
  
  if (this.technicalSkills?.rating) ratings.push(this.technicalSkills.rating);
  if (this.problemSolving?.rating) ratings.push(this.problemSolving.rating);
  if (this.communication?.rating) ratings.push(this.communication.rating);
  if (this.culturalFit?.rating) ratings.push(this.culturalFit.rating);
  if (this.leadership?.rating) ratings.push(this.leadership.rating);
  if (this.motivation?.rating) ratings.push(this.motivation.rating);
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
});

// Pre-save middleware to generate feedback number
interviewFeedbackSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.feedbackNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Count feedback for this month
      const startOfMonth = new Date(year, new Date().getMonth(), 1);
      const endOfMonth = new Date(year, new Date().getMonth() + 1, 0);
      
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });
      
      const sequence = String(count + 1).padStart(4, '0');
      this.feedbackNumber = `FB${year}${month}${sequence}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to submit feedback
interviewFeedbackSchema.methods.submit = function() {
  this.status = 'Submitted';
  this.submittedAt = new Date();
  return this.save();
};

// Method to review feedback
interviewFeedbackSchema.methods.review = function(reviewedBy, hrComments, hrRating) {
  this.status = 'Reviewed';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (hrComments) this.hrComments = hrComments;
  if (hrRating) this.hrRating = hrRating;
  return this.save();
};

// Static method to get feedback by application
interviewFeedbackSchema.statics.getByApplication = function(applicationId) {
  return this.find({ application: applicationId })
    .populate('interview', 'round title type scheduledDate')
    .populate('interviewer', 'firstName lastName designation')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get feedback by interviewer
interviewFeedbackSchema.statics.getByInterviewer = function(interviewerId, filters = {}) {
  const query = { interviewer: interviewerId, ...filters };
  return this.find(query)
    .populate('application', 'firstName lastName applicationNumber')
    .populate('job', 'title code')
    .populate('interview', 'round type scheduledDate')
    .sort({ submittedAt: -1 });
};

// Static method to get feedback statistics
interviewFeedbackSchema.statics.getStatistics = function(filters = {}) {
  return this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: '$overallRating' },
        recommendationCounts: {
          $push: '$recommendation'
        }
      }
    },
    {
      $project: {
        totalFeedbacks: 1,
        averageRating: { $round: ['$averageRating', 1] },
        strongHire: {
          $size: {
            $filter: {
              input: '$recommendationCounts',
              cond: { $eq: ['$$this', 'Strong Hire'] }
            }
          }
        },
        hire: {
          $size: {
            $filter: {
              input: '$recommendationCounts',
              cond: { $eq: ['$$this', 'Hire'] }
            }
          }
        },
        maybe: {
          $size: {
            $filter: {
              input: '$recommendationCounts',
              cond: { $eq: ['$$this', 'Maybe'] }
            }
          }
        },
        noHire: {
          $size: {
            $filter: {
              input: '$recommendationCounts',
              cond: { $eq: ['$$this', 'No Hire'] }
            }
          }
        },
        strongNoHire: {
          $size: {
            $filter: {
              input: '$recommendationCounts',
              cond: { $eq: ['$$this', 'Strong No Hire'] }
            }
          }
        }
      }
    }
  ]);
};

// Transform output
interviewFeedbackSchema.methods.toJSON = function() {
  const feedbackObject = this.toObject();
  return feedbackObject;
};

module.exports = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
