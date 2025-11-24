const fs = require('fs');
const path = require('path');

// Function to properly structure locale files
const fixLocaleStructure = () => {
  const messagesDir = 'C:\\xampp\\htdocs\\v5\\frontend\\messages';
  
  // Read English as the reference
  const enPath = path.join(messagesDir, 'en.json');
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  // Get all locale files
  const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json') && f !== 'en.json');
  
  files.forEach(file => {
    const filePath = path.join(messagesDir, file);
    console.log(`\nProcessing ${file}...`);
    
    try {
      const localeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Create a new clean structure based on English
      const cleanData = {};
      
      // Function to get value from locale data (handles both nested and flattened)
      function getValue(obj, keyPath) {
        // Try direct path first
        const keys = keyPath.split('.');
        let current = obj;
        
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            // Try flattened key
            if (keyPath in obj) {
              return obj[keyPath];
            }
            // Try with different separators
            const altKey = keyPath.replace(/\./g, '/');
            if (altKey in obj) {
              return obj[altKey];
            }
            return null;
          }
        }
        return current;
      }
      
      // Function to set nested value
      function setNestedValue(obj, keyPath, value) {
        const keys = keyPath.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
      }
      
      // Function to copy structure from English
      function copyStructure(source, keyPath = '') {
        for (const key in source) {
          const fullPath = keyPath ? `${keyPath}.${key}` : key;
          
          if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            copyStructure(source[key], fullPath);
          } else {
            // Get the translated value or use English as fallback
            let value = getValue(localeData, fullPath);
            
            // If no translation found, use English value
            if (value === null || value === undefined) {
              value = source[key];
            }
            
            setNestedValue(cleanData, fullPath, value);
          }
        }
      }
      
      // Build clean structure
      copyStructure(enData);
      
      // Count keys
      function countKeys(obj) {
        let count = 0;
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            count += countKeys(obj[key]);
          } else {
            count++;
          }
        }
        return count;
      }
      
      const originalCount = countKeys(localeData);
      const cleanCount = countKeys(cleanData);
      
      console.log(`  Original keys: ${originalCount}`);
      console.log(`  Cleaned keys: ${cleanCount}`);
      
      // Write the cleaned data
      fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2));
      console.log(`  ✓ Fixed ${file}`);
      
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error.message);
    }
  });
  
  console.log('\nAll locale files have been cleaned and normalized.');
};

// Run the fix
console.log('Starting locale structure fix...');
fixLocaleStructure();