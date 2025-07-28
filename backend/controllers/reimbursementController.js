const Reimbursement = require('../models/Reimbursement');
const User = require('../models/User');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');

// Get all reimbursements with filters
const getReimbursements = async (req, res) => {
  try {
    const {
      status,
      category,
      employee,
      
      approver,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (employee) {
      query.employee = employee;
    }
    
    if (approver) {
      query.currentApprover = approver;
    }
    
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    // Role-based filtering
    if (req.user.role === 'Employee') {
      query.employee = req.user.id;
    } else if (['Team Manager', 'Team Leader'].includes(req.user.role)) {
      // Show reimbursements for team members + own reimbursements + pending approvals
      const teamMembers = await User.find({ 
        $or: [
          { reportingManager: req.user.id },
          { department: req.user.department }
        ]
      }).select('_id');
      const memberIds = teamMembers.map(member => member._id);
      memberIds.push(req.user.id);
      query.employee = { $in: memberIds };
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'employee',
          select: 'firstName lastName email employeeId department',
          populate: {
            path: 'department',
            select: 'name'
          }
        },
        {
          path: 'currentApprover',
          select: 'firstName lastName role'
        },
        {
          path: 'approvalChain.approver',
          select: 'firstName lastName role'
        },
        {
          path: 'paymentDetails.processedBy',
          select: 'firstName lastName'
        }
      ]
    };

    const reimbursements = await Reimbursement.paginate(query, options);

    res.json({
      success: true,
      data: reimbursements
    });
  } catch (error) {
    console.error('Get reimbursements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reimbursements',
      error: error.message
    });
  }
};

// Get single reimbursement by ID
const getReimbursementById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reimbursement ID format'
      });
    }

    const reimbursement = await Reimbursement.findById(id)
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('employee.department', 'name')
      .populate('currentApprover', 'firstName lastName role')
      .populate('approvalChain.approver', 'firstName lastName role')
      .populate('paymentDetails.processedBy', 'firstName lastName')
      .populate('auditTrail.performedBy', 'firstName lastName');

    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    // Check access permissions
    const canAccess = 
      reimbursement.employee._id.toString() === req.user.id ||
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(req.user.role) ||
      reimbursement.approvalChain.some(approval => approval.approver._id.toString() === req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: reimbursement
    });
  } catch (error) {
    console.error('Get reimbursement by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reimbursement',
      error: error.message
    });
  }
};

