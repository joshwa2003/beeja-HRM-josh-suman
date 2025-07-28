const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Reimbursement = require('../models/Reimbursement');

// Get all payrolls with filters
const getPayrolls = async (req, res) => {
  try {
    const {
      month,
      year,
      status,
      department,
      employee,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (month && year) {
      query['payPeriod.month'] = parseInt(month);
      query['payPeriod.year'] = parseInt(year);
    }
    
    if (status) {
      query.status = status;
    }
    
    if (employee) {
      query.employee = employee;
    }

    // If department filter is provided, get employees from that department
    if (department) {
      const departmentEmployees = await User.find({ department }).select('_id');
      query.employee = { $in: departmentEmployees.map(emp => emp._id) };
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'employee',
          select: 'firstName lastName email employeeId department designation',
          populate: {
            path: 'department',
            select: 'name'
          }
        },
        {
          path: 'processedBy',
          select: 'firstName lastName'
        },
        {
          path: 'approvedBy',
          select: 'firstName lastName'
        }
      ]
    };

    const payrolls = await Payroll.paginate(query, options);

    res.json({
      success: true,
      data: payrolls
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payrolls',
      error: error.message
    });
  }
};

// Get single payroll by ID
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id)
      .populate('employee', 'firstName lastName email employeeId department designation bankDetails')
      .populate('employee.department', 'name')
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found'
      });
    }

    res.json({
      success: true,
      data: payroll
    });
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll',
      error: error.message
    });
  }
};

// Create or update payroll for an employee
const createOrUpdatePayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      overtime,
      bonus,
      incentives,
      reimbursements,
      attendance,
      notes
    } = req.body;

    // Validate required fields
    if (!employeeId || !month || !year || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, month, year, and basic salary are required'
      });
    }

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if payroll already exists for this period
    let payroll = await Payroll.findOne({
      employee: employeeId,
      'payPeriod.month': month,
      'payPeriod.year': year
    });

    const payrollData = {
      employee: employeeId,
      payPeriod: { month, year },
      basicSalary,
      allowances: allowances || {},
      deductions: deductions || {},
      overtime: overtime || { hours: 0, rate: 0, amount: 0 },
      bonus: bonus || 0,
      incentives: incentives || 0,
      reimbursements: reimbursements || [],
      attendance: attendance || { workingDays: 22, presentDays: 22, absentDays: 0, leaveDays: 0, holidayDays: 0 },
      notes,
      updatedBy: req.user.id
    };

    if (payroll) {
      // Update existing payroll
      if (payroll.status === 'Paid') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update payroll that has already been paid'
        });
      }

      Object.assign(payroll, payrollData);
      await payroll.save();
    } else {
      // Create new payroll
      payrollData.createdBy = req.user.id;
      payroll = new Payroll(payrollData);
      await payroll.save();
    }

    // Populate the response
    await payroll.populate('employee', 'firstName lastName email employeeId');

    res.status(payroll.isNew ? 201 : 200).json({
      success: true,
      message: payroll.isNew ? 'Payroll created successfully' : 'Payroll updated successfully',
      data: payroll
    });
  } catch (error) {
    console.error('Create/Update payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update payroll',
      error: error.message
    });
  }
};

// Bulk process payroll for multiple employees
const bulkProcessPayroll = async (req, res) => {
  try {
    const { month, year, employeeIds, autoCalculate = true } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    let employees;
    if (employeeIds && employeeIds.length > 0) {
      employees = await User.find({ _id: { $in: employeeIds }, isActive: true });
    } else {
      employees = await User.find({ isActive: true, role: { $ne: 'Admin' } });
    }

    const results = {
      processed: [],
      errors: [],
      skipped: []
    };

    for (const employee of employees) {
      try {
        // Check if payroll already exists
        const existingPayroll = await Payroll.findOne({
          employee: employee._id,
          'payPeriod.month': month,
          'payPeriod.year': year
        });

        if (existingPayroll && existingPayroll.status !== 'Draft') {
          results.skipped.push({
            employee: `${employee.firstName} ${employee.lastName}`,
            reason: `Payroll already ${existingPayroll.status.toLowerCase()}`
          });
          continue;
        }

        let payrollData = {
          employee: employee._id,
          payPeriod: { month, year },
          createdBy: req.user.id
        };

        if (autoCalculate) {
          // Find applicable salary structure
          const salaryStructure = await SalaryStructure.findApplicableStructure({
            role: employee.role,
            department: employee.department,
            designation: employee.designation
          });

          if (salaryStructure) {
            const calculation = salaryStructure.calculateSalary(salaryStructure.basicSalary);
            payrollData = {
              ...payrollData,
              basicSalary: calculation.basic,
              allowances: calculation.allowances,
              deductions: calculation.deductions
            };
          } else {
            // Use default calculation if no structure found
            const defaultStructure = Payroll.calculateSalaryStructure(30000); // Default basic
            payrollData = {
              ...payrollData,
              basicSalary: defaultStructure.basic,
              allowances: {
                hra: defaultStructure.hra,
                transport: defaultStructure.transport,
                medical: defaultStructure.medical,
                special: defaultStructure.special
              },
              deductions: {
                pf: defaultStructure.pf,
                esi: defaultStructure.esi,
                tax: defaultStructure.tax
              }
            };
          }

          // Get attendance data for the month
          const attendanceData = await Attendance.aggregate([
            {
              $match: {
                employee: employee._id,
                date: {
                  $gte: new Date(year, month - 1, 1),
                  $lt: new Date(year, month, 1)
                }
              }
            },
            {
              $group: {
                _id: null,
                totalDays: { $sum: 1 },
                presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
                absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
                leaveDays: { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
                halfDays: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 0.5, 0] } }
              }
            }
          ]);

          if (attendanceData.length > 0) {
            const attendance = attendanceData[0];
            payrollData.attendance = {
              workingDays: 22, // Standard working days
              presentDays: attendance.presentDays + attendance.halfDays,
              absentDays: attendance.absentDays,
              leaveDays: attendance.leaveDays,
              holidayDays: 0
            };
          }

          // Get approved reimbursements for the month
          const approvedReimbursements = await Reimbursement.find({
            employee: employee._id,
            status: 'Approved',
            'payrollIntegration.includeInPayroll': true,
            'payrollIntegration.payrollMonth': month,
            'payrollIntegration.payrollYear': year
          });

          if (approvedReimbursements.length > 0) {
            payrollData.reimbursements = approvedReimbursements.map(reimb => ({
              type: reimb.category,
              amount: reimb.amount,
              description: reimb.description,
              receiptUrl: reimb.receipts[0]?.fileUrl
            }));
          }
        }

        // Create or update payroll
        let payroll;
        if (existingPayroll) {
          Object.assign(existingPayroll, payrollData);
          payroll = await existingPayroll.save();
        } else {
          payroll = new Payroll(payrollData);
          await payroll.save();
        }

        results.processed.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          payrollId: payroll._id,
          grossSalary: payroll.grossSalary,
          netSalary: payroll.netSalary
        });

      } catch (error) {
        results.errors.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk payroll processing completed',
      data: results
    });
  } catch (error) {
    console.error('Bulk process payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk payroll',
      error: error.message
    });
  }
};

