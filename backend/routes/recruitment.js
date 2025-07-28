const express = require('express');
const router = express.Router();
const { auth, roleAccess } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');
const recruitmentController = require('../controllers/recruitmentController');

// ==================== JOB MANAGEMENT ROUTES ====================

// Get all jobs (HR Manager only)
router.get('/jobs', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getJobs
);

// Get single job (HR Manager only)
router.get('/jobs/:id', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getJob
);

// Create new job (HR Manager only)
router.post('/jobs', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.createJob
);

// Update job (HR Manager only)
router.put('/jobs/:id', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.updateJob
);

// Publish job (HR Manager only)
router.patch('/jobs/:id/publish', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.publishJob
);

// Close job (HR Manager only)
router.patch('/jobs/:id/close', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.closeJob
);

// ==================== PUBLIC JOB ROUTES ====================

// Get public job details (no auth required)
router.get('/public/jobs/:id', 
  recruitmentController.getPublicJob
);

// Submit job application (no auth required)
router.post('/public/jobs/:jobId/apply', 
  resumeUpload.single('resume'),
  recruitmentController.submitApplication
);

// ==================== APPLICATION MANAGEMENT ROUTES ====================

// Get all applications (HR Manager only)
router.get('/applications', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getAllApplications
);

// Get applications for a job (HR Manager only)
router.get('/jobs/:jobId/applications', 
  auth, 
  recruitmentController.getApplications
);

// Get single application (HR Manager only)
router.get('/applications/:id', 
  auth, 
  recruitmentController.getApplication
);

// Update application status (HR Manager only)
router.patch('/applications/:id/status', 
  auth, 
  recruitmentController.updateApplicationStatus
);

// Send rejection email with reason (HR Manager only)
router.post('/applications/:id/reject', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.sendRejectionEmail
);

// Download resume (HR Manager only)
router.get('/applications/:applicationId/resume', 
  auth, 
  recruitmentController.downloadResume
);

// ==================== INTERVIEW MANAGEMENT ROUTES ====================

// Schedule interview (HR roles only)
router.post('/applications/:applicationId/interviews', 
  auth, 
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']),
  recruitmentController.scheduleInterview
);

// Get all interviews (HR Manager only)
router.get('/interviews', 
  auth, 
  recruitmentController.getInterviews
);

// Get interviewer's interviews (Interviewer access)
router.get('/interviews/my-interviews', 
  auth, 
  recruitmentController.getInterviewerInterviews
);

// Update interview status (HR Manager and Interviewer)
router.patch('/interviews/:id/status', 
  auth, 
  recruitmentController.updateInterviewStatus
);

// Reschedule interview (HR Manager only)
router.patch('/interviews/:id/reschedule', 
  auth, 
  recruitmentController.rescheduleInterview
);

// ==================== INTERVIEW FEEDBACK ROUTES ====================

// Submit interview feedback (Interviewer only)
router.post('/interviews/:interviewId/feedback', 
  auth, 
  recruitmentController.submitFeedback
);

// Get feedback for application (HR Manager only)
router.get('/applications/:applicationId/feedback', 
  auth, 
  recruitmentController.getApplicationFeedback
);

// Get interviewer's feedback (Interviewer access)
router.get('/feedback/my-feedback', 
  auth, 
  recruitmentController.getInterviewerFeedback
);

// ==================== OFFER MANAGEMENT ROUTES ====================

// Generate offer letter (HR Manager only)
router.post('/applications/:applicationId/offers', 
  auth, 
  recruitmentController.generateOffer
);

// Get all offers (HR Manager only)
router.get('/offers', 
  auth, 
  recruitmentController.getOffers
);

// Send offer (HR Manager only)
router.patch('/offers/:id/send', 
  auth, 
  recruitmentController.sendOffer
);

// ==================== PUBLIC OFFER ROUTES ====================

// Get public offer (no auth required)
router.get('/public/offers/:token', 
  recruitmentController.getPublicOffer
);

// Respond to offer (no auth required)
router.post('/public/offers/:token/respond', 
  recruitmentController.respondToOffer
);

// ==================== USER MANAGEMENT INTEGRATION ====================

// Add candidate to user management (HR Manager only)
router.post('/offers/:offerId/add-to-users', 
  auth, 
  recruitmentController.addToUserManagement
);

// ==================== DASHBOARD & ANALYTICS ROUTES ====================

// Get recruitment dashboard (HR Manager only)
router.get('/dashboard', 
  auth, 
  recruitmentController.getDashboard
);

// Get recruitment analytics (HR Manager only)
router.get('/analytics', 
  auth, 
  recruitmentController.getAnalytics
);

// ==================== UTILITY ROUTES ====================

// Get all interviewers (HR roles only)
router.get('/interviewers', 
  auth, 
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']),
  recruitmentController.getInterviewers
);

// Get departments for job creation (HR Manager only)
router.get('/departments', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getDepartments
);

// Get teams by department (HR Manager only)
router.get('/teams/:departmentId', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getTeamsByDepartment
);

// Get hiring managers for job creation (HR Manager only)
router.get('/hiring-managers', 
  auth, 
  roleAccess(['HR Manager']),
  recruitmentController.getHiringManagers
);

module.exports = router;
