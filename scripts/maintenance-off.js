/**
 * Maintenance Mode OFF Script
 * Stops the maintenance server before starting the main servers
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

console.log('→ Exiting maintenance mode...');

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

// Step 1: Stop maintenance server
runPm2(['stop', 'maintenance']);

// Step 2: Delete maintenance server from PM2
runPm2(['delete', 'maintenance']);

console.log('✓ Maintenance mode disabled\n');
