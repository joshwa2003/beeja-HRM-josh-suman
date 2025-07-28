const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const initializeSystemSettings = async () => {
  try {
    console.log('🔧 Initializing System Settings...');
    
    // Default work hours settings
    const defaultSettings = [
      {
        settingKey: 'checkInTime',
        settingValue: '09:00',
        description: 'Standard check-in time for all employees',
        category: 'attendance'
      },
      {
        settingKey: 'checkOutTime',
        settingValue: '18:00',
        description: 'Standard check-out time for all employees',
        category: 'attendance'
      },
      {
        settingKey: 'workingHours',
        settingValue: '8',
        description: 'Required working hours per day',
        category: 'attendance'
      },
      {
        settingKey: 'minimumWorkHours',
        settingValue: '6',
        description: 'Minimum required working hours per day',
        category: 'attendance'
      },
      {
        settingKey: 'lateThreshold',
        settingValue: '30',
        description: 'Minutes after which employee is marked as late',
        category: 'attendance'
      },
      {
        settingKey: 'breakTime',
        settingValue: '60',
        description: 'Default break time in minutes',
        category: 'attendance'
      }
    ];

    // Create or update each setting
    for (const setting of defaultSettings) {
      const existingSetting = await SystemSettings.findOne({ settingKey: setting.settingKey });
      
      if (!existingSetting) {
        await SystemSettings.create({
          ...setting,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created setting: ${setting.settingKey} = ${setting.settingValue}`);
      } else {
        console.log(`⚡ Setting already exists: ${setting.settingKey} = ${existingSetting.settingValue}`);
      }
    }

    console.log('🎉 System Settings initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing system settings:', error);
    throw error;
  }
};

// If this script is run directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('📊 MongoDB connected for system settings initialization');
    await initializeSystemSettings();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
}

module.exports = initializeSystemSettings;