// Create new reimbursement
const createReimbursement = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      amount,
      currency = 'INR',
      description,
      expenseDate,
      businessPurpose,
      priority = 'Normal'
    } = req.body;

    // Handle uploaded files
    const receipts = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        receipts.push({
          fileName: file.filename,
          originalName: file.originalname,
          fileUrl: `/uploads/receipts/${file.filename}`,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      });
    }

    // Validate required fields
    if (!category || !amount || !description || !expenseDate || !businessPurpose) {
      return res.status(400).json({
        success: false,
        message: 'Category, amount, description, expense date, and business purpose are required'
      });
    }

    // Get employee data
    const employee = await User.findById(req.user.id).populate('reportingManager department');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Build approval chain: Team Lead → Team Manager → HR
    const approvalChain = [];
    let order = 1;

    // Step 1: Find Team Lead (reporting manager with Team Leader role)
    let teamLead = null;
    if (employee.reportingManager) {
      const reportingManager = await User.findById(employee.reportingManager);
      if (reportingManager && reportingManager.role === 'Team Leader') {
        teamLead = reportingManager;
      }
    }
    
    // If no direct Team Leader, find one in the same department
    if (!teamLead) {
      teamLead = await User.findOne({
        role: 'Team Leader',
        department: employee.department,
        isActive: true
      });
    }

    if (teamLead) {
      approvalChain.push({
        approver: teamLead._id,
        role: 'Team Lead',
        level: 'Team Lead',
        order: order++
      });
    }

    // Step 2: Find Team Manager in the same department
    const teamManager = await User.findOne({
      role: 'Team Manager',
      department: employee.department,
      isActive: true
    });

    if (teamManager) {
      approvalChain.push({
        approver: teamManager._id,
        role: 'Team Manager',
        level: 'Team Manager',
        order: order++
      });
    }

    // Step 3: Add HR approval (always required)
    const hrManager = await User.findOne({ 
      role: { $in: ['HR Manager', 'HR BP', 'HR Executive'] },
      isActive: true 
    });
    
    if (hrManager) {
      approvalChain.push({
        approver: hrManager._id,
        role: 'HR',
        level: 'HR',
        order: order++
      });
    }

    // Check monthly limits (example: Travel - 15000, Food - 5000)
    const monthlyLimits = {
      'Travel': 15000,
      'Food': 5000,
      'Internet': 2000,
      'Communication': 3000
    };

    let monthlyLimitUsage = null;
    if (monthlyLimits[category]) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyUsage = await Reimbursement.aggregate([
        {
          $match: {
            employee: new mongoose.Types.ObjectId(req.user.id),
            category,
            status: { $in: ['Approved', 'Paid'] },
            expenseDate: {
              $gte: new Date(currentYear, currentMonth - 1, 1),
              $lt: new Date(currentYear, currentMonth, 1)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalUsed: { $sum: '$amount' }
          }
        }
      ]);

      const usedAmount = monthlyUsage.length > 0 ? monthlyUsage[0].totalUsed : 0;
      const remainingAmount = monthlyLimits[category] - usedAmount - amount;

      monthlyLimitUsage = {
        month: currentMonth,
        year: currentYear,
        categoryLimit: monthlyLimits[category],
        usedAmount: usedAmount + amount,
        remainingAmount: Math.max(0, remainingAmount)
      };
    }

    // Create reimbursement
    const reimbursementData = {
      employee: req.user.id,
      category,
      subcategory,
      amount,
      currency,
      description,
      expenseDate: new Date(expenseDate),
      businessPurpose,
      receipts,
      approvalChain,
      currentApprover: approvalChain.length > 0 ? approvalChain[0].approver : null,
      priority,
      monthlyLimitUsage,
      createdBy: req.user.id
    };

    const reimbursement = new Reimbursement(reimbursementData);
    
    // Add initial audit trail
    reimbursement.auditTrail.push({
      action: 'Created',
      performedBy: req.user.id,
      details: 'Reimbursement request created'
    });

    await reimbursement.save();

    // Populate the response
    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email employeeId' },
      { path: 'currentApprover', select: 'firstName lastName role' },
      { path: 'approvalChain.approver', select: 'firstName lastName email role' }
    ]);

    // Send email notifications to approvers
    try {
      if (reimbursement.approvalChain.length > 0) {
        const approverEmails = reimbursement.approvalChain.map(approval => approval.approver.email).filter(email => email);
        
        const reimbursementData = {
          employeeName: `${reimbursement.employee.firstName} ${reimbursement.employee.lastName}`,
          reimbursementId: reimbursement.reimbursementId,
          category: reimbursement.category,
          amount: reimbursement.amount,
          expenseDate: reimbursement.expenseDate,
          businessPurpose: reimbursement.businessPurpose,
          description: reimbursement.description,
          priority: reimbursement.priority,
          createdAt: reimbursement.createdAt
        };

        await emailService.sendReimbursementNotification(approverEmails, reimbursementData, 'new');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Reimbursement created successfully',
      data: reimbursement
    });
  } catch (error) {
    console.error('Create reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reimbursement',
      error: error.message
    });
  }
};

// Update reimbursement (only drafts)
const updateReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    // Check permissions
    if (reimbursement.employee.toString() !== req.user.id && 
        !['Admin', 'Vice President', 'HR BP', 'HR Manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updates for draft status
    if (reimbursement.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft reimbursements can be updated'
      });
    }

    // Update fields
    const allowedFields = [
      'category', 'subcategory', 'amount', 'currency', 'description', 
      'expenseDate', 'businessPurpose', 'receipts', 'priority'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        reimbursement[field] = updateData[field];
      }
    });

    reimbursement.updatedBy = req.user.id;
    
    // Add audit trail
    reimbursement.auditTrail.push({
      action: 'Updated',
      performedBy: req.user.id,
      details: 'Reimbursement details updated'
    });

    await reimbursement.save();

    res.json({
      success: true,
      message: 'Reimbursement updated successfully',
      data: reimbursement
    });
  } catch (error) {
    console.error('Update reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reimbursement',
      error: error.message
    });
  }
};

