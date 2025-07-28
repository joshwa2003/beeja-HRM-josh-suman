const mongoose = require('mongoose');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const InterviewFeedback = require('../models/InterviewFeedback');
const Offer = require('../models/Offer');
const User = require('../models/User');
const Department = require('../models/Department');
const Team = require('../models/Team');
const path = require('path');
const fs = require('fs').promises;

// ==================== JOB MANAGEMENT ====================

// Get all jobs
exports.getJobs = async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const jobs = await Job.find(query)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('hiringManager', 'firstName lastName email')
      .populate('recruiter', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Job.countDocuments(query);
    
    res.json({
      success: true,
      data: jobs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message
    });
  }
};

// Get single job
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('hiringManager', 'firstName lastName email designation')
      .populate('recruiter', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
};

// Create new job
exports.createJob = async (req, res) => {
  try {
    console.log('=== CREATE JOB DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', req.user.id);
    
    const jobData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    // Clean up empty string values for ObjectId fields
    if (jobData.team === '') {
      delete jobData.team;
    }
    if (jobData.hiringManager === '') {
      delete jobData.hiringManager;
    }
    if (jobData.recruiter === '') {
      delete jobData.recruiter;
    }
    if (jobData.closingDate === '') {
      delete jobData.closingDate;
    }
    
    console.log('Job data to save:', JSON.stringify(jobData, null, 2));
    
    const job = new Job(jobData);
    
    // Validate before saving
    const validationError = job.validateSync();
    if (validationError) {
      console.log('Validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationError.message,
        details: validationError.errors
      });
    }
    
    await job.save();
    console.log('Job saved successfully:', job._id);
    
    await job.populate([
      { path: 'department', select: 'name' },
      { path: 'team', select: 'name' },
      { path: 'hiringManager', select: 'firstName lastName email' },
      { path: 'recruiter', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Job code already exists',
        error: 'Duplicate job code'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating job',
      error: error.message,
      details: error.errors || {}
    });
  }
};

// Update job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    Object.assign(job, req.body);
    job.updatedBy = req.user.id;
    await job.save();
    
    await job.populate([
      { path: 'department', select: 'name' },
      { path: 'team', select: 'name' },
      { path: 'hiringManager', select: 'firstName lastName email' },
      { path: 'recruiter', select: 'firstName lastName email' }
    ]);
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};

// Publish job
exports.publishJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    await job.publish(req.user.id);
    
    res.json({
      success: true,
      message: 'Job published successfully',
      data: job
    });
  } catch (error) {
    console.error('Error publishing job:', error);
    res.status(400).json({
      success: false,
      message: 'Error publishing job',
      error: error.message
    });
  }
};

// Close job
exports.closeJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    await job.close(req.user.id, reason);
    
    res.json({
      success: true,
      message: 'Job closed successfully',
      data: job
    });
  } catch (error) {
    console.error('Error closing job:', error);
    res.status(400).json({
      success: false,
      message: 'Error closing job',
      error: error.message
    });
  }
};

// Get public job details (for application form)
exports.getPublicJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('department', 'name')
      .populate('team', 'name')
      .select('-createdBy -updatedBy -hiringManager -recruiter');
    
    if (!job || job.status !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'Job not found or not available'
      });
    }
    
    // Check if job is still open
    if (job.closingDate && new Date() > job.closingDate) {
      return res.status(410).json({
        success: false,
        message: 'Job application deadline has passed'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error fetching public job:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job details',
      error: error.message
    });
  }
};

// ==================== APPLICATION MANAGEMENT ====================

