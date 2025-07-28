const mongoose = require('mongoose');
const Application = require('./models/Application');

mongoose.connect('mongodb://localhost:27017/beeja-hrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const apps = await Application.find({}).limit(10);
  console.log('Found', apps.length, 'total applications');
  
  apps.forEach((app, index) => {
    console.log(`Application ${index + 1}:`);
    console.log('  ID:', app._id);
    console.log('  Name:', app.firstName, app.lastName);
    console.log('  Email:', app.email);
    console.log('  Resume field exists:', !!app.resume);
    if (app.resume) {
      console.log('  Resume path:', app.resume.path);
      console.log('  Resume filename:', app.resume.filename);
    }
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
