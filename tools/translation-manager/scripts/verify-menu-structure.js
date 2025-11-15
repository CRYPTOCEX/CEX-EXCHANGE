const fs = require('fs');
const path = require('path');

const enFile = path.join(__dirname, '../../../frontend/messages/en.json');
const data = JSON.parse(fs.readFileSync(enFile, 'utf8'));

let foundDots = false;

function checkForDotsInKeys(obj, pathSoFar = '') {
  for (const key in obj) {
    const currentPath = pathSoFar ? `${pathSoFar}.${key}` : key;

    if (key.includes('.')) {
      console.log(`❌ Found dot in key name: ${currentPath}`);
      console.log(`   Key: "${key}"`);
      foundDots = true;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      checkForDotsInKeys(obj[key], currentPath);
    }
  }
}

console.log('Checking menu structure for dots in key names...\n');
checkForDotsInKeys(data.menu, 'menu');

if (!foundDots) {
  console.log('✅ No dots found in any key names - structure is correct!');
  console.log('\nThe error message shows dot-notation paths (e.g., menu.admin.dashboard)');
  console.log('but these are just the paths to access nested keys, not actual key names.');
  console.log('\nThe actual structure is properly nested like:');
  console.log(JSON.stringify(data.menu.admin.dashboard, null, 2));
} else {
  console.log('\n❌ Found keys with dots that need to be fixed!');
}