// Get all applications across all jobs
exports.getAllApplications = async (req, res) => {
  try {
    const { status, job, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (job) query.job = job;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const applications = await Application.find(query)
      .populate('job', 'title code')
      .populate('reviewedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('selectedBy', 'firstName lastName')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Application.countDocuments(query);
    
    res.json({
      success: true,
      data: applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching all applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Submit job application (public endpoint)
exports.submitApplication = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'Job not found or not available'
      });
    }
    
    // Check if application deadline has passed
    if (job.closingDate && new Date() > job.closingDate) {
      return res.status(410).json({
        success: false,
        message: 'Job application deadline has passed'
      });
    }
    
    // Check for duplicate application
    const existingApplication = await Application.findOne({
      job: jobId,
      email: req.body.email.toLowerCase()
    });
    
    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    
    // Handle resume upload
    let resumeData = null;
    if (req.file) {
      resumeData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }
    
    const applicationData = {
      ...req.body,
      job: jobId,
      resume: resumeData
    };
    
    const application = new Application(applicationData);
    await application.save();
    
    await application.populate([
      { path: 'job', select: 'title code department' },
      { path: 'job.department', select: 'name' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationNumber: application.applicationNumber,
        submittedAt: application.submittedAt
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(400).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
};

// Get applications for a job
exports.getApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = { job: jobId };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const applications = await Application.find(query)
      .populate('job', 'title code')
      .populate('reviewedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('selectedBy', 'firstName lastName')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Application.countDocuments(query);
    
    res.json({
      success: true,
      data: applications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// Get single application
exports.getApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title code department requirements')
      .populate('reviewedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('selectedBy', 'firstName lastName')
      .populate('referredBy', 'firstName lastName');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    await application.updateStatus(status, req.user.id, notes);
    
    await application.populate([
      { path: 'job', select: 'title code' },
      { path: 'reviewedBy', select: 'firstName lastName' },
      { path: 'rejectedBy', select: 'firstName lastName' },
      { path: 'selectedBy', select: 'firstName lastName' }
    ]);
    
    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// Send rejection email with custom reason
exports.sendRejectionEmail = async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await Application.findById(req.params.id)
      .populate('job', 'title code');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check if there's an interview for this application to determine email type
    const interview = await Interview.findOne({ 
      application: application._id 
    }).sort({ round: -1 }); // Get the latest interview round
    
    // Send appropriate rejection email
    const emailService = require('../services/emailService');
    let emailResult;
    
    if (interview) {
      // Send interview rejection email if there was an interview
      emailResult = await emailService.sendInterviewRejectionEmail(
        application, 
        application.job, 
        interview, 
        reason
      );
    } else {
      // Send regular application rejection email
      emailResult = await emailService.sendRejectionEmail(
        application, 
        application.job, 
        reason
      );
    }
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send rejection email',
        error: emailResult.error
      });
    }
    
    // Update application status to Rejected
    await application.updateStatus('Rejected', req.user.id, reason);
    
    res.json({
      success: true,
      message: 'Rejection email sent successfully and application status updated',
      data: {
        applicationId: application._id,
        emailSent: true,
        messageId: emailResult.messageId
      }
    });
  } catch (error) {
    console.error('Error sending rejection email:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending rejection email',
      error: error.message
    });
  }
};

// ==================== INTERVIEW MANAGEMENT ====================

// Schedule interview
exports.scheduleInterview = async (req, res) => {
  try {
    console.log('=== SCHEDULE INTERVIEW DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Application ID:', req.params.applicationId);
    console.log('User ID:', req.user.id);
    
    const { applicationId } = req.params;
    
    // Validate application exists
    const application = await Application.findById(applicationId)
      .populate('job', 'title code department');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Validate required fields
    const requiredFields = ['type', 'scheduledDate', 'duration', 'mode', 'primaryInterviewer'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        error: 'Validation failed'
      });
    }
    
    // Validate interviewer exists
    const interviewer = await User.findById(req.body.primaryInterviewer);
    if (!interviewer) {
      return res.status(400).json({
        success: false,
        message: 'Selected interviewer not found',
        error: 'Invalid interviewer'
      });
    }
    
    // Validate date is not in the past
    const scheduledDateTime = new Date(req.body.scheduledDate);
    const now = new Date();
    
    console.log('Backend date validation:');
    console.log('Scheduled DateTime:', scheduledDateTime);
    console.log('Current DateTime:', now);
    console.log('Is scheduled date in past?', scheduledDateTime < now);
    
    // Add a small buffer (1 minute) to account for processing time
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    if (scheduledDateTime < oneMinuteAgo) {
      return res.status(400).json({
        success: false,
        message: 'Interview cannot be scheduled in the past',
        error: 'Invalid date'
      });
    }
    
    // Validate mode-specific requirements
    if (req.body.mode === 'Online' && !req.body.meetingLink) {
      return res.status(400).json({
        success: false,
        message: 'Meeting link is required for online interviews',
        error: 'Missing meeting link'
      });
    }
    
    if (req.body.mode === 'In-Person' && !req.body.location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required for in-person interviews',
        error: 'Missing location'
      });
    }
    
    // Ensure both interviewer and primaryInterviewer are set (model requires both)
    const interviewData = {
      ...req.body,
      application: applicationId,
      job: application.job._id,
      scheduledBy: req.user.id,
      interviewer: req.body.primaryInterviewer, // Ensure interviewer field is set
      primaryInterviewer: req.body.primaryInterviewer // Ensure primaryInterviewer field is set
    };
    
    console.log('Interview data to save:', JSON.stringify(interviewData, null, 2));
    
    const interview = new Interview(interviewData);
    
    // Validate before saving
    const validationError = interview.validateSync();
    if (validationError) {
      console.log('Validation error:', validationError);
      const errorMessages = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        error: validationError.message,
        details: validationError.errors
      });
    }
    
    await interview.save();
    console.log('Interview saved successfully:', interview._id);
    
    // Update application status
    await application.updateStatus(`Interview Round ${interview.round}`, req.user.id);
    
    await interview.populate([
      { path: 'application', select: 'firstName lastName email phoneNumber yearsOfExperience technicalSkills appliedAt' },
      { path: 'job', select: 'title code department' },
      { path: 'primaryInterviewer', select: 'firstName lastName email' },
      { path: 'additionalInterviewers', select: 'firstName lastName email' },
      { path: 'scheduledBy', select: 'firstName lastName' }
    ]);
    
    // Send email notifications
    try {
      const emailService = require('../services/emailService');
      
      // Send interview invitation to candidate
      console.log('Sending interview invitation to candidate...');
      await emailService.sendInterviewInvitation(interview, interview.application, interview.job);
      
      // Send notifications to all interviewers
      console.log('Sending notifications to interviewers...');
      const allInterviewerIds = req.body.allInterviewers || [interview.primaryInterviewer._id];
      
      // Fetch all interviewer details
      const allInterviewers = await User.find({ 
        _id: { $in: allInterviewerIds } 
      }).select('firstName lastName email');
      
      if (allInterviewers.length > 0) {
        const emailResult = await emailService.sendMultipleInterviewerNotifications(
          interview, 
          interview.application, 
          interview.job, 
          allInterviewers
        );
        
        console.log(`Email notifications sent: ${emailResult.totalSent} successful, ${emailResult.totalFailed} failed`);
        if (emailResult.totalFailed > 0) {
          console.error('Some email notifications failed:', emailResult.results.filter(r => !r.success));
        }
      }
      
      console.log('Email notifications process completed');
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the request if email fails, just log the error
    }
    
    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: interview
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate interview entry detected',
        error: 'Interview already exists for this application and round'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        error: error.message
      });
    }
    
    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format provided',
        error: 'Invalid data format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while scheduling interview',
      error: error.message
    });
  }
};