// Process payroll (change status from Draft to Processed)
const processPayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found'
      });
    }

    if (payroll.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payrolls can be processed'
      });
    }

    await payroll.process(req.user.id);

    res.json({
      success: true,
      message: 'Payroll processed successfully',
      data: payroll
    });
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payroll',
      error: error.message
    });
  }
};

// Mark payroll as paid
const markPayrollAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'Bank Transfer' } = req.body;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found'
      });
    }

    if (payroll.status !== 'Processed') {
      return res.status(400).json({
        success: false,
        message: 'Only processed payrolls can be marked as paid'
      });
    }

    await payroll.markAsPaid(req.user.id, paymentMethod);

    res.json({
      success: true,
      message: 'Payroll marked as paid successfully',
      data: payroll
    });
  } catch (error) {
    console.error('Mark payroll as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payroll as paid',
      error: error.message
    });
  }
};

// Put payroll on hold
const putPayrollOnHold = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required to put payroll on hold'
      });
    }

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found'
      });
    }

    await payroll.putOnHold(req.user.id, reason);

    res.json({
      success: true,
      message: 'Payroll put on hold successfully',
      data: payroll
    });
  } catch (error) {
    console.error('Put payroll on hold error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to put payroll on hold',
      error: error.message
    });
  }
};

// Get payroll summary for a period
const getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const summary = await Payroll.getPayrollSummary(parseInt(month), parseInt(year));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get payroll summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll summary',
      error: error.message
    });
  }
};

// Delete payroll (only drafts)
const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll not found'
      });
    }

    if (payroll.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payrolls can be deleted'
      });
    }

    await Payroll.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Payroll deleted successfully'
    });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payroll',
      error: error.message
    });
  }
};

// Get payroll reports
const getPayrollReports = async (req, res) => {
  try {
    const {
      startMonth,
      startYear,
      endMonth,
      endYear,
      department,
      reportType = 'summary'
    } = req.query;

    const matchQuery = {};
    
    if (startMonth && startYear) {
      matchQuery['payPeriod.year'] = { $gte: parseInt(startYear) };
      matchQuery['payPeriod.month'] = { $gte: parseInt(startMonth) };
    }
    
    if (endMonth && endYear) {
      matchQuery['payPeriod.year'] = { ...matchQuery['payPeriod.year'], $lte: parseInt(endYear) };
      matchQuery['payPeriod.month'] = { ...matchQuery['payPeriod.month'], $lte: parseInt(endMonth) };
    }

    let pipeline = [{ $match: matchQuery }];

    // Add employee lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeData'
      }
    });

    pipeline.push({ $unwind: '$employeeData' });

    // Filter by department if specified
    if (department) {
      pipeline.push({
        $match: { 'employeeData.department': new mongoose.Types.ObjectId(department) }
      });
    }

    if (reportType === 'summary') {
      pipeline.push({
        $group: {
          _id: {
            month: '$payPeriod.month',
            year: '$payPeriod.year'
          },
          totalEmployees: { $sum: 1 },
          totalGrossSalary: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNetSalary: { $sum: '$netSalary' },
          avgGrossSalary: { $avg: '$grossSalary' },
          avgNetSalary: { $avg: '$netSalary' }
        }
      });
    } else if (reportType === 'detailed') {
      pipeline.push({
        $project: {
          employeeName: { $concat: ['$employeeData.firstName', ' ', '$employeeData.lastName'] },
          employeeId: '$employeeData.employeeId',
          department: '$employeeData.department',
          payPeriod: 1,
          basicSalary: 1,
          allowances: 1,
          deductions: 1,
          grossSalary: 1,
          netSalary: 1,
          status: 1
        }
      });
    }

    const reports = await Payroll.aggregate(pipeline);

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get payroll reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll reports',
      error: error.message
    });
  }
};

module.exports = {
  getPayrolls,
  getPayrollById,
  createOrUpdatePayroll,
  bulkProcessPayroll,
  processPayroll,
  markPayrollAsPaid,
  putPayrollOnHold,
  getPayrollSummary,
  deletePayroll,
  getPayrollReports
};
