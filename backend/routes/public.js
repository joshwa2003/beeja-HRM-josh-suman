const express = require('express');
const router = express.Router();
const publicApplicationController = require('../controllers/publicApplicationController');
const upload = require('../middleware/upload');

// ==================== PUBLIC JOB ROUTES ====================

// Get all active public jobs (for job listing page)
router.get('/jobs', publicApplicationController.getPublicJobs);

// Get departments for filtering
router.get('/departments', publicApplicationController.getDepartments);

// Get public job details for application
router.get('/jobs/:jobId', publicApplicationController.getPublicJob);

// Submit job application (with resume upload)
router.post('/jobs/:jobId/apply', upload.resumeUpload.single('resume'), publicApplicationController.submitApplication);

// Get application status (for candidates to check)
router.get('/application-status', publicApplicationController.getApplicationStatus);

// ==================== OFFER LETTER ROUTES ====================

// Get offer letter by secure token
router.get('/offer/:token', publicApplicationController.getOfferLetter);

// Download offer letter PDF
router.get('/offer/:token/download', publicApplicationController.downloadOfferLetter);

// Respond to offer letter (accept/reject)
router.post('/offer/:token/respond', publicApplicationController.respondToOffer);

module.exports = router;
