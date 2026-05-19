/**
 * Maintenance Mode ON Script
 * Stops the main servers and starts the maintenance server
 *
 * This script uses execFileSync with hardcoded commands (no user input)
 * to safely manage PM2 processes.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Determine the PM2 executable
const isWindows = process.platform === 'win32';
const pm2Cmd = isWindows ? 'pm2.cmd' : 'pm2';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           ENTERING MAINTENANCE MODE                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Helper function to run pm2 commands safely
function runPm2(args) {
  try {
    execFileSync(pm2Cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      windowsHide: true
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Step 1: Stop main services
console.log('→ Stopping main services...');
runPm2(['stop', 'backend', 'frontend']);

// Step 2: Delete main services from PM2
console.log('→ Cleaning up PM2 processes...');
runPm2(['delete', 'backend', 'frontend']);

// Step 3: Start maintenance server
console.log('→ Starting maintenance server...');
const success = runPm2(['start', 'maintenance.config.js']);

if (success) {
  console.log('\n✓ Maintenance mode activated!');
  console.log('  - Frontend maintenance page: http://localhost:3000');
  console.log('  - Backend maintenance API: http://localhost:4000');
  console.log('\n  Run "pnpm start" to exit maintenance mode.\n');
} else {
  console.error('✗ Failed to start maintenance server');
  process.exit(1);
}
