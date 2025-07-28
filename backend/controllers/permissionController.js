const Permission = require('../models/Permission');
const User = require('../models/User');

// Create a new permission request
exports.createPermissionRequest = async (req, res) => {
  try {
    console.log('Creating permission request...');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const {
      startDate,
      startTime,
      endDate,
      endTime,
      duration,
      reason,
      assignedBy,
      responsiblePerson,
      workDescription
    } = req.body;

    // Validate required fields
    if (!startDate || !startTime || !endDate || !endTime || !duration || !reason || !assignedBy || !responsiblePerson || !workDescription) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required',
        missingFields: {
          startDate: !startDate,
          startTime: !startTime,
          endDate: !endDate,
          endTime: !endTime,
          duration: !duration,
          reason: !reason,
          assignedBy: !assignedBy,
          responsiblePerson: !responsiblePerson,
          workDescription: !workDescription
        }
      });
    }

    // Validate that assignedBy and responsiblePerson are valid ObjectIds
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(assignedBy)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid assignedBy user ID' 
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(responsiblePerson)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid responsiblePerson user ID' 
      });
    }

    // Verify that the users exist
    const assignedByUser = await User.findById(assignedBy);
    const responsiblePersonUser = await User.findById(responsiblePerson);

    if (!assignedByUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assigned by user not found' 
      });
    }

    if (!responsiblePersonUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Responsible person not found' 
      });
    }

    // Determine the initial approval level based on the user's role
    let initialStatus = 'Pending';
    let initialApprovalLevel = 'Team Leader';

    // If the requester is a Team Leader, go to Team Manager (TL requests: TL → TM → HR)
    if (['Team Leader', 'Team Lead'].includes(req.user.role)) {
      initialApprovalLevel = 'Team Manager';
    }
    
    // If the requester is a Team Manager, skip both Team Leader and Team Manager approvals and go directly to HR (TM requests: TM → HR)
    if (['Team Manager'].includes(req.user.role)) {
      initialApprovalLevel = 'HR';
    }

    const permission = new Permission({
      employee: req.user._id,
      startDate: new Date(startDate),
      startTime,
      endDate: new Date(endDate),
      endTime,
      duration,
      reason,
      assignedBy: assignedBy,
      responsiblePerson: responsiblePerson,
      workDescription,
      status: initialStatus,
      currentApprovalLevel: initialApprovalLevel,
      approvalHistory: []
    });

    console.log('Permission object to save:', permission);

    await permission.save();

    console.log('Permission saved successfully:', permission._id);

    res.status(201).json({ success: true, message: 'Permission request created successfully', permission });
  } catch (error) {
    console.error('Error creating permission request:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create permission request',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
};

// Get permission requests for the logged-in user
exports.getMyPermissionRequests = async (req, res) => {
  try {
    const permissions = await Permission.find({ employee: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching permission requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permission requests' });
  }
};

// Get permission requests pending approval for the logged-in user
exports.getPendingApprovals = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;
    let query = {};

    if (['Team Leader', 'Team Lead'].includes(userRole)) {
      // Team Leaders see:
      // 1. Requests pending their approval
      // 2. Requests they've already approved (to track status)
      // 3. Requests they've rejected (to track status)
      query = {
        $or: [
          {
            status: 'Pending',
            currentApprovalLevel: 'Team Leader'
          },
          {
            status: { $in: ['Team Leader Approved', 'Team Manager Approved', 'HR Approved'] },
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'Team Leader'
          },
          {
            status: 'Rejected',
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'Team Leader'
          }
        ]
      };
    } else if (userRole === 'Team Manager') {
      // Team Managers see:
      // 1. Requests pending their approval (from Team Leader approval)
      // 2. Team Leader requests that go directly to Team Manager (status: Pending, currentApprovalLevel: Team Manager)
      // 3. Requests they've already approved (to track status)
      // 4. Requests they've rejected (to track status)
      query = {
        $or: [
          {
            status: 'Team Leader Approved',
            currentApprovalLevel: 'Team Manager'
          },
          {
            status: 'Pending',
            currentApprovalLevel: 'Team Manager'
          },
          {
            status: { $in: ['Team Manager Approved', 'HR Approved'] },
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'Team Manager'
          },
          {
            status: 'Rejected',
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'Team Manager'
          }
        ]
      };
    } else if (['HR Manager', 'HR BP', 'HR Executive'].includes(userRole)) {
      // HR sees:
      // 1. Requests pending their approval (from Team Manager approval)
      // 2. Team Manager requests that go directly to HR (status: Pending, currentApprovalLevel: HR)
      // 3. Requests they've already approved (to track status)
      // 4. Requests they've rejected (to track status)
      query = {
        $or: [
          {
            status: 'Team Manager Approved',
            currentApprovalLevel: 'HR'
          },
          {
            status: 'Pending',
            currentApprovalLevel: 'HR'
          },
          {
            status: 'HR Approved',
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'HR'
          },
          {
            status: 'Rejected',
            'approvalHistory.approver': userId,
            'approvalHistory.level': 'HR'
          }
        ]
      };
    } else {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }

    console.log(`Fetching pending approvals for ${userRole} with query:`, JSON.stringify(query, null, 2));

    const permissions = await Permission.find(query)
    .populate('employee', 'firstName lastName email employeeId')
    .populate('assignedBy', 'firstName lastName email role')
    .populate('responsiblePerson', 'firstName lastName email role')
    .populate('approvalHistory.approver', 'firstName lastName email role')
    .sort({ createdAt: -1 });

    console.log(`Found ${permissions.length} requests for ${userRole}`);

    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending approvals' });
  }
};

// Approve a permission request
exports.approvePermissionRequest = async (req, res) => {
  try {
    const permissionId = req.params.id;
    const user = req.user;
    const permission = await Permission.findById(permissionId);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    if (!permission.canApprove(user)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to approve this request' });
    }

    permission.approvalHistory.push({
      approver: user._id,
      action: 'Approved',
      level: permission.currentApprovalLevel,
      timestamp: new Date()
    });

    permission.advanceApprovalLevel();

    if (permission.status === 'HR Approved') {
      permission.finalApprovedBy = user._id;
      permission.finalApprovedAt = new Date();
    }

    await permission.save();

    res.json({ success: true, message: 'Permission request approved', permission });
  } catch (error) {
    console.error('Error approving permission request:', error);
    res.status(500).json({ success: false, message: 'Failed to approve permission request' });
  }
};

// Reject a permission request
exports.rejectPermissionRequest = async (req, res) => {
  try {
    const permissionId = req.params.id;
    const { rejectionReason } = req.body;
    const user = req.user;
    const permission = await Permission.findById(permissionId);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    if (!permission.canApprove(user)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to reject this request' });
    }

    permission.approvalHistory.push({
      approver: user._id,
      action: 'Rejected',
      level: permission.currentApprovalLevel,
      comments: rejectionReason,
      timestamp: new Date()
    });

    permission.reject(user._id, rejectionReason);

    await permission.save();

    res.json({ success: true, message: 'Permission request rejected', permission });
  } catch (error) {
    console.error('Error rejecting permission request:', error);
    res.status(500).json({ success: false, message: 'Failed to reject permission request' });
  }
};

// Get permission request details by ID
exports.getPermissionRequestById = async (req, res) => {
  try {
    const permissionId = req.params.id;
    const permission = await Permission.findById(permissionId)
      .populate('employee', 'firstName lastName email employeeId')
      .populate('assignedBy', 'firstName lastName email role')
      .populate('responsiblePerson', 'firstName lastName email role')
      .populate('approvalHistory.approver', 'firstName lastName email role')
      .populate('finalApprovedBy', 'firstName lastName email role')
      .populate('rejectedBy', 'firstName lastName email role');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    res.json({ success: true, permission });
  } catch (error) {
    console.error('Error fetching permission request details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permission request details' });
  }
};
