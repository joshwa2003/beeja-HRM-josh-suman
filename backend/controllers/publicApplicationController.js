const Job = require('../models/Job');
const Application = require('../models/Application');
const OfferLetter = require('../models/OfferLetter');
const Department = require('../models/Department');
const User = require('../models/User');
const emailService = require('../services/emailService');
const path = require('path');

class PublicApplicationController {
  // Get public job details for application
  async getPublicJob(req, res) {
    try {
      const { jobId } = req.params;
      
      // Find the job directly instead of using the static method
      const job = await Job.findById(jobId)
        .populate('department', 'name')
        .populate('hiringManager', 'firstName lastName');
      
      if (!job) {
        return res.status(404).json({ 
          message: 'Job not found or no longer accepting applications' 
        });
      }

      // Check if job is active and accepting applications
      if (job.status !== 'Active') {
        return res.status(400).json({ 
          message: 'This job is no longer accepting applications' 
        });
      }

      // Check if closing date has passed
      if (job.closingDate && new Date() > job.closingDate) {
        return res.status(400).json({ 
          message: 'Job application deadline has passed' 
        });
      }

      // Return job data in the expected format
      const jobData = {
        _id: job._id,
        title: job.title,
        code: job.code,
        department: job.department,
        description: job.description,
        requirements: job.requirements,
        salary: job.salary,
        employmentType: job.employmentType,
        workMode: job.workMode,
        location: job.location,
        openings: job.openings,
        postedDate: job.postedDate,
        closingDate: job.closingDate,
        benefits: job.benefits,
        tags: job.tags,
        isAcceptingApplications: true
      };

      res.json({ 
        job: jobData 
      });
    } catch (error) {
      console.error('Error fetching public job:', error);
      res.status(500).json({ 
        message: 'Error fetching job details', 
        error: error.message 
      });
    }
  }

