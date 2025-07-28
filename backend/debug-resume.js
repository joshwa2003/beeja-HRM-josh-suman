const mongoose = require('mongoose');
const Application = require('./models/Application');
const path = require('path');
const fs = require('fs');

mongoose.connect('mongodb://localhost:27017/beeja-hrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const app = await Application.findById('68867e229eb92bbbc9514f9e');
  console.log('Application found:', !!app);
  
  if (app && app.resume) {
    console.log('Resume data:', JSON.stringify(app.resume, null, 2));
    
    const filePath = path.join(__dirname, '..', app.resume.path);
    console.log('Full path would be:', filePath);
    
    // Check if file exists
    try {
      const stats = fs.statSync(filePath);
      console.log('File exists:', true);
      console.log('File size:', stats.size);
    } catch (error) {
      console.log('File exists:', false);
      console.log('Error:', error.message);
      
      // Try without the extra '..' 
      const altPath = path.join(__dirname, app.resume.path);
      console.log('Alternative path:', altPath);
      try {
        const altStats = fs.statSync(altPath);
        console.log('Alternative path exists:', true);
        console.log('Alternative file size:', altStats.size);
      } catch (altError) {
        console.log('Alternative path exists:', false);
        console.log('Alternative error:', altError.message);
      }
    }
  } else {
    console.log('No resume found for this application');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