// Get interviews
exports.getInterviews = async (req, res) => {
  try {
    const { status, interviewer, date, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (interviewer) {
      query.$or = [
        { primaryInterviewer: interviewer },
        { additionalInterviewers: interviewer }
      ];
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.scheduledDate = { $gte: startDate, $lt: endDate };
    }
    
    const interviews = await Interview.find(query)
      .populate('application', 'firstName lastName email phoneNumber applicationNumber yearsOfExperience')
      .populate('job', 'title code')
      .populate('primaryInterviewer', 'firstName lastName email')
      .populate('additionalInterviewers', 'firstName lastName email')
      .populate('scheduledBy', 'firstName lastName')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get feedback for each interview
    const InterviewFeedback = require('../models/InterviewFeedback');
    const interviewsWithFeedback = await Promise.all(
      interviews.map(async (interview) => {
        const feedback = await InterviewFeedback.findOne({ 
          interview: interview._id 
        }).populate('interviewer', 'firstName lastName');
        
        // Transform feedback data structure to match frontend expectations
        let transformedFeedback = null;
        if (feedback) {
          transformedFeedback = {
            ...feedback.toObject(),
            // Map nested rating structure to flat structure expected by frontend
            technicalRating: feedback.technicalSkills?.rating || null,
            communicationRating: feedback.communication?.rating || null,
            problemSolvingRating: feedback.problemSolving?.rating || null,
            culturalFitRating: feedback.culturalFit?.rating || null,
            // Keep original nested structure for backward compatibility
            technicalSkills: feedback.technicalSkills,
            communication: feedback.communication,
            problemSolving: feedback.problemSolving,
            culturalFit: feedback.culturalFit,
            // Map other fields that might be expected
            overallComments: feedback.detailedFeedback || feedback.interviewerNotes || '',
            additionalNotes: feedback.interviewerNotes || ''
          };
        }
        
        return {
          ...interview.toObject(),
          feedback: transformedFeedback
        };
      })
    );
    
    const total = await Interview.countDocuments(query);
    
    res.json({
      success: true,
      data: interviewsWithFeedback,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interviews',
      error: error.message
    });
  }
};

// Get interviewer's interviews
exports.getInterviewerInterviews = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    let query = {
      $or: [
        { primaryInterviewer: req.user.id },
        { additionalInterviewers: req.user.id }
      ]
    };
    
    if (status) query.status = status;
    if (upcoming === 'true') {
      query.scheduledDate = { $gte: new Date() };
      query.status = { $in: ['Scheduled', 'Confirmed'] };
    }
    
    const interviews = await Interview.find(query)
      .populate('application', 'firstName lastName email phoneNumber applicationNumber yearsOfExperience')
      .populate('job', 'title code')
      .populate('primaryInterviewer', 'firstName lastName email')
      .populate('additionalInterviewers', 'firstName lastName email')
      .populate('scheduledBy', 'firstName lastName')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    // Get feedback for each interview
    const InterviewFeedback = require('../models/InterviewFeedback');
    const interviewsWithFeedback = await Promise.all(
      interviews.map(async (interview) => {
        const feedback = await InterviewFeedback.findOne({ 
          interview: interview._id,
          interviewer: req.user.id
        });
        
        // Transform feedback data structure to match frontend expectations
        let transformedFeedback = null;
        if (feedback) {
          transformedFeedback = {
            ...feedback.toObject(),
            // Map nested rating structure to flat structure expected by frontend
            technicalRating: feedback.technicalSkills?.rating || null,
            communicationRating: feedback.communication?.rating || null,
            problemSolvingRating: feedback.problemSolving?.rating || null,
            culturalFitRating: feedback.culturalFit?.rating || null,
            // Keep original nested structure for backward compatibility
            technicalSkills: feedback.technicalSkills,
            communication: feedback.communication,
            problemSolving: feedback.problemSolving,
            culturalFit: feedback.culturalFit,
            // Map other fields that might be expected
            overallComments: feedback.detailedFeedback || feedback.interviewerNotes || '',
            additionalNotes: feedback.interviewerNotes || ''
          };
        }
        
        return {
          ...interview.toObject(),
          feedback: transformedFeedback
        };
      })
    );
    
    res.json({
      success: true,
      data: interviewsWithFeedback
    });
  } catch (error) {
    console.error('Error fetching interviewer interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interviews',
      error: error.message
    });
  }
};

