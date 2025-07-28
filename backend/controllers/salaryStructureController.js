const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const Department = require('../models/Department');

// Get all salary structures with filters
const getSalaryStructures = async (req, res) => {
  try {
    const {
      isActive,
      role,
      department,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (role) {
      query['applicableFor.roles'] = role;
    }
    
    if (department) {
      query['applicableFor.departments'] = department;
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'applicableFor.departments',
          select: 'name'
        },
        {
          path: 'createdBy',
          select: 'firstName lastName'
        },
        {
          path: 'updatedBy',
          select: 'firstName lastName'
        },
        {
          path: 'approvedBy',
          select: 'firstName lastName'
        }
      ]
    };

    const structures = await SalaryStructure.paginate(query, options);

    res.json({
      success: true,
      data: structures
    });
  } catch (error) {
    console.error('Get salary structures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary structures',
      error: error.message
    });
  }
};

// Get single salary structure by ID
const getSalaryStructureById = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id)
      .populate('applicableFor.departments', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    res.json({
      success: true,
      data: structure
    });
  } catch (error) {
    console.error('Get salary structure by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary structure',
      error: error.message
    });
  }
};

// Create new salary structure
const createSalaryStructure = async (req, res) => {
  try {
    const {
      name,
      description,
      applicableFor,
      basicSalary,
      allowances,
      deductions,
      bonusRules,
      overtimeRules,
      isDefault = false,
      effectiveFrom
    } = req.body;

    // Validate required fields
    if (!name || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'Name and basic salary are required'
      });
    }

    // Check if name already exists
    const existingStructure = await SalaryStructure.findOne({ name, isActive: true });
    if (existingStructure) {
      return res.status(400).json({
        success: false,
        message: 'Salary structure with this name already exists'
      });
    }

    // Create salary structure
    const structureData = {
      name,
      description,
      applicableFor: applicableFor || {},
      basicSalary,
      allowances: allowances || {},
      deductions: deductions || {},
      bonusRules: bonusRules || {},
      overtimeRules: overtimeRules || {},
      isDefault,
      effectiveFrom: effectiveFrom || new Date(),
      createdBy: req.user.id
    };

    const structure = new SalaryStructure(structureData);
    await structure.save();

    // Populate the response
    await structure.populate([
      { path: 'applicableFor.departments', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Salary structure created successfully',
      data: structure
    });
  } catch (error) {
    console.error('Create salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary structure',
      error: error.message
    });
  }
};

// Update salary structure
const updateSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name && updateData.name !== structure.name) {
      const existingStructure = await SalaryStructure.findOne({ 
        name: updateData.name, 
        isActive: true,
        _id: { $ne: id }
      });
      if (existingStructure) {
        return res.status(400).json({
          success: false,
          message: 'Salary structure with this name already exists'
        });
      }
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'createdBy' && key !== 'createdAt') {
        structure[key] = updateData[key];
      }
    });

    structure.updatedBy = req.user.id;
    await structure.save();

    // Populate the response
    await structure.populate([
      { path: 'applicableFor.departments', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'updatedBy', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Salary structure updated successfully',
      data: structure
    });
  } catch (error) {
    console.error('Update salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary structure',
      error: error.message
    });
  }
};

// Delete salary structure (soft delete)
const deleteSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    // Check if structure is being used in any active payrolls
    const Payroll = require('../models/Payroll');
    const activePayrolls = await Payroll.countDocuments({
      // This would require adding salaryStructure reference to Payroll model
      // For now, we'll just deactivate the structure
    });

    // Soft delete by setting isActive to false
    structure.isActive = false;
    structure.updatedBy = req.user.id;
    await structure.save();

    res.json({
      success: true,
      message: 'Salary structure deleted successfully'
    });
  } catch (error) {
    console.error('Delete salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary structure',
      error: error.message
    });
  }
};

// Clone salary structure
const cloneSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({
        success: false,
        message: 'New name is required for cloning'
      });
    }

    // Check if new name already exists
    const existingStructure = await SalaryStructure.findOne({ name: newName, isActive: true });
    if (existingStructure) {
      return res.status(400).json({
        success: false,
        message: 'Salary structure with this name already exists'
      });
    }

    const clonedStructure = await SalaryStructure.cloneStructure(id, newName, req.user.id);

    // Populate the response
    await clonedStructure.populate([
      { path: 'applicableFor.departments', select: 'name' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Salary structure cloned successfully',
      data: clonedStructure
    });
  } catch (error) {
    console.error('Clone salary structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone salary structure',
      error: error.message
    });
  }
};

// Calculate salary preview
const calculateSalaryPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const { basicSalary, employeeData } = req.body;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    const salaryToCalculate = basicSalary || structure.basicSalary;
    const calculation = structure.calculateSalary(salaryToCalculate, employeeData);

    res.json({
      success: true,
      data: {
        structure: {
          id: structure._id,
          name: structure.name
        },
        calculation
      }
    });
  } catch (error) {
    console.error('Calculate salary preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate salary preview',
      error: error.message
    });
  }
};

