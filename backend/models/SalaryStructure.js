const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const salaryStructureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Salary structure name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Applicable criteria
  applicableFor: {
    roles: [{
      type: String,
      enum: [
        'Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive',
        'Team Manager', 'Team Leader', 'Employee'
      ]
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    designations: [String],
    experienceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 50 }
    }
  },

  // Salary Components
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Basic salary cannot be negative']
  },
  
  // Allowances (can be percentage or fixed amount)
  allowances: {
    hra: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 40 }, // 40% or fixed amount
      maxLimit: { type: Number, default: null }
    },
    da: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0 },
      maxLimit: { type: Number, default: null }
    },
    ta: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
      value: { type: Number, default: 1600 },
      maxLimit: { type: Number, default: null }
    },
    medical: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
      value: { type: Number, default: 1250 },
      maxLimit: { type: Number, default: null }
    },
    special: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 10 },
      maxLimit: { type: Number, default: null }
    },
    other: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
      value: { type: Number, default: 0 },
      maxLimit: { type: Number, default: null }
    }
  },

  // Custom allowance components
  customAllowances: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    maxLimit: { type: Number, default: null },
    description: String,
    isActive: { type: Boolean, default: true }
  }],

  // Deductions (can be percentage or fixed amount)
  deductions: {
    epf: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 12 }, // 12% of basic
      maxLimit: { type: Number, default: 1800 } // Max EPF limit
    },
    esi: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0.75 }, // 0.75% if applicable
      applicableUpTo: { type: Number, default: 21000 }, // ESI applicable up to 21k
      maxLimit: { type: Number, default: null }
    },
    professionalTax: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
      value: { type: Number, default: 200 },
      maxLimit: { type: Number, default: null }
    },
    incomeTax: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0 }, // Will be calculated based on tax slabs
      maxLimit: { type: Number, default: null }
    }
  },

  // Custom deduction components
  customDeductions: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    maxLimit: { type: Number, default: null },
    description: String,
    isActive: { type: Boolean, default: true }
  }],

  // Bonus and Incentive Rules
  bonusRules: {
    annual: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 8.33 }, // 8.33% of basic for statutory bonus
      maxLimit: { type: Number, default: 7000 }
    },
    performance: {
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0 },
      maxLimit: { type: Number, default: null }
    }
  },

  // Overtime Rules
  overtimeRules: {
    enabled: { type: Boolean, default: true },
    rate: { type: Number, default: 2 }, // 2x of hourly rate
    calculation: { type: String, enum: ['hourly', 'daily'], default: 'hourly' }
  },

  // Versioning and History
  parentStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    default: null
  },
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    changes: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status and Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  
  // Approval workflow
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Archived'],
    default: 'Draft'
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
salaryStructureSchema.index({ name: 1 });
salaryStructureSchema.index({ isActive: 1 });
salaryStructureSchema.index({ isDefault: 1 });
salaryStructureSchema.index({ 'applicableFor.roles': 1 });
salaryStructureSchema.index({ 'applicableFor.departments': 1 });