// Update interview status
exports.updateInterviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    interview.status = status;
    interview.lastUpdatedBy = req.user.id;
    
    if (status === 'In Progress') {
      interview.actualStartTime = new Date();
    } else if (status === 'Completed') {
      interview.actualEndTime = new Date();
      if (interview.actualStartTime) {
        interview.actualDuration = Math.round((interview.actualEndTime - interview.actualStartTime) / (1000 * 60));
      }
    }
    
    await interview.save();
    
    res.json({
      success: true,
      message: 'Interview status updated successfully',
      data: interview
    });
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating interview status',
      error: error.message
    });
  }
};

// Reschedule interview
exports.rescheduleInterview = async (req, res) => {
  try {
    const { newDate, newTime, reason } = req.body;
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    await interview.reschedule(new Date(newDate), newTime, reason, req.user.id);
    
    res.json({
      success: true,
      message: 'Interview rescheduled successfully',
      data: interview
    });
  } catch (error) {
    console.error('Error rescheduling interview:', error);
    res.status(400).json({
      success: false,
      message: 'Error rescheduling interview',
      error: error.message
    });
  }
};

// ==================== INTERVIEW FEEDBACK ====================

// Submit interview feedback
exports.submitFeedback = async (req, res) => {
  try {
    console.log('=== SUBMIT FEEDBACK DEBUG ===');
    console.log('Interview ID:', req.params.interviewId);
    console.log('User ID:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { interviewId } = req.params;
    
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      console.log('Interview not found');
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    console.log('Interview found:', interview._id);
    console.log('Primary interviewer:', interview.primaryInterviewer);
    console.log('Additional interviewers:', interview.additionalInterviewers);
    
    // Check if interviewer is authorized
    const isAuthorized = interview.primaryInterviewer.toString() === req.user.id ||
                        interview.additionalInterviewers.some(id => id.toString() === req.user.id);
    
    if (!isAuthorized) {
      console.log('User not authorized to provide feedback');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to provide feedback for this interview'
      });
    }
    
    // Check if feedback already exists (for new submissions only)
    const existingFeedback = await InterviewFeedback.findOne({
      interview: interviewId,
      interviewer: req.user.id
    });
    
    console.log('Existing feedback found:', !!existingFeedback);
    
    // Handle both data structures: nested objects (from recruitment InterviewSchedule) and flat properties (from interviewer InterviewSchedule)
    const {
      // Flat structure fields (from interviewer component)
      technicalRating,
      communicationRating,
      problemSolvingRating,
      culturalFitRating,
      overallRating,
      recommendation,
      overallComments,
      additionalNotes,
      strengths,
      weaknesses,
      // Nested structure fields (from recruitment component)
      technicalSkills,
      communication,
      problemSolving,
      culturalFit,
      detailedFeedback,
      interviewerNotes,
      // Other fields
      ...otherFields
    } = req.body;

    console.log('Extracted fields:');
    console.log('- technicalRating:', technicalRating);
    console.log('- communicationRating:', communicationRating);
    console.log('- problemSolvingRating:', problemSolvingRating);
    console.log('- culturalFitRating:', culturalFitRating);
    console.log('- technicalSkills:', technicalSkills);
    console.log('- communication:', communication);
    console.log('- problemSolving:', problemSolving);
    console.log('- culturalFit:', culturalFit);
    console.log('- overallRating:', overallRating);
    console.log('- recommendation:', recommendation);
    console.log('- overallComments length:', overallComments?.length);
    console.log('- detailedFeedback length:', detailedFeedback?.length);

    // Determine which data structure is being used and extract the comments field
    const commentsField = detailedFeedback || overallComments;
    const notesField = interviewerNotes || additionalNotes;

    // Validate required fields
    if (!overallRating || overallRating === 0) {
      console.log('Overall rating validation failed');
      return res.status(400).json({
        success: false,
        message: 'Overall rating is required and must be greater than 0'
      });
    }

    if (!recommendation || recommendation.trim() === '') {
      console.log('Recommendation validation failed');
      return res.status(400).json({
        success: false,
        message: 'Recommendation is required'
      });
    }

    if (!commentsField || commentsField.trim() === '') {
      console.log('Overall comments validation failed');
      return res.status(400).json({
        success: false,
        message: 'Overall comments are required'
      });
    }

    const feedbackData = {
      interview: interviewId,
      application: interview.application,
      job: interview.job,
      interviewer: req.user.id,
      // Required fields
      overallRating: parseInt(overallRating),
      recommendation: recommendation.trim(),
      detailedFeedback: commentsField.trim(),
      // Optional fields
      strengths: Array.isArray(strengths) ? strengths.filter(s => s && s.trim()) : [],
      weaknesses: Array.isArray(weaknesses) ? weaknesses.filter(w => w && w.trim()) : [],
      interviewerNotes: notesField ? notesField.trim() : '',
      // Copy other fields that might be present
      ...otherFields
    };

    // Handle nested rating objects (from recruitment component) or create them from flat properties (from interviewer component)
    if (technicalSkills && technicalSkills.rating) {
      feedbackData.technicalSkills = {
        rating: parseInt(technicalSkills.rating),
        comments: technicalSkills.comments || ''
      };
    } else if (technicalRating && technicalRating > 0) {
      feedbackData.technicalSkills = {
        rating: parseInt(technicalRating),
        comments: ''
      };
    }

    if (communication && communication.rating) {
      feedbackData.communication = {
        rating: parseInt(communication.rating),
        comments: communication.comments || ''
      };
    } else if (communicationRating && communicationRating > 0) {
      feedbackData.communication = {
        rating: parseInt(communicationRating),
        comments: ''
      };
    }

    if (problemSolving && problemSolving.rating) {
      feedbackData.problemSolving = {
        rating: parseInt(problemSolving.rating),
        comments: problemSolving.comments || ''
      };
    } else if (problemSolvingRating && problemSolvingRating > 0) {
      feedbackData.problemSolving = {
        rating: parseInt(problemSolvingRating),
        comments: ''
      };
    }

    if (culturalFit && culturalFit.rating) {
      feedbackData.culturalFit = {
        rating: parseInt(culturalFit.rating),
        comments: culturalFit.comments || ''
      };
    } else if (culturalFitRating && culturalFitRating > 0) {
      feedbackData.culturalFit = {
        rating: parseInt(culturalFitRating),
        comments: ''
      };
    }
    
    console.log('Feedback data to save:', JSON.stringify(feedbackData, null, 2));
    
    let feedback;
    
    if (existingFeedback) {
      // Update existing feedback
      console.log('Updating existing feedback');
      Object.assign(existingFeedback, feedbackData);
      feedback = existingFeedback;
      await feedback.submit();
    } else {
      // Create new feedback
      console.log('Creating new feedback');
      feedback = new InterviewFeedback(feedbackData);
      await feedback.submit();
    }
    
    console.log('Feedback saved successfully:', feedback._id);
    
    await feedback.populate([
      { path: 'interview', select: 'round title type scheduledDate' },
      { path: 'application', select: 'firstName lastName applicationNumber' },
      { path: 'job', select: 'title code' },
      { path: 'interviewer', select: 'firstName lastName designation' }
    ]);
    
    console.log('Feedback populated and ready to return');
    
    res.status(existingFeedback ? 200 : 201).json({
      success: true,
      message: existingFeedback ? 'Feedback updated successfully' : 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', errorMessages);
      console.log('Full validation error details:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        error: error.message,
        details: error.errors
      });
    }
    
    // Handle cast errors (invalid data types)
    if (error.name === 'CastError') {
      console.log('Cast error details:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid data format provided',
        error: 'Data type validation failed',
        field: error.path,
        value: error.value
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
};

// Get feedback for application
exports.getApplicationFeedback = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const feedback = await InterviewFeedback.getByApplication(applicationId);
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// Get interviewer's feedback
exports.getInterviewerFeedback = async (req, res) => {
  try {
    const { status } = req.query;
    let filters = {};
    
    if (status) filters.status = status;
    
    const feedback = await InterviewFeedback.getByInterviewer(req.user.id, filters);
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching interviewer feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// ==================== OFFER MANAGEMENT ====================

// Generate offer letter
exports.generateOffer = async (req, res) => {
  try {
    console.log('=== GENERATE OFFER DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Application ID:', req.params.applicationId);
    console.log('User ID:', req.user.id);
    
    const { applicationId } = req.params;
    
    const application = await Application.findById(applicationId)
      .populate('job', 'title code department team');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    if (application.status !== 'Selected') {
      return res.status(400).json({
        success: false,
        message: 'Application must be in Selected status to generate offer'
      });
    }
    
    // Check if offer already exists
    const existingOffer = await Offer.findOne({ application: applicationId });
    if (existingOffer) {
      return res.status(409).json({
        success: false,
        message: 'Offer already exists for this application'
      });
    }
    
    // Map frontend data to model structure
    const salaryAmount = parseInt(req.body.salary) || 0;
    const basicSalary = Math.floor(salaryAmount * 0.6); // 60% basic
    const hra = Math.floor(salaryAmount * 0.2); // 20% HRA
    const allowances = salaryAmount - basicSalary - hra; // Remaining as allowances
    
    const offerData = {
      application: applicationId,
      job: application.job._id,
      candidate: {
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phoneNumber: application.phoneNumber
      },
      designation: req.body.position || application.job.title,
      department: application.job.department,
      workLocation: req.body.workLocation || 'Office',
      employmentType: 'Full-time',
      workMode: 'On-site',
      salary: {
        basic: basicSalary,
        hra: hra,
        allowances: {
          transport: Math.floor(allowances * 0.3),
          medical: Math.floor(allowances * 0.2),
          special: Math.floor(allowances * 0.3),
          other: allowances - Math.floor(allowances * 0.8)
        },
        totalCTC: salaryAmount
      },
      proposedJoiningDate: new Date(req.body.joiningDate),
      validUntil: new Date(req.body.validUntil),
      benefits: {
        healthInsurance: { included: true },
        providentFund: { included: true },
        gratuity: { included: true },
        leavePolicy: {
          casual: 12,
          sick: 12,
          earned: 21
        },
        otherBenefits: req.body.benefits ? [req.body.benefits] : []
      },
      specialTerms: req.body.additionalTerms ? [req.body.additionalTerms] : [],
      generatedBy: req.user.id,
      status: 'Draft'
    };
    
    console.log('Offer data to save:', JSON.stringify(offerData, null, 2));
    
    const offer = new Offer(offerData);
    
    // Validate before saving
    const validationError = offer.validateSync();
    if (validationError) {
      console.log('Validation error:', validationError);
      const errorMessages = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        error: validationError.message,
        details: validationError.errors
      });
    }
    
    await offer.save();
    console.log('Offer saved successfully:', offer._id);
    
    await offer.populate([
      { path: 'application', select: 'firstName lastName applicationNumber' },
      { path: 'job', select: 'title code' },
      { path: 'department', select: 'name' },
      { path: 'generatedBy', select: 'firstName lastName' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Offer generated successfully',
      data: offer
    });
  } catch (error) {
    console.error('Error generating offer:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate offer detected',
        error: 'Offer already exists for this application'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        error: error.message
      });
    }
    
    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format provided',
        error: 'Invalid data format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating offer',
      error: error.message
    });
  }
};