// Submit reimbursement for approval
const submitReimbursement = async (req, res) => {
  try {
    const { id } = req.params;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    // Check permissions
    if (reimbursement.employee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await reimbursement.submit();

    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email' },
      { path: 'currentApprover', select: 'firstName lastName role email' },
      { path: 'approvalChain.approver', select: 'firstName lastName email role' }
    ]);

    // Send email notification to current approver
    try {
      if (reimbursement.currentApprover && reimbursement.currentApprover.email) {
        const reimbursementData = {
          employeeName: `${reimbursement.employee.firstName} ${reimbursement.employee.lastName}`,
          reimbursementId: reimbursement.reimbursementId,
          category: reimbursement.category,
          amount: reimbursement.amount,
          expenseDate: reimbursement.expenseDate,
          businessPurpose: reimbursement.businessPurpose,
          description: reimbursement.description,
          priority: reimbursement.priority,
          submittedAt: reimbursement.submittedAt,
          createdAt: reimbursement.createdAt
        };

        await emailService.sendReimbursementNotification([reimbursement.currentApprover.email], reimbursementData, 'new');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Reimbursement submitted for approval',
      data: reimbursement
    });
  } catch (error) {
    console.error('Submit reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit reimbursement',
      error: error.message
    });
  }
};

// Approve reimbursement
const approveReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    await reimbursement.approve(req.user.id, comments);

    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email' },
      { path: 'currentApprover', select: 'firstName lastName role' }
    ]);

    res.json({
      success: true,
      message: 'Reimbursement approved successfully',
      data: reimbursement
    });
  } catch (error) {
    console.error('Approve reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve reimbursement',
      error: error.message
    });
  }
};

// Reject reimbursement
const rejectReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    await reimbursement.reject(req.user.id, reason);

    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Reimbursement rejected',
      data: reimbursement
    });
  } catch (error) {
    console.error('Reject reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject reimbursement',
      error: error.message
    });
  }
};

// Mark reimbursement as paid
const markReimbursementAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'Bank Transfer', transactionId, paidAmount } = req.body;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    const paymentDetails = {
      method,
      paidAmount: paidAmount || reimbursement.amount,
      transactionId
    };

    await reimbursement.markAsPaid(req.user.id, paymentDetails);

    res.json({
      success: true,
      message: 'Reimbursement marked as paid',
      data: reimbursement
    });
  } catch (error) {
    console.error('Mark reimbursement as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark reimbursement as paid',
      error: error.message
    });
  }
};

// Get pending approvals for current user
const getPendingApprovals = async (req, res) => {
  try {
    const pendingApprovals = await Reimbursement.getPendingApprovals(req.user.id);

    res.json({
      success: true,
      data: pendingApprovals
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};

// Get reimbursement summary
const getReimbursementSummary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;

    // Default to current user if no employeeId provided
    const targetEmployeeId = employeeId || req.user.id;

    // Check permissions
    if (targetEmployeeId !== req.user.id && 
        !['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const summary = await Reimbursement.getMonthlySummary(targetEmployeeId, currentMonth, currentYear);

    // Get overall statistics
    const overallStats = await Reimbursement.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(targetEmployeeId)
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        monthlySummary: summary,
        overallStats,
        period: { month: currentMonth, year: currentYear }
      }
    });
  } catch (error) {
    console.error('Get reimbursement summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reimbursement summary',
      error: error.message
    });
  }
};

// Delete reimbursement (only drafts)
const deleteReimbursement = async (req, res) => {
  try {
    const { id } = req.params;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    // Check permissions
    if (reimbursement.employee.toString() !== req.user.id && 
        !['Admin', 'Vice President'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow deletion of draft reimbursements
    if (reimbursement.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft reimbursements can be deleted'
      });
    }

    await Reimbursement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Reimbursement deleted successfully'
    });
  } catch (error) {
    console.error('Delete reimbursement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reimbursement',
      error: error.message
    });
  }
};

