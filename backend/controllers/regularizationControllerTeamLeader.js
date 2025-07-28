const Regularization = require('../models/Regularization');
const User = require('../models/User');

// Get pending regularizations for Team Leader
const getPendingRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can access this resource.'
      });
    }

    const regularizations = await Regularization.find({
      status: 'Pending',
      currentLevel: 'Team Leader'
    })
    .populate('employee', 'firstName lastName employeeId email department')
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

    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can access this resource.'
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

    // Check if this request is at Team Leader level
    if (regularization.currentLevel !== 'Team Leader') {
      return res.status(403).json({
        success: false,
        message: 'This request is not at Team Leader approval level'
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

// Approve regularization by Team Leader
const approveRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.id;

    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can approve at this level.'
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
    if (regularization.currentLevel !== 'Team Leader') {
      return res.status(400).json({
        success: false,
        message: 'This request is not at Team Leader approval level'
      });
    }

    // Check if already processed
    if (regularization.teamLeaderApproval.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed by Team Leader'
      });
    }

    // Approve the regularization
    await regularization.approveByTeamLeader(userId, comments);

    // Populate the updated regularization
    const updatedRegularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('teamLeaderApproval.approver', 'firstName lastName role')
      .populate('teamManagerApproval.approver', 'firstName lastName role')
      .populate('hrApproval.approver', 'firstName lastName role');

    res.json({
      success: true,
      message: 'Regularization approved successfully and forwarded to Team Manager',
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

// Reject regularization by Team Leader
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

    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can reject at this level.'
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
    if (regularization.currentLevel !== 'Team Leader') {
      return res.status(400).json({
        success: false,
        message: 'This request is not at Team Leader approval level'
      });
    }

    // Check if already processed
    if (regularization.teamLeaderApproval.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed by Team Leader'
      });
    }

    // Reject the regularization
    await regularization.rejectByTeamLeader(userId, reason);

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

// Get Team Leader dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can access this resource.'
      });
    }

    const stats = await Regularization.aggregate([
      {
        $match: {
          currentLevel: 'Team Leader'
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

// Get all regularizations for Team Leader (including approved ones for visibility)
const getAllRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is Team Leader
    const user = await User.findById(userId);
    if (!user || !['Team Leader', 'Team Lead'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Team Leaders can access this resource.'
      });
    }

    // Team Leader can see:
    // 1. Their own requests
    // 2. Employee and TL requests that are approved by TM (for visibility)
    // 3. Requests pending at TL level (if any)
    const regularizations = await Regularization.find({
      $or: [
        { employee: userId }, // Their own requests
        { 
          // All approved requests for visibility (Employee and TL requests approved by TM)
          $and: [
            { status: 'Approved' },
            { currentLevel: 'Completed' },
            { 'teamManagerApproval.status': 'Approved' }
          ]
        },
        { 
          // Any pending requests at Team Leader level
          $and: [
            { currentLevel: 'Team Leader' },
            { status: 'Pending' }
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
    console.error('Error fetching all regularizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
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
