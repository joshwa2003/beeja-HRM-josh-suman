const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

const initializeDefaultSettings = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Initialize default work hours settings
    const defaultSettings = [
      {
        key: 'work_hours_checkin',
        value: '11:40',
        description: 'Standard check-in time - 11:40 AM (24-hour format)',
        category: 'attendance'
      },
      {
        key: 'work_hours_checkout',
        value: '11:50',
        description: 'Standard check-out time - 11:50 AM (24-hour format)',
        category: 'attendance'
      },
      {
        key: 'daily_working_hours',
        value: 0.167,
        description: 'Required daily working hours (10 minutes = 0.167 hours)',
        category: 'attendance'
      },
      {
        key: 'late_threshold_minutes',
        value: 30,
        description: 'Minutes after which employee is marked as Late (not just Present)',
        category: 'attendance'
      },
      {
        key: 'break_time_minutes',
        value: 60,
        description: 'Default break time in minutes',
        category: 'attendance'
      }
    ];

    for (const setting of defaultSettings) {
      await SystemSettings.setSetting(
        setting.key,
        setting.value,
        setting.description,
        setting.category
      );
      console.log(`✅ Initialized setting: ${setting.key} = ${setting.value}`);
    }

    console.log('\n🎉 All default settings initialized successfully!');
    console.log('\nWork Hours Configuration:');
    console.log('- Check-in Time: 11:40 AM');
    console.log('- Check-out Time: 11:50 AM');
    console.log('- Working Duration: 10 minutes');
    console.log('- Late Threshold: 30 minutes');
    console.log('- Overtime: Any work after 11:50 AM will be tracked as overtime');

    process.exit(0);
  } catch (error) {
    console.error('Error initializing settings:', error);
    process.exit(1);
  }
};

initializeDefaultSettings();
