const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

console.log('Starting Sahana Welfare application...');
console.log('Electron path:', electron);

// Set development environment
process.env.NODE_ENV = 'development';

// Launch Electron
const electronProcess = spawn(electron, [path.join(__dirname, 'electron.js')], {
  stdio: 'inherit'
});

electronProcess.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  electronProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  electronProcess.kill('SIGTERM');
}); 