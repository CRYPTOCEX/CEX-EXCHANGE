const fs = require('fs');
const path = require('path');
const glob = require('glob');

const messagesDir = path.join(__dirname, '../frontend/messages');

// Get all JSON files
const files = glob.sync('*.json', { cwd: messagesDir });

let updatedCount = 0;
let alreadyExistsCount = 0;
let errorCount = 0;

files.forEach(file => {
    if (file === 'en.json') {
        console.log(`Skipping ${file} (already updated)`);
        return;
    }
    
    const filePath = path.join(messagesDir, file);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Check if ext namespace exists
        if (!data.ext) {
            console.log(`No ext namespace in ${file}, skipping`);
            return;
        }
        
        // Check if payment_activities already exists
        if (data.ext.payment_activities) {
            console.log(`payment_activities already exists in ${file}`);
            alreadyExistsCount++;
            return;
        }
        
        // Add payment_activities after trade_activities
        // We'll use "Payment Activities" as the default value for all locales
        // In production, these should be properly translated
        data.ext.payment_activities = "Payment Activities";
        
        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✓ Updated ${file}`);
        updatedCount++;
        
    } catch (error) {
        console.error(`Error updating ${file}:`, error.message);
        errorCount++;
    }
});

console.log(`\nSummary:`);
console.log(`- Updated: ${updatedCount} files`);
console.log(`- Already exists: ${alreadyExistsCount} files`);
console.log(`- Errors: ${errorCount} files`);
console.log(`- Total processed: ${files.length} files`);