  // Submit job application
  async submitApplication(req, res) {
    try {
      const { jobId } = req.params;
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        currentLocation,
        linkedinProfile,
        portfolioWebsite,
        currentCompany,
        currentDesignation,
        totalExperience,
        relevantExperience,
        currentSalary,
        expectedSalary,
        noticePeriod,
        education,
        skills,
        certifications,
        coverLetter,
        whyInterested,
        availability,
        applicationSource = 'Direct Application'
      } = req.body;

      // Validate job exists and is accepting applications
      const job = await Job.findById(jobId)
        .populate('department', 'name');

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (!job.isAcceptingApplications()) {
        return res.status(400).json({ 
          message: 'This job is no longer accepting applications' 
        });
      }

      // Check if user has already applied
      const existingApplication = await Application.hasApplied(email, jobId);
      if (existingApplication) {
        return res.status(400).json({ 
          message: 'You have already applied for this position' 
        });
      }

      // Handle resume upload
      let resumeData = null;
      if (req.file) {
        resumeData = {
          originalName: req.file.originalname,
          fileName: req.file.filename,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
          size: req.file.size
        };
      }

      // Create application
      const application = new Application({
        job: jobId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        currentLocation: currentLocation ? currentLocation.trim() : '',
        linkedinUrl: linkedinProfile ? linkedinProfile.trim() : '',
        portfolioUrl: portfolioWebsite ? portfolioWebsite.trim() : '',
        currentCompany: currentCompany ? currentCompany.trim() : '',
        currentDesignation: currentDesignation ? currentDesignation.trim() : '',
        resume: resumeData,
        yearsOfExperience: totalExperience === 'fresher' || totalExperience === '0' ? 0 : 
                          totalExperience === '10+' ? 10 : 
                          totalExperience.includes('-') ? parseInt(totalExperience.split('-')[1]) : 
                          parseInt(totalExperience) || 0,
        currentSalary: currentSalary ? parseFloat(currentSalary.replace(/[^0-9.]/g, '')) : undefined,
        expectedSalary: expectedSalary ? parseFloat(expectedSalary.replace(/[^0-9.]/g, '')) : undefined,
        noticePeriod: noticePeriod === 'immediate' ? 'Immediate' :
                     noticePeriod === '15days' ? '15 days' :
                     noticePeriod === '1month' ? '1 month' :
                     noticePeriod === '2months' ? '2 months' :
                     noticePeriod === '3months' ? '3 months' : '1 month',
        education: education ? { degree: education.trim() } : undefined,
        technicalSkills: Array.isArray(skills) 
          ? skills.map(skill => skill.trim()).filter(skill => skill)
          : skills ? skills.split(',').map(skill => skill.trim()).filter(skill => skill) : [],
        certifications: certifications ? [{ name: certifications.trim() }] : [],
        coverLetter: coverLetter ? coverLetter.trim() : '',
        applicationSource
      });

      await application.save();

      // Send confirmation email to candidate
      try {
        await emailService.sendApplicationConfirmation(application, job);
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the application submission if email fails
      }

      res.status(201).json({
        message: 'Application submitted successfully',
        applicationId: application._id,
        status: application.status
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      
      // Clean up uploaded file if application fails
      if (req.file) {
        try {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }

      res.status(400).json({ 
        message: 'Error submitting application', 
        error: error.message 
      });
    }
  }

  // Get application status (for candidates to check)
  async getApplicationStatus(req, res) {
    try {
      const { email, jobId } = req.query;

      if (!email || !jobId) {
        return res.status(400).json({ 
          message: 'Email and job ID are required' 
        });
      }

      const application = await Application.findOne({
        email: email.toLowerCase(),
        job: jobId,
        isActive: true
      })
      .populate('job', 'title code')
      .select('status appliedAt firstName lastName');

      if (!application) {
        return res.status(404).json({ 
          message: 'No application found for this email and job' 
        });
      }

      res.json({
        application: {
          _id: application._id,
          status: application.status,
          appliedAt: application.appliedAt,
          candidateName: `${application.firstName} ${application.lastName}`,
          jobTitle: application.job.title,
          jobCode: application.job.code
        }
      });
    } catch (error) {
      console.error('Error fetching application status:', error);
      res.status(500).json({ 
        message: 'Error fetching application status', 
        error: error.message 
      });
    }
  }

  // Get offer letter by secure token
  async getOfferLetter(req, res) {
    try {
      const { token } = req.params;

      const offerLetter = await OfferLetter.findByToken(token);

      if (!offerLetter) {
        return res.status(404).json({ 
          message: 'Offer letter not found or expired' 
        });
      }

      // Mark as viewed if not already viewed
      if (offerLetter.status === 'Sent') {
        await offerLetter.markViewed();
      }

      res.json({
        offerLetter: offerLetter.toPublicJSON()
      });
    } catch (error) {
      console.error('Error fetching offer letter:', error);
      res.status(500).json({ 
        message: 'Error fetching offer letter', 
        error: error.message 
      });
    }
  }

  // Download offer letter PDF
  async downloadOfferLetter(req, res) {
    try {
      const { token } = req.params;

      const offerLetter = await OfferLetter.findByToken(token);

      if (!offerLetter) {
        return res.status(404).json({ 
          message: 'Offer letter not found or expired' 
        });
      }

      if (!offerLetter.document || !offerLetter.document.filePath) {
        return res.status(404).json({ 
          message: 'Offer letter document not found' 
        });
      }

      const filePath = path.resolve(offerLetter.document.filePath);
      const fs = require('fs');

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          message: 'Offer letter file not found' 
        });
      }

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${offerLetter.document.fileName}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading offer letter:', error);
      res.status(500).json({ 
        message: 'Error downloading offer letter', 
        error: error.message 
      });
    }
  }

  // Respond to offer letter (accept/reject)
  async respondToOffer(req, res) {
    try {
      const { token } = req.params;
      const { decision, comments } = req.body; // decision: 'accept' or 'reject'

      if (!decision || !['accept', 'reject'].includes(decision)) {
        return res.status(400).json({ 
          message: 'Valid decision (accept/reject) is required' 
        });
      }

      const offerLetter = await OfferLetter.findByToken(token)
        .populate('application');

      if (!offerLetter) {
        return res.status(404).json({ 
          message: 'Offer letter not found or expired' 
        });
      }

      if (!offerLetter.isValid) {
        return res.status(400).json({ 
          message: 'Offer letter has expired' 
        });
      }

      if (offerLetter.status === 'Accepted' || offerLetter.status === 'Rejected') {
        return res.status(400).json({ 
          message: 'You have already responded to this offer' 
        });
      }

      // Get request metadata
      const metadata = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      // Update offer letter and application
      if (decision === 'accept') {
        await offerLetter.accept(comments, metadata);
        await offerLetter.application.handleOfferResponse(true);
        
        res.json({
          message: 'Offer accepted successfully! Welcome to the team!',
          status: 'Accepted'
        });
      } else {
        await offerLetter.reject(comments, metadata);
        await offerLetter.application.handleOfferResponse(false);
        
        res.json({
          message: 'Offer declined. Thank you for your time.',
          status: 'Rejected'
        });
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      res.status(400).json({ 
        message: 'Error processing your response', 
        error: error.message 
      });
    }
  }

  // Get all active public jobs (for job listing page)
  async getPublicJobs(req, res) {
    try {
      const { 
        department, 
        location, 
        employmentType, 
        workMode,
        search,
        page = 1, 
        limit = 10 
      } = req.query;

      // Build query for active jobs
      const query = { 
        status: 'Active',
        $or: [
          { closingDate: { $gte: new Date() } },
          { closingDate: null }
        ]
      };

      if (department) query.department = department;
      if (location) query.location = { $regex: location, $options: 'i' };
      if (employmentType) query.employmentType = employmentType;
      if (workMode) query.workMode = workMode;
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { 'requirements.skills': { $regex: search, $options: 'i' } }
          ]
        });
      }

      const skip = (page - 1) * limit;

      const jobs = await Job.find(query)
        .populate('department', 'name')
        .select('title code department description requirements salary employmentType workMode location openings postedDate closingDate benefits tags')
        .sort({ postedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Job.countDocuments(query);

      const publicJobs = jobs.map(job => job.toPublicJSON());

      res.json({
        jobs: publicJobs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      console.error('Error fetching public jobs:', error);
      res.status(500).json({ 
        message: 'Error fetching jobs', 
        error: error.message 
      });
    }
  }

  // Get departments for filtering
  async getDepartments(req, res) {
    try {
      const Department = require('../models/Department');
      
      const departments = await Department.find({ isActive: true })
        .select('name description')
        .sort({ name: 1 });

      res.json({ departments });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ 
        message: 'Error fetching departments', 
        error: error.message 
      });
    }
  }
}

module.exports = new PublicApplicationController();
