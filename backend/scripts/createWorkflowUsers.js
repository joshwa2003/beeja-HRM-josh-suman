const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');

// Database connection
mongoose.connect('mongodb://localhost:27017/hrm_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createWorkflowUsers = async () => {
  try {
    console.log('Creating workflow users for regularization testing...');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // First, create a temporary admin user to use as createdBy
    let adminUser = await User.findOne({ role: 'Admin' });
    if (!adminUser) {
      adminUser = await User.findOne({ email: 'admin@company.com' });
    }
    
    if (!adminUser) {
      console.log('No admin user found, creating one...');
      adminUser = new User({
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@company.com',
        password: hashedPassword,
        role: 'Admin',
        employeeId: 'ADMIN001',
        isActive: true,
        isEmailVerified: true
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Get or create IT department
    let itDepartment = await Department.findOne({ name: 'IT' });
    if (!itDepartment) {
      itDepartment = new Department({
        name: 'IT',
        code: 'IT',
        description: 'Information Technology Department',
        isActive: true,
        createdBy: adminUser._id
      });
      await itDepartment.save();
      console.log('Created IT Department');
    }

    // Get or create HR department
    let hrDepartment = await Department.findOne({ name: 'HR' });
    if (!hrDepartment) {
      hrDepartment = new Department({
        name: 'HR',
        code: 'HR',
        description: 'Human Resources Department',
        isActive: true,
        createdBy: adminUser._id
      });
      await hrDepartment.save();
      console.log('Created HR Department');
    }

    // Create Team Leader
    const teamLeader = await User.findOneAndUpdate(
      { email: 'teamleader@company.com' },
      {
        firstName: 'Team',
        lastName: 'Leader',
        email: 'teamleader@company.com',
        password: hashedPassword,
        role: 'Team Leader',
        employeeId: 'TL001',
        department: itDepartment._id,
        isActive: true,
        isEmailVerified: true,
        personalInfo: {
          dateOfBirth: new Date('1985-01-15'),
          gender: 'Male',
          maritalStatus: 'Married',
          nationality: 'Indian',
          phone: '+91-9876543210',
          address: {
            street: '123 Team Leader Street',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001',
            country: 'India'
          }
        },
        workInfo: {
          designation: 'Team Leader',
          joiningDate: new Date('2020-01-01'),
          employmentType: 'Full-time',
          workLocation: 'Bangalore Office'
        }
      },
      { upsert: true, new: true }
    );
    console.log('Created/Updated Team Leader:', teamLeader.email);

    // Create Team Manager
    const teamManager = await User.findOneAndUpdate(
      { email: 'teammanager@company.com' },
      {
        firstName: 'Team',
        lastName: 'Manager',
        email: 'teammanager@company.com',
        password: hashedPassword,
        role: 'Team Manager',
        employeeId: 'TM001',
        department: itDepartment._id,
        isActive: true,
        isEmailVerified: true,
        personalInfo: {
          dateOfBirth: new Date('1980-05-20'),
          gender: 'Female',
          maritalStatus: 'Single',
          nationality: 'Indian',
          phone: '+91-9876543211',
          address: {
            street: '456 Manager Avenue',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560002',
            country: 'India'
          }
        },
        workInfo: {
          designation: 'Team Manager',
          joiningDate: new Date('2018-06-01'),
          employmentType: 'Full-time',
          workLocation: 'Bangalore Office'
        }
      },
      { upsert: true, new: true }
    );
    console.log('Created/Updated Team Manager:', teamManager.email);

    // Create HR Manager
    const hrManager = await User.findOneAndUpdate(
      { email: 'hrmanager@company.com' },
      {
        firstName: 'HR',
        lastName: 'Manager',
        email: 'hrmanager@company.com',
        password: hashedPassword,
        role: 'HR Manager',
        employeeId: 'HR001',
        department: hrDepartment._id,
        isActive: true,
        isEmailVerified: true,
        personalInfo: {
          dateOfBirth: new Date('1982-03-10'),
          gender: 'Male',
          maritalStatus: 'Married',
          nationality: 'Indian',
          phone: '+91-9876543212',
          address: {
            street: '789 HR Colony',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560003',
            country: 'India'
          }
        },
        workInfo: {
          designation: 'HR Manager',
          joiningDate: new Date('2019-03-01'),
          employmentType: 'Full-time',
          workLocation: 'Bangalore Office'
        }
      },
      { upsert: true, new: true }
    );
    console.log('Created/Updated HR Manager:', hrManager.email);

    // Update existing employee to report to Team Leader
    const employee = await User.findOneAndUpdate(
      { email: 'employee@company.com' },
      {
        reportingManager: teamLeader._id,
        department: itDepartment._id
      },
      { new: true }
    );
    
    if (employee) {
      console.log('Updated Employee reporting structure:', employee.email);
    }

    // Update sujith kumar to report to Team Leader
    const sujithEmployee = await User.findOneAndUpdate(
      { email: 'sumanrio99@gmail.com' },
      {
        reportingManager: teamLeader._id,
        department: itDepartment._id
      },
      { new: true }
    );
    
    if (sujithEmployee) {
      console.log('Updated Sujith Kumar reporting structure:', sujithEmployee.email);
    }

    console.log('\n=== Workflow Users Created Successfully ===');
    console.log('Team Leader: teamleader@company.com / password123');
    console.log('Team Manager: teammanager@company.com / password123');
    console.log('HR Manager: hrmanager@company.com / password123');
    console.log('\n=== Workflow Structure ===');
    console.log('Employee → Team Leader → Team Manager → HR Manager');
    console.log('\nAll users are now set up for testing the regularization workflow!');

  } catch (error) {
    console.error('Error creating workflow users:', error);
  } finally {
    mongoose.connection.close();
  }
};

createWorkflowUsers();