// Method to calculate salary components for a given basic salary
salaryStructureSchema.methods.calculateSalary = function(basicSalary, employeeData = {}) {
  const calculation = {
    basic: basicSalary,
    allowances: {},
    customAllowances: {},
    deductions: {},
    customDeductions: {},
    gross: 0,
    totalDeductions: 0,
    net: 0
  };

  // Calculate standard allowances
  Object.keys(this.allowances).forEach(key => {
    const allowance = this.allowances[key];
    if (allowance.type === 'percentage') {
      calculation.allowances[key] = Math.round((basicSalary * allowance.value) / 100);
    } else {
      calculation.allowances[key] = allowance.value;
    }
    
    // Apply max limit if specified
    if (allowance.maxLimit && calculation.allowances[key] > allowance.maxLimit) {
      calculation.allowances[key] = allowance.maxLimit;
    }
  });

  // Calculate custom allowances
  this.customAllowances.forEach(allowance => {
    if (allowance.isActive) {
      let amount = 0;
      if (allowance.type === 'percentage') {
        amount = Math.round((basicSalary * allowance.value) / 100);
      } else {
        amount = allowance.value;
      }
      
      // Apply max limit if specified
      if (allowance.maxLimit && amount > allowance.maxLimit) {
        amount = allowance.maxLimit;
      }
      
      calculation.customAllowances[allowance.name] = amount;
    }
  });

  // Calculate gross salary
  const totalAllowances = Object.values(calculation.allowances).reduce((sum, val) => sum + val, 0);
  const totalCustomAllowances = Object.values(calculation.customAllowances).reduce((sum, val) => sum + val, 0);
  calculation.gross = basicSalary + totalAllowances + totalCustomAllowances;

  // Calculate standard deductions
  Object.keys(this.deductions).forEach(key => {
    const deduction = this.deductions[key];
    let deductionAmount = 0;

    if (key === 'esi' && calculation.gross > deduction.applicableUpTo) {
      // ESI not applicable if gross > limit
      deductionAmount = 0;
    } else if (deduction.type === 'percentage') {
      if (key === 'epf') {
        // EPF calculated on basic salary
        deductionAmount = Math.round((basicSalary * deduction.value) / 100);
      } else if (key === 'esi') {
        // ESI calculated on gross salary
        deductionAmount = Math.round((calculation.gross * deduction.value) / 100);
      } else {
        deductionAmount = Math.round((calculation.gross * deduction.value) / 100);
      }
    } else {
      deductionAmount = deduction.value;
    }

    // Apply max limit if specified
    if (deduction.maxLimit && deductionAmount > deduction.maxLimit) {
      deductionAmount = deduction.maxLimit;
    }

    calculation.deductions[key] = deductionAmount;
  });

  // Calculate custom deductions
  this.customDeductions.forEach(deduction => {
    if (deduction.isActive) {
      let amount = 0;
      if (deduction.type === 'percentage') {
        amount = Math.round((calculation.gross * deduction.value) / 100);
      } else {
        amount = deduction.value;
      }
      
      // Apply max limit if specified
      if (deduction.maxLimit && amount > deduction.maxLimit) {
        amount = deduction.maxLimit;
      }
      
      calculation.customDeductions[deduction.name] = amount;
    }
  });

  // Calculate total deductions and net salary
  const totalStandardDeductions = Object.values(calculation.deductions).reduce((sum, val) => sum + val, 0);
  const totalCustomDeductions = Object.values(calculation.customDeductions).reduce((sum, val) => sum + val, 0);
  calculation.totalDeductions = totalStandardDeductions + totalCustomDeductions;
  calculation.net = calculation.gross - calculation.totalDeductions;

  return calculation;
};

// Static method to find applicable salary structure for an employee
salaryStructureSchema.statics.findApplicableStructure = async function(employeeData) {
  const query = {
    isActive: true,
    $or: [
      { 'applicableFor.roles': employeeData.role },
      { 'applicableFor.departments': employeeData.department },
      { 'applicableFor.designations': employeeData.designation }
    ]
  };

  // Find structures and sort by specificity (most specific first)
  const structures = await this.find(query).sort({ createdAt: -1 });
  
  // Return the most specific match or default structure
  return structures.length > 0 ? structures[0] : await this.findOne({ isDefault: true, isActive: true });
};

// Static method to clone structure for modifications
salaryStructureSchema.statics.cloneStructure = async function(structureId, newName, userId) {
  const originalStructure = await this.findById(structureId);
  if (!originalStructure) {
    throw new Error('Original salary structure not found');
  }

  const clonedData = originalStructure.toObject();
  delete clonedData._id;
  delete clonedData.createdAt;
  delete clonedData.updatedAt;
  
  clonedData.name = newName;
  clonedData.version = 1;
  clonedData.isDefault = false;
  clonedData.createdBy = userId;
  clonedData.effectiveFrom = new Date();

  return await this.create(clonedData);
};

// Method to create new version of existing structure
salaryStructureSchema.methods.createNewVersion = async function(changes, userId) {
  // Archive current version if it's active
  if (this.isActive) {
    this.effectiveTo = new Date();
    this.status = 'Archived';
    await this.save();
  }

  // Create new version
  const newVersionData = this.toObject();
  delete newVersionData._id;
  delete newVersionData.createdAt;
  delete newVersionData.updatedAt;
  
  newVersionData.version = this.version + 1;
  newVersionData.parentStructure = this._id;
  newVersionData.effectiveFrom = changes.effectiveFrom || new Date();
  newVersionData.effectiveTo = null;
  newVersionData.status = 'Draft';
  newVersionData.createdBy = userId;
  newVersionData.updatedBy = userId;
  
  // Add to version history
  newVersionData.versionHistory = [...(this.versionHistory || []), {
    version: this.version,
    changes: changes.description || 'Structure updated',
    changedBy: userId,
    changedAt: new Date()
  }];

  // Apply changes
  Object.assign(newVersionData, changes.data || {});

  return await this.constructor.create(newVersionData);
};

