const Regularization = require('../models/Regularization');
const User = require('../models/User');

// Get all regularization requests for HR (READ-ONLY)
const getAllRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is HR or VP
    const user = await User.findById(userId);
    if (!user || !['HR Manager', 'HR BP', 'HR Executive', 'Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel and Vice Presidents can access this resource.'
      });
    }

    const {
      status,
      requestType,
      employee,
      startDate,
      endDate,
      page = 1,
      limit = 100,
      sortBy = 'submittedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query - HR and VP can see:
    // 1. Team Manager requests (currentLevel: 'HR' and status: 'Pending') - for HR approval
    // 2. HR requests (currentLevel: 'VP/Admin' and status: 'Pending') - for VP approval
    // 3. All completed requests (status: 'Approved' or 'Rejected')
    // 4. Employee/TL requests that have been processed by Team Manager (for view only)
    let baseQuery = {
      $or: [
        { currentLevel: 'HR', status: 'Pending' }, // TM requests pending HR approval
        { currentLevel: 'VP/Admin', status: 'Pending' }, // HR requests pending VP approval
        { status: { $in: ['Approved', 'Rejected'] } }, // All completed requests
        { 
          currentLevel: 'Completed', 
          'teamManagerApproval.status': { $in: ['Approved', 'Rejected'] } 
        } // Employee/TL requests processed by TM
      ]
    };

    // Apply additional filters
    const additionalFilters = {};
    
    if (status) {
      additionalFilters.status = status;
    }
    
    if (requestType) {
      additionalFilters.requestType = requestType;
    }
    
    if (employee) {
      additionalFilters.employee = employee;
    }
    
    if (startDate || endDate) {
      additionalFilters.attendanceDate = {};
      if (startDate) additionalFilters.attendanceDate.$gte = new Date(startDate);
      if (endDate) additionalFilters.attendanceDate.$lte = new Date(endDate);
    }

    // Combine base query with additional filters
    const query = Object.keys(additionalFilters).length > 0 
      ? { $and: [baseQuery, additionalFilters] }
      : baseQuery;

    // Execute query
    const regularizations = await Regularization.find(query)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('finalApprover', 'firstName lastName')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Regularization.countDocuments(query);

    res.json({
      success: true,
      data: regularizations,
      count: regularizations.length,
      totalDocs: total,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get regularizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get regularization details for HR (READ-ONLY)
const getRegularizationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user is HR or VP
    const user = await User.findById(userId);
    if (!user || !['HR Manager', 'HR BP', 'HR Executive', 'Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel and Vice Presidents can access this resource.'
      });
    }

    const regularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('finalApprover', 'firstName lastName role')
      .populate('createdBy', 'firstName lastName');

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if HR should be able to see this request
    const canView = 
      regularization.currentLevel === 'HR' || // TM requests
      regularization.status === 'Approved' || // Completed requests
      regularization.status === 'Rejected' || // Completed requests
      (regularization.currentLevel === 'Completed' && 
       regularization.teamManagerApproval.status !== 'Pending'); // Employee/TL requests processed by TM

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'This request is not available for HR viewing yet'
      });
    }

    res.json({
      success: true,
      data: regularization
    });
  } catch (error) {
    console.error('Error fetching regularization details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularization details',
      error: error.message
    });
  }
};

// Get HR dashboard statistics (READ-ONLY)
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is HR or VP
    const user = await User.findById(userId);
    if (!user || !['HR Manager', 'HR BP', 'HR Executive', 'Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel and Vice Presidents can access this resource.'
      });
    }

    // Get stats for requests HR can see
    const stats = await Regularization.aggregate([
      {
        $match: {
          $or: [
            { currentLevel: 'HR', status: 'Pending' }, // TM requests pending HR approval
            { status: { $in: ['Approved', 'Rejected'] } }, // All completed requests
            { 
              currentLevel: 'Completed', 
              'teamManagerApproval.status': { $in: ['Approved', 'Rejected'] } 
            } // Employee/TL requests processed by TM
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    stats.forEach(stat => {
      if (stat._id === 'Pending') {
        formattedStats.pending = stat.count;
      } else if (stat._id === 'Approved') {
        formattedStats.approved = stat.count;
      } else if (stat._id === 'Rejected') {
        formattedStats.rejected = stat.count;
      }
      formattedStats.total += stat.count;
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Approve regularization by HR (for Team Manager requests) or VP (for HR requests)
const approveRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.id;

    // Verify user is HR or VP
    const user = await User.findById(userId);
    if (!user || !['HR Manager', 'HR BP', 'HR Executive', 'Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel and Vice Presidents can approve at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level and user has permission
    if (['HR Manager', 'HR BP', 'HR Executive'].includes(user.role)) {
      // HR can only approve Team Manager requests at HR level
      if (regularization.currentLevel !== 'HR' || regularization.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request is not available for HR approval'
        });
      }
      
      // Check if already processed
      if (regularization.hrApproval.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request has already been processed by HR'
        });
      }
      
      // Approve using HR method
      await regularization.approve(userId, comments);
    } else if (['Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      // VP can only approve HR requests at VP/Admin level
      if (regularization.currentLevel !== 'VP/Admin' || regularization.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request is not available for VP approval'
        });
      }
      
      // Check if already processed
      if (regularization.hrApproval.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request has already been processed'
        });
      }
      
      // Approve using VP/Admin method
      await regularization.approveByVPAdmin(userId, comments);
    }

    // Populate the updated regularization
    const updatedRegularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role');

    res.json({
      success: true,
      message: 'Regularization approved successfully! Attendance has been updated.',
      data: updatedRegularization
    });
  } catch (error) {
    console.error('Error approving regularization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve regularization',
      error: error.message
    });
  }
};

// Reject regularization by HR (for Team Manager requests) or VP (for HR requests)
const rejectRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Verify user is HR or VP
    const user = await User.findById(userId);
    if (!user || !['HR Manager', 'HR BP', 'HR Executive', 'Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only HR personnel and Vice Presidents can reject at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level and user has permission
    if (['HR Manager', 'HR BP', 'HR Executive'].includes(user.role)) {
      // HR can only reject Team Manager requests at HR level
      if (regularization.currentLevel !== 'HR' || regularization.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request is not available for HR rejection'
        });
      }
      
      // Check if already processed
      if (regularization.hrApproval.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request has already been processed by HR'
        });
      }
      
      // Reject using HR method
      await regularization.reject(userId, reason);
    } else if (['Vice President', 'VP', 'Senior VP'].includes(user.role)) {
      // VP can only reject HR requests at VP/Admin level
      if (regularization.currentLevel !== 'VP/Admin' || regularization.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request is not available for VP rejection'
        });
      }
      
      // Check if already processed
      if (regularization.hrApproval.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This request has already been processed'
        });
      }
      
      // Reject using VP/Admin method
      await regularization.rejectByVPAdmin(userId, reason);
    }

    // Populate the updated regularization
    const updatedRegularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role');

    res.json({
      success: true,
      message: 'Regularization rejected successfully',
      data: updatedRegularization
    });
  } catch (error) {
    console.error('Error rejecting regularization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject regularization',
      error: error.message
    });
  }
};

module.exports = {
  getAllRegularizations,
  getRegularizationDetails,
  getDashboardStats,
  approveRegularization,
  rejectRegularization
};
