#!/usr/bin/env node

/**
 * Cache Version Update Utility
 * Updates cache version numbers in HTML, JS, and CSS files
 * Run this script before deploying docs to ensure cache busting
 */

const fs = require('fs');
const path = require('path');

// Generate new version based on timestamp
const newVersion = `1.0.${Date.now().toString().slice(-6)}`;

console.log(`🔄 Updating cache version to: ${newVersion}`);

// Files to update
const filesToUpdate = [
    {
        file: 'index.html',
        patterns: [
            { regex: /assets\/layout\.js\?v=[\d.]+/g, replacement: `assets/layout.js?v=${newVersion}` },
            { regex: /assets\/patch-notes\.js\?v=[\d.]+/g, replacement: `assets/patch-notes.js?v=${newVersion}` },
            { regex: /assets\/styles\.css\?v=[\d.]+/g, replacement: `assets/styles.css?v=${newVersion}` },
            { regex: /<meta name="cache-version" content="[\d.]+">/g, replacement: `<meta name="cache-version" content="${newVersion}">` }
        ]
    },
    {
        file: 'assets/layout.js',
        patterns: [
            { regex: /this\.cacheVersion = '[\d.]+'/g, replacement: `this.cacheVersion = '${newVersion}'` }
        ]
    },
    {
        file: 'assets/patch-notes.js',
        patterns: [
            { regex: /this\.cacheVersion = '[\d.]+'/g, replacement: `this.cacheVersion = '${newVersion}'` }
        ]
    }
];

// Update each file
filesToUpdate.forEach(({ file, patterns }) => {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}`);
        return;
    }
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        patterns.forEach(({ regex, replacement }) => {
            const matches = content.match(regex);
            if (matches) {
                content = content.replace(regex, replacement);
                hasChanges = true;
                console.log(`✅ Updated ${matches.length} pattern(s) in ${file}`);
            }
        });
        
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`💾 Saved changes to ${file}`);
        } else {
            console.log(`ℹ️  No changes needed in ${file}`);
        }
        
    } catch (error) {
        console.error(`❌ Error updating ${file}:`, error.message);
    }
});

console.log(`\n🚀 Cache version update complete!`);
console.log(`📝 New version: ${newVersion}`);
console.log(`\n💡 Tips:`);
console.log(`   • Run this script before deploying docs`);
console.log(`   • Clear browser cache after deployment`);
console.log(`   • Use Ctrl+F5 for hard refresh`); 