const Regularization = require('../models/Regularization');
const User = require('../models/User');

// Get all regularizations for Team Manager (pending, approved, rejected for visibility)
const getAllRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can access this resource.'
      });
    }

    // Team Manager can see:
    // 1. All requests that need their approval (currentLevel: 'Team Manager' and status: 'Pending')
    // 2. All requests they have processed (approved/rejected) - for history tracking
    // 3. Their own requests
    // 4. All employee requests that went through Team Manager approval workflow
    const regularizations = await Regularization.find({
      $or: [
        { currentLevel: 'Team Manager', status: 'Pending' }, // Pending TM approvals
        { 'teamManagerApproval.approver': userId }, // Requests they processed (approved/rejected)
        { employee: userId }, // Their own requests
        { 
          // All employee requests that went through Team Manager approval workflow
          $and: [
            { currentLevel: { $in: ['Team Manager', 'HR', 'Completed'] } },
            { 
              $or: [
                { 'teamManagerApproval.approver': { $exists: true } }, // Has TM approval record
                { currentLevel: 'Team Manager' } // Currently at TM level
              ]
            }
          ]
        }
      ]
    })
    .populate('employee', 'firstName lastName employeeId email department')
    .populate('teamLeaderApproval.approver', 'firstName lastName role')
    .populate('teamManagerApproval.approver', 'firstName lastName role')
    .populate('hrApproval.approver', 'firstName lastName role')
    .populate('createdBy', 'firstName lastName')
    .sort({ submittedDate: -1 });

    res.json({
      success: true,
      data: regularizations,
      count: regularizations.length
    });
  } catch (error) {
    console.error('Error fetching regularizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get pending regularizations for Team Manager (only pending ones)
const getPendingRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can access this resource.'
      });
    }

    const regularizations = await Regularization.find({
      status: 'Pending',
      currentLevel: 'Team Manager'
    })
    .populate('employee', 'firstName lastName employeeId email department')
    .populate('teamLeaderApproval.approver', 'firstName lastName role')
    .populate('createdBy', 'firstName lastName')
    .sort({ submittedDate: -1 });

    res.json({
      success: true,
      data: regularizations,
      count: regularizations.length
    });
  } catch (error) {
    console.error('Error fetching pending regularizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get regularization details
const getRegularizationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can access this resource.'
      });
    }

    const regularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role')
      .populate('createdBy', 'firstName lastName');

    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if this request is at Team Manager level
    if (regularization.currentLevel !== 'Team Manager') {
      return res.status(403).json({
        success: false,
        message: 'This request is not at Team Manager approval level'
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

// Approve regularization by Team Manager
const approveRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.id;

    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can approve at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level
    if (regularization.currentLevel !== 'Team Manager' || regularization.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is not available for Team Manager approval'
      });
    }

    // Check if already processed
    if (regularization.teamManagerApproval.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed by Team Manager'
      });
    }

    // Approve the regularization
    await regularization.approveByTeamManager(userId, comments);

    // Populate the updated regularization
    const updatedRegularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role');

    // Send email notification to employee about approval
    try {
      const emailService = require('../services/emailService');
      const notificationData = {
        employeeName: `${updatedRegularization.employee.firstName} ${updatedRegularization.employee.lastName}`,
        regularizationId: updatedRegularization.regularizationId,
        requestType: updatedRegularization.requestType,
        attendanceDate: updatedRegularization.attendanceDate,
        approverComments: comments
      };

      await emailService.sendRegularizationNotification([updatedRegularization.employee.email], notificationData, 'approved');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

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

// Reject regularization by Team Manager
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

    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can reject at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level
    if (regularization.currentLevel !== 'Team Manager' || regularization.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is not available for Team Manager rejection'
      });
    }

    // Check if already processed
    if (regularization.teamManagerApproval.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed by Team Manager'
      });
    }

    // Reject the regularization
    await regularization.rejectByTeamManager(userId, reason);

    // Populate the updated regularization
    const updatedRegularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role');

    // Send email notification to employee about rejection
    try {
      const emailService = require('../services/emailService');
      const notificationData = {
        employeeName: `${updatedRegularization.employee.firstName} ${updatedRegularization.employee.lastName}`,
        regularizationId: updatedRegularization.regularizationId,
        requestType: updatedRegularization.requestType,
        attendanceDate: updatedRegularization.attendanceDate,
        rejectionReason: reason
      };

      await emailService.sendRegularizationNotification([updatedRegularization.employee.email], notificationData, 'rejected');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

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

// Get Team Manager dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is Team Manager
    const user = await User.findById(userId);
    if (!user || !['Team Manager', 'Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Managers can access this resource.'
      });
    }

    const stats = await Regularization.aggregate([
      {
        $match: {
          currentLevel: 'Team Manager',
          status: 'Pending'
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
      total: 0
    };

    stats.forEach(stat => {
      if (stat._id === 'Pending') {
        formattedStats.pending = stat.count;
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

module.exports = {
  getAllRegularizations,
  getPendingRegularizations,
  getRegularizationDetails,
  approveRegularization,
  rejectRegularization,
  getDashboardStats
};