// Get offers
exports.getOffers = async (req, res) => {
  try {
    console.log('=== GET OFFERS DEBUG ===');
    console.log('Query params:', req.query);
    
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status && status !== '') query.status = status;
    if (search && search !== '') {
      query.$or = [
        { 'candidate.firstName': { $regex: search, $options: 'i' } },
        { 'candidate.lastName': { $regex: search, $options: 'i' } },
        { 'candidate.email': { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const offers = await Offer.find(query)
      .populate('application', 'firstName lastName applicationNumber')
      .populate('job', 'title code')
      .populate('department', 'name')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Offer.countDocuments(query);
    
    console.log('Found offers:', offers.length);
    console.log('Total offers:', total);
    
    res.json({
      success: true,
      data: offers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching offers',
      error: error.message
    });
  }
};

// Send offer
exports.sendOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('application', 'firstName lastName email phoneNumber')
      .populate('job', 'title code');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Update offer status to Sent
    offer.status = 'Sent';
    offer.sentAt = new Date();
    offer.sentBy = req.user.id;
    await offer.save();
    
    // Send email with accept/reject buttons
    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendOfferLetter(offer, offer.application, offer.job);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send offer email',
        error: emailResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'Offer sent successfully',
      data: offer
    });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(400).json({
      success: false,
      message: 'Error sending offer',
      error: error.message
    });
  }
};

