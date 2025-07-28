const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Department = require('../models/Department');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/beeja-hrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestJob() {
  try {
    console.log('Creating test job...');

    // Find or create a department
    let department = await Department.findOne({ name: 'Engineering' });
    if (!department) {
      department = new Department({
        name: 'Engineering',
        code: 'ENG',
        description: 'Software Development Department',
        isActive: true
      });
      await department.save();
      console.log('Created Engineering department');
    }

    // Find an admin user to be the hiring manager
    let admin = await User.findOne({ role: 'Admin' });
    if (!admin) {
      admin = new User({
        email: 'admin@company.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'Admin',
        isActive: true
      });
      await admin.save();
      console.log('Created admin user');
    }

    // Create a test job
    const testJob = new Job({
      title: 'React Developer',
      code: 'RD001',
      department: department._id,
      description: 'We are looking for a skilled React Developer to join our dynamic team. The ideal candidate will have experience in building modern web applications using React.js and related technologies.',
      requirements: {
        education: 'Bachelor\'s degree in Computer Science or related field',
        experience: { min: 2, max: 5 },
        skills: ['React.js', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'MongoDB'],
        certifications: ['React Certification (preferred)']
      },
      salary: {
        min: 400000,
        max: 800000,
        currency: 'INR'
      },
      employmentType: 'Full-time',
      workMode: 'Hybrid',
      location: 'Bangalore, India',
      openings: 3,
      priority: 'High',
      closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      hiringManager: admin._id,
      recruiter: admin._id,
      benefits: [
        'Health Insurance',
        'Flexible Working Hours',
        'Professional Development',
        'Work from Home Options'
      ],
      tags: ['React', 'Frontend', 'JavaScript', 'Remote'],
      isUrgent: false,
      isRemote: true,
      createdBy: admin._id,
      status: 'Active',
      postedDate: new Date()
    });

    await testJob.save();
    
    console.log('✅ Test job created successfully!');
    console.log(`Job ID: ${testJob._id}`);
    console.log(`Job Title: ${testJob.title}`);
    console.log(`Job Code: ${testJob.code}`);
    console.log(`Status: ${testJob.status}`);
    console.log(`Public Application URL: http://localhost:3000/apply/${testJob._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test job:', error);
    process.exit(1);
  }
}

createTestJob();
