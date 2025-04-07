const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Sahana Welfare application packaging...');

// Ensure we're in the client directory
try {
  // Step 1: Build React app
  console.log('Building React application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('React build completed successfully.');

  // Step 2: Verify required files exist
  console.log('Verifying required files...');
  const requiredFiles = ['electron.js', 'preload.js'];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
      throw new Error(`Required file ${file} not found!`);
    }
  });
  
  console.log('All required files verified.');

  // Step 3: Run electron-builder
  console.log('Packaging application with electron-builder...');
  execSync('npm run dist', { stdio: 'inherit' });
  
  console.log('\n✅ Application packaging completed successfully!');
  console.log('\nYou can find the installer in the "dist" folder.');
  console.log('Now you can distribute "Sahana Welfare Setup.exe" to your users.');
  
} catch (error) {
  console.error('❌ Error packaging application:', error.message);
  process.exit(1);
} 