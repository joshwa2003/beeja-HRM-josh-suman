const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');

// Database connection
mongoose.connect('mongodb://localhost:27017/hrm-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const initializeAutoCheckoutSettings = async () => {
  try {
    console.log('🔧 Initializing Auto-Checkout Settings...\n');

    // Auto-checkout timeout setting (in minutes)
    await SystemSettings.setSetting(
      'autoCheckoutTimeout',
      '10',
      'Auto-checkout timeout in minutes after inactivity',
      'attendance'
    );
    console.log('✅ Auto-checkout timeout: 10 minutes');

    // Enable/disable auto-checkout feature
    await SystemSettings.setSetting(
      'autoCheckoutEnabled',
      'true',
      'Enable or disable auto-checkout feature',
      'attendance'
    );
    console.log('✅ Auto-checkout enabled: true');

    // Auto-checkout warning time (minutes before auto-checkout)
    await SystemSettings.setSetting(
      'autoCheckoutWarningTime',
      '2',
      'Warning time in minutes before auto-checkout',
      'attendance'
    );
    console.log('✅ Auto-checkout warning time: 2 minutes before');

    // Activity update frequency (in minutes)
    await SystemSettings.setSetting(
      'activityUpdateFrequency',
      '2',
      'How often to update activity status in minutes',
      'attendance'
    );
    console.log('✅ Activity update frequency: 2 minutes');

    console.log('\n🎉 Auto-checkout settings initialized successfully!');
    console.log('\n📋 Current Auto-Checkout Configuration:');
    console.log('   • Timeout: 10 minutes of inactivity');
    console.log('   • Warning: 2 minutes before auto-checkout');
    console.log('   • Activity Updates: Every 2 minutes');
    console.log('   • Feature Status: Enabled');

  } catch (error) {
    console.error('❌ Error initializing auto-checkout settings:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the initialization
initializeAutoCheckoutSettings();
