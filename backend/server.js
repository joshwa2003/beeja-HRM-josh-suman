const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const salaryStructureRoutes = require('./routes/salaryStructure');
const reimbursementRoutes = require('./routes/reimbursements');
const systemRoutes = require('./routes/system');
const regularizationRoutes = require('./routes/regularization');
const regularizationHRRoutes = require('./routes/regularizationHR');
const regularizationTeamLeaderRoutes = require('./routes/regularizationTeamLeader');
const regularizationTeamManagerRoutes = require('./routes/regularizationTeamManager');
const regularizationVPRoutes = require('./routes/regularizationVP');
const notificationRoutes = require('./routes/notifications');
const permissionRoutes = require('./routes/permissions');

const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Increase payload size limits for file uploads (profile photos, documents)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Initialize system data in correct order after database connection is established
  try {
    console.log('Starting system initialization...');
    
    // Step 1: Ensure system admin user exists
    const createAdminUser = require('./scripts/createAdmin');
    await createAdminUser();
    
    // Step 2: Create departments (requires admin user for createdBy field)
    const createDepartments = require('./scripts/createDepartments');
    await createDepartments();
    
    // Step 3: Create dummy users (requires departments to exist)
    const createDummyUsers = require('./scripts/createDummyUsers');
    await createDummyUsers();
    
    // Step 4: Initialize system settings (work hours, etc.)
    const initializeSystemSettings = require('./scripts/initializeSystemSettings');
    await initializeSystemSettings();
    
    console.log('System initialization completed successfully');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
})
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/regularization', regularizationRoutes);
app.use('/api/regularization-hr', regularizationHRRoutes);
app.use('/api/regularization-team-leader', regularizationTeamLeaderRoutes);
app.use('/api/regularization-team-manager', regularizationTeamManagerRoutes);
app.use('/api/regularization-vp', regularizationVPRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/permissions', permissionRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'HRM Backend Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
  
  // Start background services after server is running
  try {
    console.log('Starting background services...');
    
    // Start auto-checkout scheduler
    const autoCheckoutScheduler = require('./services/autoCheckoutScheduler');
    autoCheckoutScheduler.start();
    
    // Start notification service
    const notificationService = require('./services/notificationService');
    notificationService.start();
    
    console.log('✅ All background services started successfully');
  } catch (error) {
    console.error('❌ Error starting background services:', error);
  }
});