// Method to get version history
salaryStructureSchema.methods.getVersionHistory = async function() {
  const versions = await this.constructor.find({
    $or: [
      { _id: this._id },
      { parentStructure: this._id },
      { parentStructure: this.parentStructure }
    ]
  }).sort({ version: -1 }).populate('createdBy updatedBy', 'firstName lastName');

  return versions;
};

// Static method to preview salary calculation
salaryStructureSchema.statics.previewCalculation = function(structureData, basicSalary) {
  // Create a temporary structure object for calculation
  const tempStructure = {
    allowances: structureData.allowances || {},
    customAllowances: structureData.customAllowances || [],
    deductions: structureData.deductions || {},
    customDeductions: structureData.customDeductions || []
  };

  // Use the same calculation logic as the instance method
  const calculation = {
    basic: basicSalary,
    allowances: {},
    customAllowances: {},
    deductions: {},
    customDeductions: {},
    gross: 0,
    totalDeductions: 0,
    net: 0
  };

  // Calculate standard allowances
  Object.keys(tempStructure.allowances).forEach(key => {
    const allowance = tempStructure.allowances[key];
    if (allowance.type === 'percentage') {
      calculation.allowances[key] = Math.round((basicSalary * allowance.value) / 100);
    } else {
      calculation.allowances[key] = allowance.value;
    }
    
    if (allowance.maxLimit && calculation.allowances[key] > allowance.maxLimit) {
      calculation.allowances[key] = allowance.maxLimit;
    }
  });

  // Calculate custom allowances
  tempStructure.customAllowances.forEach(allowance => {
    if (allowance.isActive !== false) {
      let amount = 0;
      if (allowance.type === 'percentage') {
        amount = Math.round((basicSalary * allowance.value) / 100);
      } else {
        amount = allowance.value;
      }
      
      if (allowance.maxLimit && amount > allowance.maxLimit) {
        amount = allowance.maxLimit;
      }
      
      calculation.customAllowances[allowance.name] = amount;
    }
  });

  // Calculate gross salary
  const totalAllowances = Object.values(calculation.allowances).reduce((sum, val) => sum + val, 0);
  const totalCustomAllowances = Object.values(calculation.customAllowances).reduce((sum, val) => sum + val, 0);
  calculation.gross = basicSalary + totalAllowances + totalCustomAllowances;

  // Calculate standard deductions
  Object.keys(tempStructure.deductions).forEach(key => {
    const deduction = tempStructure.deductions[key];
    let deductionAmount = 0;

    if (key === 'esi' && calculation.gross > (deduction.applicableUpTo || 21000)) {
      deductionAmount = 0;
    } else if (deduction.type === 'percentage') {
      if (key === 'epf') {
        deductionAmount = Math.round((basicSalary * deduction.value) / 100);
      } else {
        deductionAmount = Math.round((calculation.gross * deduction.value) / 100);
      }
    } else {
      deductionAmount = deduction.value;
    }

    if (deduction.maxLimit && deductionAmount > deduction.maxLimit) {
      deductionAmount = deduction.maxLimit;
    }

    calculation.deductions[key] = deductionAmount;
  });

  // Calculate custom deductions
  tempStructure.customDeductions.forEach(deduction => {
    if (deduction.isActive !== false) {
      let amount = 0;
      if (deduction.type === 'percentage') {
        amount = Math.round((calculation.gross * deduction.value) / 100);
      } else {
        amount = deduction.value;
      }
      
      if (deduction.maxLimit && amount > deduction.maxLimit) {
        amount = deduction.maxLimit;
      }
      
      calculation.customDeductions[deduction.name] = amount;
    }
  });

  // Calculate totals
  const totalStandardDeductions = Object.values(calculation.deductions).reduce((sum, val) => sum + val, 0);
  const totalCustomDeductions = Object.values(calculation.customDeductions).reduce((sum, val) => sum + val, 0);
  calculation.totalDeductions = totalStandardDeductions + totalCustomDeductions;
  calculation.net = calculation.gross - calculation.totalDeductions;

  return calculation;
};

// Pre-save middleware to ensure only one default structure
salaryStructureSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default flag from other structures
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Add pagination plugin
salaryStructureSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
