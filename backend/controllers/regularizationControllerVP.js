const Regularization = require('../models/Regularization');
const User = require('../models/User');

// Get all regularizations for VP/Admin
const getAllRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can access this resource.'
      });
    }

    const regularizations = await Regularization.find({})
      .populate('employee', 'firstName lastName employeeId email department role')
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
    console.error('Error fetching all regularizations for VP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get pending regularizations for VP/Admin
const getPendingRegularizations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can access this resource.'
      });
    }

    const regularizations = await Regularization.find({
      status: 'Pending',
      currentLevel: { $in: ['VP/Admin', 'HR'] }
    })
      .populate('employee', 'firstName lastName employeeId email department role')
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
    console.error('Error fetching pending regularizations for VP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularizations',
      error: error.message
    });
  }
};

// Get regularization details for VP/Admin
const getRegularizationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can access this resource.'
      });
    }

    const regularization = await Regularization.findById(id)
      .populate('employee', 'firstName lastName employeeId email department role')
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

    // Check if this request is at VP/Admin level or HR level (VP can view both)
    if (regularization.currentLevel !== 'VP/Admin' && regularization.currentLevel !== 'HR') {
      return res.status(403).json({
        success: false,
        message: 'This request is not at VP/Admin approval level'
      });
    }

    res.json({
      success: true,
      data: regularization
    });
  } catch (error) {
    console.error('Error fetching regularization details for VP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regularization details',
      error: error.message
    });
  }
};

// Approve regularization by VP/Admin
const approveRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user.id;

    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can approve at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level (VP can approve both VP/Admin level and HR level requests)
    if ((regularization.currentLevel !== 'VP/Admin' && regularization.currentLevel !== 'HR') || regularization.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is not available for VP/Admin approval'
      });
    }

    // Approve the regularization using VP/Admin method (handles both VP/Admin and HR levels)
    await regularization.approveByVPAdmin(userId, comments);

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
    console.error('Error approving regularization by VP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve regularization',
      error: error.message
    });
  }
};

// Reject regularization by VP/Admin
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

    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can reject at this level.'
      });
    }

    const regularization = await Regularization.findById(id);
    if (!regularization) {
      return res.status(404).json({
        success: false,
        message: 'Regularization request not found'
      });
    }

    // Check if request is at correct level (VP can reject both VP/Admin level and HR level requests)
    if ((regularization.currentLevel !== 'VP/Admin' && regularization.currentLevel !== 'HR') || regularization.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is not available for VP/Admin rejection'
      });
    }

    // Reject the regularization using VP/Admin method (handles both VP/Admin and HR levels)
    await regularization.rejectByVPAdmin(userId, reason);

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
    console.error('Error rejecting regularization by VP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject regularization',
      error: error.message
    });
  }
};

// Get VP/Admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is VP or Admin
    const user = await User.findById(userId);
    if (!user || !['Vice President', 'VP', 'Admin', 'System Administrator', 'Super Admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only VP or Admin can access this resource.'
      });
    }

    const stats = await Regularization.aggregate([
      {
        $match: {
          currentLevel: { $in: ['VP/Admin', 'HR'] },
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
    console.error('Error fetching VP dashboard stats:', error);
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
