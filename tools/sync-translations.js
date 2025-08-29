const fs = require('fs');
const path = require('path');

// Function to sync all locales with English keys
const syncAllLocales = () => {
  const messagesDir = 'C:\\xampp\\htdocs\\v5\\frontend\\messages';
  const enPath = path.join(messagesDir, 'en.json');
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  // Get all locale files
  const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json') && f !== 'en.json');
  
  let totalAdded = 0;
  
  files.forEach(file => {
    const filePath = path.join(messagesDir, file);
    const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let added = 0;
    
    // Recursive function to sync nested objects
    function syncObject(source, target, path = '') {
      for (const key in source) {
        if (!(key in target)) {
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            target[key] = {};
            syncObject(source[key], target[key], path + key + '.');
          } else {
            target[key] = source[key]; // Copy English value as placeholder
            added++;
            if (added <= 5) { // Only log first 5 additions per file
              console.log(`Added to ${file}: ${path}${key}`);
            }
          }
        } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
            target[key] = {};
          }
          syncObject(source[key], target[key], path + key + '.');
        }
      }
    }
    
    syncObject(en, locale);
    
    if (added > 0) {
      fs.writeFileSync(filePath, JSON.stringify(locale, null, 2));
      console.log(`Updated ${file}: added ${added} keys`);
      totalAdded += added;
    }
  });
  
  console.log(`\nTotal keys added across all locales: ${totalAdded}`);
  console.log('All locale files have been synchronized with English keys.');
};

// Run the sync
console.log('Starting translation sync...\n');
syncAllLocales();