// Get public offer (for candidate response)
exports.getPublicOffer = async (req, res) => {
  try {
    console.log('=== GET PUBLIC OFFER DEBUG ===');
    console.log('Token (Offer ID):', req.params.token);
    
    const { token } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID format'
      });
    }
    
    // Find the offer
    const offer = await Offer.findById(token)
      .populate('job', 'title code')
      .populate('department', 'name')
      .select('-generatedBy -sentBy -lastUpdatedBy');
    
    console.log('Found offer:', offer ? 'Yes' : 'No');
    if (offer) {
      console.log('Offer status:', offer.status);
      console.log('Offer valid until:', offer.validUntil);
      console.log('Is expired:', offer.isExpired);
    }
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer letter not found'
      });
    }
    
    // Check if offer is in a valid status for candidate response
    const validStatuses = ['Draft', 'Generated', 'Sent', 'Viewed'];
    if (!validStatuses.includes(offer.status)) {
      console.log('Invalid status for response:', offer.status);
      return res.status(410).json({
        success: false,
        message: 'Offer is no longer available for response'
      });
    }
    
    // Check if offer has expired
    if (offer.isExpired) {
      console.log('Offer has expired');
      return res.status(410).json({
        success: false,
        message: 'Offer has expired'
      });
    }
    
    // Mark as viewed if first time accessing
    if (offer.status === 'Sent') {
      console.log('Marking offer as viewed');
      await offer.markAsViewed();
    }
    
    console.log('Returning offer data successfully');
    res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error('Error fetching public offer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching offer',
      error: error.message
    });
  }
};

