const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../frontend/messages');
const enFile = path.join(messagesDir, 'en.json');

const data = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// Check if there are any flat keys with dots
const flatKeys = [];

function checkForFlatKeys(obj, parentKey = '') {
  for (const [key, value] of Object.entries(obj)) {
    if (key.includes('.')) {
      const fullPath = parentKey ? `${parentKey}.${key}` : key;
      flatKeys.push(fullPath);
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const newParentKey = parentKey ? `${parentKey}.${key}` : key;
      checkForFlatKeys(value, newParentKey);
    }
  }
}

checkForFlatKeys(data);

console.log(`Found ${flatKeys.length} keys with dots in them:`);
if (flatKeys.length > 0) {
  console.log('\nFirst 10 problematic keys:');
  flatKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));

  console.log('\n\nThese keys need to be converted to nested structure.');
}

// Check specifically for menu keys
const menuKeys = [];
if (data.menu) {
  function checkMenuKeys(obj, parentKey = 'menu') {
    for (const [key, value] of Object.entries(obj)) {
      if (key.includes('.')) {
        menuKeys.push(`${parentKey}.${key}`);
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkMenuKeys(value, `${parentKey}.${key}`);
      }
    }
  }
  checkMenuKeys(data.menu);

  if (menuKeys.length > 0) {
    console.log(`\nFound ${menuKeys.length} menu keys with dots`);
  }
}
