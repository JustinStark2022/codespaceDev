// Simple script to start the backend
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting backend server...');

// Change to the node_backend directory
process.chdir(path.join(__dirname, 'node_backend'));

// Start the server using tsx
const server = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Failed to start backend:', err);
});

server.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});