// Respond to offer (public endpoint)
exports.respondToOffer = async (req, res) => {
  try {
    console.log('=== RESPOND TO OFFER DEBUG ===');
    console.log('Token (Offer ID):', req.params.token);
    console.log('Response:', req.body.response);
    
    const { token } = req.params;
    const { response, comments, negotiationPoints } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID format'
      });
    }
    
    const offer = await Offer.findById(token);
    
    console.log('Found offer:', offer ? 'Yes' : 'No');
    if (offer) {
      console.log('Offer status:', offer.status);
      console.log('Is expired:', offer.isExpired);
    }
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    // Check if offer is in a valid status for response
    const validStatuses = ['Draft', 'Generated', 'Sent', 'Viewed'];
    if (!validStatuses.includes(offer.status)) {
      console.log('Invalid status for response:', offer.status);
      return res.status(410).json({
        success: false,
        message: 'Offer is no longer available for response'
      });
    }
    
    if (offer.isExpired) {
      console.log('Offer has expired');
      return res.status(410).json({
        success: false,
        message: 'Offer has expired'
      });
    }
    
    console.log('Processing response:', response);
    
    switch (response) {
      case 'accept':
        await offer.acceptOffer(comments);
        // Update application status
        await Application.findByIdAndUpdate(offer.application, {
          status: 'Offer Accepted',
          lastUpdatedBy: offer.generatedBy
        });
        console.log('Offer accepted successfully');
        break;
      case 'reject':
        await offer.rejectOffer(comments);
        // Update application status
        await Application.findByIdAndUpdate(offer.application, {
          status: 'Offer Rejected',
          lastUpdatedBy: offer.generatedBy
        });
        console.log('Offer rejected successfully');
        break;
      case 'negotiate':
        await offer.requestNegotiation(negotiationPoints, comments);
        console.log('Negotiation requested successfully');
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid response type'
        });
    }
    
    res.json({
      success: true,
      message: `Offer ${response}ed successfully`,
      data: { status: offer.status }
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error responding to offer',
      error: error.message
    });
  }
};

// ==================== DASHBOARD & ANALYTICS ====================

// Get recruitment dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications,
      scheduledInterviews,
      pendingOffers
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'Active' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'Pending' }),
      Interview.countDocuments({ status: { $in: ['Scheduled', 'Confirmed'] } }),
      Offer.countDocuments({ status: { $in: ['Sent', 'Viewed'] } })
    ]);

    // Get recent applications
    const recentApplications = await Application.find()
      .populate('job', 'title code')
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('firstName lastName email applicationNumber submittedAt status');

    // Get upcoming interviews
    const upcomingInterviews = await Interview.find({
      scheduledDate: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
      .populate('application', 'firstName lastName')
      .populate('job', 'title')
      .populate('primaryInterviewer', 'firstName lastName')
      .sort({ scheduledDate: 1 })
      .limit(5);

    // Application status distribution
    const applicationStats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          activeJobs,
          totalApplications,
          pendingApplications,
          scheduledInterviews,
          pendingOffers
        },
        recentApplications,
        upcomingInterviews,
        applicationStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Get recruitment analytics
exports.getAnalytics = async (req, res) => {
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

    // Applications by month
    const applicationsByMonth = await Application.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Applications by job
    const applicationsByJob = await Application.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$job',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $project: {
          jobTitle: '$job.title',
          jobCode: '$job.code',
          count: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Interview feedback statistics
    const feedbackStats = await InterviewFeedback.getStatistics(dateFilter);

    res.json({
      success: true,
      data: {
        applicationsByMonth,
        applicationsByJob,
        feedbackStats: feedbackStats[0] || {}
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Get all interviewers (all members except regular employees)
exports.getInterviewers = async (req, res) => {
  try {
    // Include all roles except regular Employee
    const interviewers = await User.find({
      role: { $ne: 'Employee' },
      isActive: true
    })
      .select('firstName lastName email designation role team department')
      .populate('team', 'name')
      .populate('department', 'name')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: interviewers
    });
  } catch (error) {
    console.error('Error fetching interviewers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interviewers',
      error: error.message
    });
  }
};

// Get departments for job creation
exports.getDepartments = async (req, res) => {
  try {
    const Department = require('../models/Department');
    const departments = await Department.find({ isActive: true })
      .select('name code description')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message
    });
  }
};

// Get teams by department
exports.getTeamsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const teams = await Team.find({ 
      department: departmentId,
      isActive: true 
    })
      .select('name description')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

