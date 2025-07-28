const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const SalaryStructure = require('../models/SalaryStructure');
const Payroll = require('../models/Payroll');
const Reimbursement = require('../models/Reimbursement');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for payroll data creation');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createPayrollData = async () => {
  try {
    console.log('🚀 Starting payroll data creation...');

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ role: 'Admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run createAdmin.js first.');
      return;
    }

    // Get all departments
    const departments = await Department.find();
    if (departments.length === 0) {
      console.error('❌ No departments found. Please run createDepartments.js first.');
      return;
    }

    // Get all active employees
    const employees = await User.find({ isActive: true, role: { $ne: 'Admin' } });
    if (employees.length === 0) {
      console.error('❌ No employees found. Please run createDummyUsers.js first.');
      return;
    }

    console.log(`📊 Found ${employees.length} employees to create payroll data for`);

    // 1. Create Salary Structures
    console.log('💰 Creating salary structures...');
    
    const salaryStructures = [
      {
        name: 'Junior Employee Structure',
        description: 'Standard salary structure for junior level employees',
        basicSalary: 25000,
        applicableFor: {
          roles: ['Employee'],
          designations: ['Junior Developer', 'Junior Analyst', 'Associate']
        },
        allowances: {
          hra: { type: 'percentage', value: 40, maxLimit: 10000 },
          da: { type: 'percentage', value: 5, maxLimit: null },
          ta: { type: 'fixed', value: 1600, maxLimit: null },
          medical: { type: 'fixed', value: 1250, maxLimit: null },
          special: { type: 'percentage', value: 10, maxLimit: null }
        },
        deductions: {
          epf: { type: 'percentage', value: 12, maxLimit: 1800 },
          esi: { type: 'percentage', value: 0.75, applicableUpTo: 21000 },
          professionalTax: { type: 'fixed', value: 200 },
          incomeTax: { type: 'percentage', value: 0 }
        },
        bonusRules: {
          annual: { type: 'percentage', value: 8.33, maxLimit: 7000 }
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Senior Employee Structure',
        description: 'Salary structure for senior level employees',
        basicSalary: 45000,
        applicableFor: {
          roles: ['Team Leader'],
          designations: ['Senior Developer', 'Senior Analyst', 'Team Lead']
        },
        allowances: {
          hra: { type: 'percentage', value: 40, maxLimit: 18000 },
          da: { type: 'percentage', value: 8, maxLimit: null },
          ta: { type: 'fixed', value: 2500, maxLimit: null },
          medical: { type: 'fixed', value: 2000, maxLimit: null },
          special: { type: 'percentage', value: 15, maxLimit: null }
        },
        deductions: {
          epf: { type: 'percentage', value: 12, maxLimit: 1800 },
          esi: { type: 'percentage', value: 0, applicableUpTo: 21000 },
          professionalTax: { type: 'fixed', value: 200 },
          incomeTax: { type: 'percentage', value: 5 }
        },
        bonusRules: {
          annual: { type: 'percentage', value: 8.33, maxLimit: 7000 },
          performance: { type: 'percentage', value: 10, maxLimit: 15000 }
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Management Structure',
        description: 'Salary structure for management positions',
        basicSalary: 75000,
        applicableFor: {
          roles: ['Team Manager', 'HR Manager', 'HR Executive'],
          designations: ['Manager', 'Assistant Manager', 'HR Manager']
        },
        allowances: {
          hra: { type: 'percentage', value: 40, maxLimit: 30000 },
          da: { type: 'percentage', value: 10, maxLimit: null },
          ta: { type: 'fixed', value: 4000, maxLimit: null },
          medical: { type: 'fixed', value: 3000, maxLimit: null },
          special: { type: 'percentage', value: 20, maxLimit: null }
        },
        deductions: {
          epf: { type: 'percentage', value: 12, maxLimit: 1800 },
          esi: { type: 'percentage', value: 0, applicableUpTo: 21000 },
          professionalTax: { type: 'fixed', value: 200 },
          incomeTax: { type: 'percentage', value: 10 }
        },
        bonusRules: {
          annual: { type: 'percentage', value: 8.33, maxLimit: 7000 },
          performance: { type: 'percentage', value: 15, maxLimit: 25000 }
        },
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Executive Structure',
        description: 'Salary structure for executive positions',
        basicSalary: 120000,
        applicableFor: {
          roles: ['HR BP', 'Vice President'],
          designations: ['Vice President', 'HR Business Partner', 'Director']
        },
        allowances: {
          hra: { type: 'percentage', value: 40, maxLimit: 48000 },
          da: { type: 'percentage', value: 12, maxLimit: null },
          ta: { type: 'fixed', value: 6000, maxLimit: null },
          medical: { type: 'fixed', value: 5000, maxLimit: null },
          special: { type: 'percentage', value: 25, maxLimit: null }
        },
        deductions: {
          epf: { type: 'percentage', value: 12, maxLimit: 1800 },
          esi: { type: 'percentage', value: 0, applicableUpTo: 21000 },
          professionalTax: { type: 'fixed', value: 200 },
          incomeTax: { type: 'percentage', value: 20 }
        },
        bonusRules: {
          annual: { type: 'percentage', value: 8.33, maxLimit: 7000 },
          performance: { type: 'percentage', value: 20, maxLimit: 50000 }
        },
        isActive: true,
        isDefault: false,
        createdBy: adminUser._id
      }
    ];

    // Clear existing salary structures
    await SalaryStructure.deleteMany({});
    
    // Create salary structures
    const createdStructures = await SalaryStructure.insertMany(salaryStructures);
    console.log(`✅ Created ${createdStructures.length} salary structures`);

    // Set first structure as default
    await SalaryStructure.findByIdAndUpdate(createdStructures[0]._id, { isDefault: true });

    // 2. Create Payroll Records for Current Month
    console.log('📋 Creating payroll records...');
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Clear existing payroll records for current month
    await Payroll.deleteMany({
      'payPeriod.month': currentMonth,
      'payPeriod.year': currentYear
    });

    const payrollRecords = [];

    for (const employee of employees) {
      // Find applicable salary structure
      let applicableStructure = createdStructures.find(structure => 
        structure.applicableFor.roles.includes(employee.role)
      );

      // If no specific structure found, use default
      if (!applicableStructure) {
        applicableStructure = createdStructures[0];
      }

      // Calculate salary using the structure
      const calculation = applicableStructure.calculateSalary(applicableStructure.basicSalary);

      // Calculate totals manually
      const totalAllowances = Object.values(calculation.allowances).reduce((sum, val) => sum + (val || 0), 0);
      const totalDeductions = Object.values(calculation.deductions).reduce((sum, val) => sum + (val || 0), 0);
      const grossSalary = calculation.basic + totalAllowances;
      const netSalary = grossSalary - totalDeductions;

      const payrollRecord = {
        employee: employee._id,
        payPeriod: { month: currentMonth, year: currentYear },
        basicSalary: calculation.basic,
        allowances: calculation.allowances,
        deductions: calculation.deductions,
        overtime: { hours: 0, rate: 0, amount: 0 },
        bonus: 0,
        incentives: 0,
        reimbursements: [],
        grossSalary: grossSalary,
        totalDeductions: totalDeductions,
        netSalary: netSalary,
        attendance: {
          workingDays: 22,
          presentDays: Math.floor(Math.random() * 3) + 20, // 20-22 days
          absentDays: Math.floor(Math.random() * 2), // 0-1 days
          leaveDays: Math.floor(Math.random() * 2), // 0-1 days
          holidayDays: 2
        },
        status: Math.random() > 0.3 ? 'Processed' : 'Draft', // 70% processed, 30% draft
        createdBy: adminUser._id
      };

      // Some records should be paid
      if (payrollRecord.status === 'Processed' && Math.random() > 0.5) {
        payrollRecord.status = 'Paid';
        payrollRecord.paidDate = new Date();
        payrollRecord.paymentMethod = 'Bank Transfer';
      }

      payrollRecords.push(payrollRecord);
    }

    const createdPayrolls = await Payroll.insertMany(payrollRecords);
    console.log(`✅ Created ${createdPayrolls.length} payroll records for ${currentMonth}/${currentYear}`);

    // 3. Create Sample Reimbursements
    console.log('🧾 Creating reimbursement records...');

    // Clear existing reimbursements
    await Reimbursement.deleteMany({});

    const reimbursementCategories = ['Travel', 'Food', 'Internet', 'Medical', 'Communication'];
    const reimbursementStatuses = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Paid'];
    const priorities = ['Low', 'Normal', 'High'];

    const reimbursements = [];

    // Create 20 sample reimbursements
    for (let i = 0; i < 20; i++) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      const randomCategory = reimbursementCategories[Math.floor(Math.random() * reimbursementCategories.length)];
      const randomStatus = reimbursementStatuses[Math.floor(Math.random() * reimbursementStatuses.length)];
      const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
      
      // Get reporting manager for approval chain
      const reportingManager = randomEmployee.reportingManager ? 
        await User.findById(randomEmployee.reportingManager) : 
        await User.findOne({ role: { $in: ['Team Manager', 'HR Manager'] } });

      const approvalChain = [];
      if (reportingManager) {
        approvalChain.push({
          approver: reportingManager._id,
          role: 'Manager',
          action: randomStatus === 'Submitted' ? 'Pending' : 'Approved',
          order: 1
        });
      }

      // Add HR approval for higher amounts
      const amount = Math.floor(Math.random() * 15000) + 500; // 500-15500
      if (amount > 5000) {
        const hrManager = await User.findOne({ role: { $in: ['HR Manager', 'HR BP'] } });
        if (hrManager) {
          approvalChain.push({
            approver: hrManager._id,
            role: 'HR',
            action: randomStatus === 'Approved' || randomStatus === 'Paid' ? 'Approved' : 'Pending',
            order: 2
          });
        }
      }

      const expenseDate = new Date();
      expenseDate.setDate(expenseDate.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

      const reimbursement = {
        employee: randomEmployee._id,
        category: randomCategory,
        amount: amount,
        currency: 'INR',
        description: `${randomCategory} expense for business purpose - Sample data`,
        expenseDate: expenseDate,
        businessPurpose: `Business ${randomCategory.toLowerCase()} expense for project work`,
        receipts: [{
          fileName: `receipt_${i + 1}.pdf`,
          originalName: `Receipt ${i + 1}.pdf`,
          fileUrl: `/uploads/receipts/receipt_${i + 1}.pdf`,
          filePath: `receipts/receipt_${i + 1}.pdf`,
          fileSize: Math.floor(Math.random() * 500000) + 100000,
          mimeType: 'application/pdf',
          uploadedAt: new Date()
        }],
        status: randomStatus,
        approvalChain: approvalChain,
        currentApprover: randomStatus === 'Submitted' || randomStatus === 'Under Review' ? 
          (approvalChain.length > 0 ? approvalChain[0].approver : null) : null,
        priority: randomPriority,
        auditTrail: [{
          action: 'Created',
          performedBy: randomEmployee._id,
          timestamp: new Date(),
          details: 'Reimbursement request created'
        }],
        createdBy: randomEmployee._id
      };

      // Add payment details for paid reimbursements
      if (randomStatus === 'Paid') {
        reimbursement.paymentDetails = {
          method: 'Bank Transfer',
          paidAmount: amount,
          paidDate: new Date(),
          transactionId: `TXN${Date.now()}${i}`,
          processedBy: adminUser._id
        };
      }

      reimbursements.push(reimbursement);
    }

    const createdReimbursements = await Reimbursement.insertMany(reimbursements);
    console.log(`✅ Created ${createdReimbursements.length} reimbursement records`);

    // 4. Create Previous Month Payroll for Comparison
    console.log('📊 Creating previous month payroll data...');
    
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const prevPayrollRecords = [];

    for (const employee of employees.slice(0, Math.floor(employees.length * 0.8))) { // 80% of employees
      let applicableStructure = createdStructures.find(structure => 
        structure.applicableFor.roles.includes(employee.role)
      );

      if (!applicableStructure) {
        applicableStructure = createdStructures[0];
      }

      const calculation = applicableStructure.calculateSalary(applicableStructure.basicSalary);

      const overtimeHours = Math.floor(Math.random() * 10);
      const overtimeRate = Math.floor(calculation.basic / 22 / 8); // Hourly rate
      const overtimeAmount = overtimeHours * overtimeRate;
      const bonus = Math.random() > 0.7 ? Math.floor(Math.random() * 5000) : 0;
      const incentives = Math.random() > 0.8 ? Math.floor(Math.random() * 3000) : 0;

      // Calculate totals manually
      const totalAllowances = Object.values(calculation.allowances).reduce((sum, val) => sum + (val || 0), 0);
      const totalDeductions = Object.values(calculation.deductions).reduce((sum, val) => sum + (val || 0), 0);
      const grossSalary = calculation.basic + totalAllowances + overtimeAmount + bonus + incentives;
      const netSalary = grossSalary - totalDeductions;

      const payrollRecord = {
        employee: employee._id,
        payPeriod: { month: prevMonth, year: prevYear },
        basicSalary: calculation.basic,
        allowances: calculation.allowances,
        deductions: calculation.deductions,
        overtime: { 
          hours: overtimeHours, 
          rate: overtimeRate,
          amount: overtimeAmount 
        },
        bonus: bonus,
        incentives: incentives,
        reimbursements: [],
        grossSalary: grossSalary,
        totalDeductions: totalDeductions,
        netSalary: netSalary,
        attendance: {
          workingDays: 22,
          presentDays: Math.floor(Math.random() * 3) + 20,
          absentDays: Math.floor(Math.random() * 2),
          leaveDays: Math.floor(Math.random() * 2),
          holidayDays: 2
        },
        status: 'Paid', // All previous month records are paid
        paidDate: new Date(prevYear, prevMonth - 1, 28),
        paymentMethod: 'Bank Transfer',
        processedDate: new Date(prevYear, prevMonth - 1, 25),
        processedBy: adminUser._id,
        createdBy: adminUser._id
      };

      prevPayrollRecords.push(payrollRecord);
    }

    const createdPrevPayrolls = await Payroll.insertMany(prevPayrollRecords);
    console.log(`✅ Created ${createdPrevPayrolls.length} previous month payroll records for ${prevMonth}/${prevYear}`);

    console.log('\n🎉 Payroll data creation completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • ${createdStructures.length} Salary Structures`);
    console.log(`   • ${createdPayrolls.length} Current Month Payrolls (${currentMonth}/${currentYear})`);
    console.log(`   • ${createdPrevPayrolls.length} Previous Month Payrolls (${prevMonth}/${prevYear})`);
    console.log(`   • ${createdReimbursements.length} Reimbursement Records`);
    console.log('\n🚀 You can now test the payroll system with realistic data!');

  } catch (error) {
    console.error('❌ Error creating payroll data:', error);
  }
};

const main = async () => {
  await connectDB();
  await createPayrollData();
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createPayrollData };
