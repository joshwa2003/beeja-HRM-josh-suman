const mongoose = require('mongoose');
const Application = require('./models/Application');
const Job = require('./models/Job');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://localhost:27017/beeja-hrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  // First, let's create a job if none exists
  let job = await Job.findOne();
  if (!job) {
    job = new Job({
      title: 'React Developer',
      code: 'RD001',
      description: 'We are looking for a skilled React Developer',
      requirements: {
        education: 'Bachelor\'s degree',
        experience: { min: 2, max: 5 },
        skills: ['React', 'JavaScript', 'HTML', 'CSS'],
        certifications: []
      },
      salary: {
        min: 50000,
        max: 80000,
        currency: 'INR'
      },
      employmentType: 'Full-time',
      workMode: 'On-site',
      location: 'Bangalore',
      openings: 2,
      priority: 'Medium',
      status: 'Active'
    });
    await job.save();
    console.log('Created test job:', job._id);
  }
  
  // Check if we have any resume files
  const resumeDir = path.join(__dirname, 'uploads', 'resumes');
  let resumeFiles = [];
  try {
    resumeFiles = fs.readdirSync(resumeDir).filter(file => file.endsWith('.pdf'));
  } catch (error) {
    console.log('No resume directory found');
  }
  
  if (resumeFiles.length > 0) {
    const resumeFile = resumeFiles[0];
    const resumePath = path.join(resumeDir, resumeFile);
    const stats = fs.statSync(resumePath);
    
    // Create a test application with this resume
    const application = new Application({
      firstName: 'Sankar',
      lastName: 'S',
      email: 'backupmemory2003@gmail.com',
      phoneNumber: '9876543210',
      job: job._id,
      yearsOfExperience: 5,
      currentCompany: 'beeja',
      currentDesignation: 'beeja',
      currentSalary: 500000,
      expectedSalary: 600000,
      noticePeriod: '1 month',
      willingToRelocate: false,
      location: 'chennai',
      education: {
        degree: 'Bachelor of Engineering',
        specialization: 'Computer Science',
        university: 'Anna University',
        graduationYear: 2020,
        percentage: 85
      },
      technicalSkills: ['React', 'JavaScript', 'Node.js'],
      certifications: [{
        name: 'React Developer Certification',
        issuingOrganization: 'Meta',
        issueDate: new Date('2023-01-01'),
        expiryDate: new Date('2025-01-01')
      }],
      coverLetter: 'vgv',
      resume: {
        filename: resumeFile,
        originalName: 'Joshwa A (Resume) (1).pdf',
        path: `uploads/resumes/${resumeFile}`,
        size: stats.size,
        mimeType: 'application/pdf'
      },
      status: 'Pending'
    });
    
    await application.save();
    console.log('Created test application with resume:', application._id);
    console.log('Resume file:', resumeFile);
    console.log('Resume path:', application.resume.path);
  } else {
    console.log('No resume files found to create test application');
  }
  
  // List all applications
  const apps = await Application.find({}).populate('job', 'title');
  console.log('\nAll applications:');
  apps.forEach((app, index) => {
    console.log(`${index + 1}. ${app.firstName} ${app.lastName} (${app._id})`);
    console.log(`   Job: ${app.job?.title || 'No job'}`);
    console.log(`   Resume: ${app.resume ? 'Yes' : 'No'}`);
    if (app.resume) {
      console.log(`   Resume path: ${app.resume.path}`);
    }
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
