// Simple script to get your local IP address for mobile testing
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  console.log('\n==============================================');
  console.log('📱 Mobile/Tablet Access Information');
  console.log('==============================================\n');

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`Network: ${name}`);
        console.log(`IP Address: ${iface.address}`);
        console.log('\n📱 Use these URLs on your mobile/tablet:');
        console.log(`   Frontend: http://${iface.address}:3000`);
        console.log(`   Backend:  http://${iface.address}:4000`);
        console.log('\n');
      }
    }
  }

  console.log('==============================================');
  console.log('⚠️  Important Notes:');
  console.log('1. Make sure your mobile device is on the same WiFi');
  console.log('2. Windows Firewall might block connections');
  console.log('3. If blocked, allow Node.js through firewall');
  console.log('==============================================\n');
}

getLocalIP();
