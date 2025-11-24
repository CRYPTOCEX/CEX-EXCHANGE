#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Real-time console output that works even when tab loses focus
function realtimeLog(message) {
  // Multiple layers of forced output for maximum compatibility
  process.stdout.write(message + '\n');
  
  // Modern Node.js
  if (process.stdout.flushSync) {
    process.stdout.flushSync();
  }
  
  // Alternative flush method
  if (process.stdout._flush) {
    process.stdout._flush();
  }
  
  // Force drain if available
  if (process.stdout._writableState && !process.stdout._writableState.corked) {
    process.stdout.uncork && process.stdout.uncork();
  }
}

// Keep the terminal active with periodic heartbeat during long operations
function startProgressHeartbeat(message = "⏳ Processing...") {
  // Prevent stdin from pausing (common cause of terminal buffering)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    process.stdin.resume();
  }
  
  let counter = 0;
  const heartbeat = setInterval(() => {
    counter++;
    const dots = '.'.repeat((counter % 3) + 1).padEnd(3, ' ');
    process.stdout.write(`\r${message}${dots}`);
    if (process.stdout.flushSync) {
      process.stdout.flushSync();
    }
  }, 2000);
  
  return {
    stop: () => {
      clearInterval(heartbeat);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
      if (process.stdout.flushSync) {
        process.stdout.flushSync();
      }
    }
  };
}

// Enhanced pnpm command runner with real-time output
function runPnpmUpdate(directory, name) {
  return new Promise((resolve, reject) => {
    const targetDir = path.resolve(directory);
    
    // Check if directory exists and has package.json
    if (!fs.existsSync(targetDir)) {
      realtimeLog(`⚠️  Directory ${directory} does not exist, skipping...`);
      resolve({ success: true, skipped: true });
      return;
    }
    
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      realtimeLog(`⚠️  No package.json found in ${directory}, skipping...`);
      resolve({ success: true, skipped: true });
      return;
    }
    
    realtimeLog(`\n📦 Starting pnpm update for ${name}...`);
    realtimeLog(`📁 Directory: ${targetDir}`);
    
    const heartbeat = startProgressHeartbeat(`📦 Updating ${name} packages`);
    
    // Use pnpm update with verbose output
    const child = spawn('pnpm', ['update'], {
      cwd: targetDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    let hasOutput = false;
    
    // Handle stdout with real-time streaming
    child.stdout.on('data', (data) => {
      heartbeat.stop();
      hasOutput = true;
      const output = data.toString();
      // Split by lines and output each line with realtime logging
      output.split('\n').forEach(line => {
        if (line.trim()) {
          realtimeLog(`   ${line}`);
        }
      });
    });
    
    // Handle stderr with real-time streaming
    child.stderr.on('data', (data) => {
      heartbeat.stop();
      hasOutput = true;
      const output = data.toString();
      // Split by lines and output each line with realtime logging
      output.split('\n').forEach(line => {
        if (line.trim()) {
          realtimeLog(`   ⚠️  ${line}`);
        }
      });
    });
    
    child.on('close', (code) => {
      heartbeat.stop();
      
      if (code === 0) {
        realtimeLog(`✅ ${name} packages updated successfully!`);
        resolve({ success: true, code });
      } else {
        realtimeLog(`❌ Failed to update ${name} packages (exit code: ${code})`);
        resolve({ success: false, code });
      }
    });
    
    child.on('error', (error) => {
      heartbeat.stop();
      realtimeLog(`❌ Error running pnpm update for ${name}: ${error.message}`);
      reject(error);
    });
    
    // Timeout fallback (30 minutes max per directory)
    const timeout = setTimeout(() => {
      heartbeat.stop();
      realtimeLog(`⏰ Timeout: pnpm update for ${name} took too long, terminating...`);
      child.kill('SIGTERM');
      reject(new Error(`Timeout updating ${name}`));
    }, 30 * 60 * 1000);
    
    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// Main package update function
async function updateAllPackages() {
  const startTime = Date.now();
  
  realtimeLog('🚀 Enhanced Package Updater with Real-time Output');
  realtimeLog('📺 Terminal output will remain active even when switching tabs!');
  realtimeLog('⏱️  Started at: ' + new Date().toLocaleString());
  realtimeLog('═'.repeat(60));
  
  const updateSequence = [
    { directory: 'backend', name: 'Backend' },
    { directory: 'frontend', name: 'Frontend' },
    { directory: '.', name: 'Main/Root' }
  ];
  
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const { directory, name } of updateSequence) {
    try {
      const result = await runPnpmUpdate(directory, name);
      
      if (result.skipped) {
        totalSkipped++;
      } else if (result.success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
      
      // Add a separator between updates
      realtimeLog('─'.repeat(40));
      
    } catch (error) {
      totalFailed++;
      realtimeLog(`❌ Critical error updating ${name}: ${error.message}`);
      realtimeLog('─'.repeat(40));
    }
  }
  
  // Final summary
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  realtimeLog('═'.repeat(60));
  realtimeLog('📊 PACKAGE UPDATE SUMMARY');
  realtimeLog('═'.repeat(60));
  realtimeLog(`✅ Successful updates: ${totalSuccess}`);
  realtimeLog(`⚠️  Skipped directories: ${totalSkipped}`);
  realtimeLog(`❌ Failed updates: ${totalFailed}`);
  realtimeLog(`⏱️  Total time: ${totalTime} seconds`);
  realtimeLog(`🏁 Completed at: ${new Date().toLocaleString()}`);
  
  if (totalFailed > 0) {
    realtimeLog('\n⚠️  Some updates failed. Please check the output above for details.');
    process.exit(1);
  } else {
    realtimeLog('\n🎉 All package updates completed successfully!');
    process.exit(0);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  realtimeLog('\n\n🛑 Package update interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  realtimeLog('\n\n🛑 Package update terminated');
  process.exit(143);
});

// Start the update process
if (require.main === module) {
  updateAllPackages().catch((error) => {
    realtimeLog(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { updateAllPackages, runPnpmUpdate }; 