// Get reimbursement categories and limits
const getReimbursementConfig = async (req, res) => {
  try {
    const config = {
      categories: [
        { value: 'Travel', label: 'Travel', monthlyLimit: 15000 },
        { value: 'Food', label: 'Food & Meals', monthlyLimit: 5000 },
        { value: 'Internet', label: 'Internet', monthlyLimit: 2000 },
        { value: 'Office Supplies', label: 'Office Supplies', monthlyLimit: 3000 },
        { value: 'Medical', label: 'Medical', monthlyLimit: 10000 },
        { value: 'Communication', label: 'Communication', monthlyLimit: 3000 },
        { value: 'Training', label: 'Training & Development', monthlyLimit: 25000 },
        { value: 'Fuel', label: 'Fuel', monthlyLimit: 8000 },
        { value: 'Accommodation', label: 'Accommodation', monthlyLimit: 20000 },
        { value: 'Other', label: 'Other', monthlyLimit: 5000 }
      ],
      currencies: ['INR', 'USD', 'EUR', 'GBP'],
      priorities: ['Low', 'Normal', 'High', 'Urgent'],
      approvalLimits: {
        manager: 10000,
        hr: 25000,
        finance: 100000
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get reimbursement config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reimbursement configuration',
      error: error.message
    });
  }
};

// Enhanced approve with comments
const approveReimbursementWithComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    await reimbursement.approve(req.user.id, comments);

    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email' },
      { path: 'currentApprover', select: 'firstName lastName role' },
      { path: 'approvalChain.approver', select: 'firstName lastName role' }
    ]);

    // Send email notification to next approver or employee
    try {
      if (reimbursement.currentApprover && reimbursement.currentApprover.email) {
        const reimbursementData = {
          employeeName: `${reimbursement.employee.firstName} ${reimbursement.employee.lastName}`,
          reimbursementId: reimbursement.reimbursementId,
          category: reimbursement.category,
          amount: reimbursement.amount,
          expenseDate: reimbursement.expenseDate,
          businessPurpose: reimbursement.businessPurpose,
          description: reimbursement.description,
          priority: reimbursement.priority,
          approverComments: comments
        };

        await emailService.sendReimbursementNotification([reimbursement.currentApprover.email], reimbursementData, 'approved');
      } else if (reimbursement.status === 'Approved') {
        // Notify employee of final approval
        const reimbursementData = {
          employeeName: `${reimbursement.employee.firstName} ${reimbursement.employee.lastName}`,
          reimbursementId: reimbursement.reimbursementId,
          category: reimbursement.category,
          amount: reimbursement.amount,
          approverComments: comments
        };

        await emailService.sendReimbursementNotification([reimbursement.employee.email], reimbursementData, 'approved');
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Reimbursement approved successfully',
      data: reimbursement
    });
  } catch (error) {
    console.error('Approve reimbursement with comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve reimbursement',
      error: error.message
    });
  }
};

// Enhanced reject with comments
const rejectReimbursementWithComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    await reimbursement.reject(req.user.id, reason);

    await reimbursement.populate([
      { path: 'employee', select: 'firstName lastName email' }
    ]);

    // Send email notification to employee
    try {
      const reimbursementData = {
        employeeName: `${reimbursement.employee.firstName} ${reimbursement.employee.lastName}`,
        reimbursementId: reimbursement.reimbursementId,
        category: reimbursement.category,
        amount: reimbursement.amount,
        rejectionReason: reason
      };

      await emailService.sendReimbursementNotification([reimbursement.employee.email], reimbursementData, 'rejected');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Reimbursement rejected',
      data: reimbursement
    });
  } catch (error) {
    console.error('Reject reimbursement with comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject reimbursement',
      error: error.message
    });
  }
};

// Get reimbursement file
const getReimbursementFile = async (req, res) => {
  try {
    const { id, fileIndex } = req.params;

    const reimbursement = await Reimbursement.findById(id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Reimbursement not found'
      });
    }

    // Check access permissions
    const canAccess = 
      reimbursement.employee.toString() === req.user.id ||
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'].includes(req.user.role) ||
      reimbursement.approvalChain.some(approval => approval.approver.toString() === req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const fileIdx = parseInt(fileIndex);
    if (fileIdx < 0 || fileIdx >= reimbursement.receipts.length) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const file = reimbursement.receipts[fileIdx];
    const path = require('path');
    const fs = require('fs');

    // Check if file exists
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Get reimbursement file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file',
      error: error.message
    });
  }
};

module.exports = {
  getReimbursements,
  getReimbursementById,
  createReimbursement,
  updateReimbursement,
  submitReimbursement,
  approveReimbursement,
  rejectReimbursement,
  markReimbursementAsPaid,
  getPendingApprovals,
  getReimbursementSummary,
  deleteReimbursement,
  getReimbursementConfig,
  approveReimbursementWithComments,
  rejectReimbursementWithComments,
  getReimbursementFile
};
