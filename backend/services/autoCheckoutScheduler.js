const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const SystemSettings = require('../models/SystemSettings');

class AutoCheckoutScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  // Start the auto-checkout scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️  Auto-checkout scheduler is already running');
      return;
    }

    // Run every 5 minutes to check for inactive employees
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkAndAutoCheckout();
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata' // Adjust timezone as needed
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('🤖 Auto-checkout scheduler started - checking every 5 minutes');
  }

  // Stop the auto-checkout scheduler
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto-checkout scheduler stopped');
  }

  // Check for inactive employees and auto-checkout
  async checkAndAutoCheckout() {
    try {
      // Check if auto-checkout is enabled
      const isEnabled = await SystemSettings.getSetting('autoCheckoutEnabled', 'true');
      if (isEnabled !== 'true') {
        return; // Auto-checkout is disabled
      }

      console.log('🔍 Checking for inactive employees...');
      
      const autoCheckedOutEmployees = await Attendance.autoCheckoutInactiveEmployees();
      
      if (autoCheckedOutEmployees.length > 0) {
        console.log(`🤖 Auto-checked out ${autoCheckedOutEmployees.length} employees:`);
        
        autoCheckedOutEmployees.forEach((emp, index) => {
          console.log(`   ${index + 1}. ${emp.employee.firstName} ${emp.employee.lastName} - ${emp.employee.email}`);
        });

        // Here you could add email notifications to HR/Admin about auto-checkouts
        await this.notifyAutoCheckouts(autoCheckedOutEmployees);
      } else {
        console.log('✅ No employees need auto-checkout at this time');
      }

    } catch (error) {
      console.error('❌ Error in auto-checkout scheduler:', error);
    }
  }

  // Notify HR/Admin about auto-checkouts (optional)
  async notifyAutoCheckouts(employees) {
    try {
      // This is where you could send email notifications
      // For now, just log the information
      console.log('📧 Auto-checkout notifications would be sent for:');
      employees.forEach(emp => {
        console.log(`   • ${emp.employee.firstName} ${emp.employee.lastName} (${emp.employee.email})`);
        console.log(`     Auto-checked out at: ${emp.checkOutTime.toLocaleString()}`);
      });

      // TODO: Implement email notification service
      // const emailService = require('./emailService');
      // await emailService.sendAutoCheckoutNotification(employees);

    } catch (error) {
      console.error('❌ Error sending auto-checkout notifications:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null
    };
  }

  // Manual trigger for testing
  async manualTrigger() {
    console.log('🔧 Manual auto-checkout check triggered');
    await this.checkAndAutoCheckout();
  }
}

// Create singleton instance
const autoCheckoutScheduler = new AutoCheckoutScheduler();

module.exports = autoCheckoutScheduler;