// Get hiring managers and recruiters for job creation
exports.getHiringManagers = async (req, res) => {
  try {
    const hiringManagers = await User.find({
      role: { $in: ['HR Manager', 'HR BP', 'Team Manager', 'Manager'] },
      isActive: true
    })
      .select('firstName lastName email designation role')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      data: hiringManagers
    });
  } catch (error) {
    console.error('Error fetching hiring managers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hiring managers',
      error: error.message
    });
  }
};

// Download resume
exports.downloadResume = async (req, res) => {
  try {
    console.log('=== DOWNLOAD RESUME DEBUG ===');
    console.log('Application ID:', req.params.applicationId);
    
    const application = await Application.findById(req.params.applicationId);
    console.log('Application found:', !!application);
    
    if (!application) {
      console.log('Application not found in database');
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    if (!application.resume) {
      console.log('No resume attached to application');
      return res.status(404).json({
        success: false,
        message: 'No resume found for this application'
      });
    }

    console.log('Resume data:', JSON.stringify(application.resume, null, 2));
    
    // Check if we have filename or path
    if (!application.resume.filename && !application.resume.path) {
      console.log('No filename or path found in resume data');
      return res.status(404).json({
        success: false,
        message: 'Resume file information is incomplete'
      });
    }
    
    // Try multiple path combinations
    const possiblePaths = [];
    
    // If we have a path field, use it
    if (application.resume.path) {
      possiblePaths.push(
        path.join(__dirname, '..', application.resume.path),
        path.join(__dirname, application.resume.path),
        application.resume.path
      );
    }
    
    // If we have a filename field, construct paths
    if (application.resume.filename) {
      possiblePaths.push(
        path.join(__dirname, '..', 'uploads', 'resumes', application.resume.filename)
      );
    }
    
    // Fallback: try to construct filename from originalName and application ID
    if (application.resume.originalName) {
      const fileExtension = path.extname(application.resume.originalName);
      const constructedFilename = `resume_${Date.now()}${fileExtension}`;
      possiblePaths.push(
        path.join(__dirname, '..', 'uploads', 'resumes', constructedFilename)
      );
    }
    
    let filePath = null;
    let fileExists = false;
    
    for (const testPath of possiblePaths) {
      console.log('Testing path:', testPath);
      try {
        await fs.access(testPath);
        filePath = testPath;
        fileExists = true;
        console.log('File found at:', testPath);
        break;
      } catch (error) {
        console.log('File not found at:', testPath);
      }
    }
    
    if (!fileExists) {
      console.log('Resume file not found at any expected location');
      return res.status(404).json({
        success: false,
        message: 'Resume file not found on server'
      });
    }

    console.log('Downloading file from:', filePath);
    console.log('Original filename:', application.resume.originalName);
    
    res.download(filePath, application.resume.originalName || 'resume.pdf');
  } catch (error) {
    console.error('Error downloading resume:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error downloading resume',
      error: error.message
    });
  }
};

// Add candidate to user management
exports.addToUserManagement = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      role = 'Employee', 
      department, 
      employeeId,
      phoneNumber,
      designation,
      joiningDate,
      isActive = true,
      teamId 
    } = req.body;
    
    const offer = await Offer.findById(offerId)
      .populate('application')
      .populate('department', 'name');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    if (offer.status !== 'Accepted') {
      return res.status(400).json({
        success: false,
        message: 'Offer must be accepted to add candidate to user management'
      });
    }
    
    if (offer.userAccountCreated) {
      return res.status(409).json({
        success: false,
        message: 'User account already created for this candidate'
      });
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    // Create user account with provided data
    const userData = {
      email: email || offer.candidate.email,
      password: tempPassword,
      firstName: firstName || offer.candidate.firstName,
      lastName: lastName || offer.candidate.lastName,
      phoneNumber: phoneNumber || offer.candidate.phoneNumber,
      role: role,
      department: department || offer.department,
      employeeId: employeeId,
      designation: designation || offer.designation,
      joiningDate: joiningDate || offer.actualJoiningDate || offer.proposedJoiningDate,
      isActive: isActive,
      createdBy: req.user.id
    };

    // Add team assignment if provided
    if (teamId) {
      userData.teamId = teamId;
    }
    
    const user = new User(userData);
    await user.save();

    // Populate user data for email
    await user.populate('department', 'name');
    
    // Update offer
    offer.userAccountCreated = true;
    offer.createdUserId = user._id;
    offer.onboardingInitiated = true;
    await offer.save();

    // Send welcome email with credentials
    try {
      const emailService = require('../services/emailService');
      const emailResult = await emailService.sendWelcomeEmailWithCredentials(user, tempPassword, offer);
      
      if (!emailResult.success) {
        console.error('Failed to send welcome email:', emailResult.error);
        // Don't fail the request if email fails, just log the error
      } else {
        console.log('Welcome email sent successfully to:', user.email);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      success: true,
      message: 'User account created successfully and welcome email sent',
      data: {
        userId: user._id,
        employeeId: user.employeeId,
        tempPassword: tempPassword,
        emailSent: true
      }
    });
  } catch (error) {
    console.error('Error adding to user management:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating user account',
      error: error.message
    });
  }
};
