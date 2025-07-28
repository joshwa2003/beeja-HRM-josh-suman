orequire('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const resetEmployeePassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the employee account
    const employee = await User.findOne({ email: 'employee@company.com' });
    if (!employee) {
      console.log('Employee account not found');
      return;
    }

    console.log('Found employee account:', employee.firstName, employee.lastName);

    // Set the new password (let the pre-save middleware handle hashing)
    const newPassword = 'password123';
    employee.password = newPassword;
    await employee.save();

    console.log('Password updated successfully');
    console.log('New login credentials:');
    console.log('Email: employee@company.com');
    console.log('Password: password123');

    // Test the new password
    const isValid = await bcrypt.compare(newPassword, employee.password);
    console.log('Password verification test:', isValid ? 'PASSED' : 'FAILED');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
};

resetEmployeePassword();