// Get applicable salary structure for an employee
const getApplicableStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await User.findById(employeeId).populate('department');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const structure = await SalaryStructure.findApplicableStructure({
      role: employee.role,
      department: employee.department?._id,
      designation: employee.designation
    });

    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'No applicable salary structure found for this employee'
      });
    }

    // Calculate salary for this employee
    const calculation = structure.calculateSalary(structure.basicSalary, {
      role: employee.role,
      department: employee.department,
      designation: employee.designation
    });

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          role: employee.role,
          department: employee.department?.name,
          designation: employee.designation
        },
        structure,
        calculation
      }
    });
  } catch (error) {
    console.error('Get applicable structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applicable salary structure',
      error: error.message
    });
  }
};

// Assign salary structure to employees
const assignStructureToEmployees = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds, customBasicSalary } = req.body;

    if (!employeeIds || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs are required'
      });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    const employees = await User.find({ _id: { $in: employeeIds } });
    if (employees.length !== employeeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some employees not found'
      });
    }

    const results = {
      assigned: [],
      errors: []
    };

    // This would typically involve creating a separate EmployeeSalaryStructure model
    // For now, we'll return the assignment preview
    for (const employee of employees) {
      try {
        const basicSalary = customBasicSalary?.[employee._id.toString()] || structure.basicSalary;
        const calculation = structure.calculateSalary(basicSalary, {
          role: employee.role,
          department: employee.department,
          designation: employee.designation
        });

        results.assigned.push({
          employee: {
            id: employee._id,
            name: `${employee.firstName} ${employee.lastName}`,
            role: employee.role,
            designation: employee.designation
          },
          basicSalary,
          calculation
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
      message: 'Salary structure assignment preview generated',
      data: {
        structure: {
          id: structure._id,
          name: structure.name
        },
        results
      }
    });
  } catch (error) {
    console.error('Assign structure to employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign salary structure',
      error: error.message
    });
  }
};

// Get salary structure templates
const getSalaryTemplates = async (req, res) => {
  try {
    const templates = await SalaryStructure.find({ isActive: true })
      .select('name description basicSalary allowances deductions isDefault')
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get salary templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary templates',
      error: error.message
    });
  }
};

// Set default salary structure
const setDefaultStructure = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    // Remove default from all other structures
    await SalaryStructure.updateMany(
      { _id: { $ne: id } },
      { isDefault: false }
    );

    // Set this structure as default
    structure.isDefault = true;
    structure.updatedBy = req.user.id;
    await structure.save();

    res.json({
      success: true,
      message: 'Default salary structure updated successfully',
      data: structure
    });
  } catch (error) {
    console.error('Set default structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default salary structure',
      error: error.message
    });
  }
};

// Preview salary calculation
const previewSalaryCalculation = async (req, res) => {
  try {
    const { structureData, basicSalary } = req.body;

    if (!structureData || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'Structure data and basic salary are required'
      });
    }

    // Use the static preview method
    const calculation = SalaryStructure.previewCalculation(structureData, basicSalary);

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Preview calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview salary calculation',
      error: error.message
    });
  }
};

// Create new version of salary structure
const createNewVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { changes, effectiveFrom, description } = req.body;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    const newVersion = await structure.createNewVersion({
      data: changes,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      description
    }, req.user.id);

    await newVersion.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'New version created successfully',
      data: newVersion
    });
  } catch (error) {
    console.error('Create new version error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create new version',
      error: error.message
    });
  }
};

// Get version history
const getVersionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    const versions = await structure.getVersionHistory();

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get version history',
      error: error.message
    });
  }
};

// Approve salary structure
const approveStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    if (structure.status !== 'Pending Approval') {
      return res.status(400).json({
        success: false,
        message: 'Only structures pending approval can be approved'
      });
    }

    structure.status = 'Approved';
    structure.approvedBy = req.user.id;
    structure.approvedAt = new Date();
    structure.isActive = true;
    
    if (comments) {
      structure.versionHistory.push({
        version: structure.version,
        changes: `Approved: ${comments}`,
        changedBy: req.user.id,
        changedAt: new Date()
      });
    }

    await structure.save();
    await structure.populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Salary structure approved successfully',
      data: structure
    });
  } catch (error) {
    console.error('Approve structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve salary structure',
      error: error.message
    });
  }
};

// Reject salary structure
const rejectStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const structure = await SalaryStructure.findById(id);
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'Salary structure not found'
      });
    }

    structure.status = 'Rejected';
    structure.versionHistory.push({
      version: structure.version,
      changes: `Rejected: ${reason}`,
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await structure.save();

    res.json({
      success: true,
      message: 'Salary structure rejected',
      data: structure
    });
  } catch (error) {
    console.error('Reject structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject salary structure',
      error: error.message
    });
  }
};

module.exports = {
  getSalaryStructures,
  getSalaryStructureById,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  cloneSalaryStructure,
  calculateSalaryPreview,
  getApplicableStructure,
  assignStructureToEmployees,
  getSalaryTemplates,
  setDefaultStructure,
  previewSalaryCalculation,
  createNewVersion,
  getVersionHistory,
  approveStructure,
  rejectStructure
};
