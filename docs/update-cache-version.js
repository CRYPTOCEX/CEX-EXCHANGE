#!/usr/bin/env node

/**
 * Cache Version Update Utility
 * Updates cache version numbers in HTML, JS, and CSS files
 * Also scans content folder for patch notes and updates known versions
 * Run this script before deploying docs to ensure cache busting
 */

const fs = require('fs');
const path = require('path');

// Generate new version based on timestamp
const newVersion = `1.0.${Date.now().toString().slice(-6)}`;

console.log(`🔄 Updating cache version to: ${newVersion}`);

// ========================================
// Scan patch notes and update known versions
// ========================================

function scanPatchNotes() {
    const contentDir = path.join(__dirname, 'content');
    const knownVersions = {};

    // Get all extension directories
    const extensions = fs.readdirSync(contentDir).filter(item => {
        const itemPath = path.join(contentDir, item);
        return fs.statSync(itemPath).isDirectory();
    });

    console.log(`\n📂 Scanning ${extensions.length} extension directories for patch notes...`);

    for (const ext of extensions) {
        const patchNotesDir = path.join(contentDir, ext, 'patch-notes');

        if (!fs.existsSync(patchNotesDir)) {
            continue;
        }

        const files = fs.readdirSync(patchNotesDir).filter(file => file.endsWith('.md'));
        const versions = files.map(file => file.replace('.md', '')).sort((a, b) => {
            // Semantic version sort
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || 0;
                const bPart = bParts[i] || 0;
                if (aPart !== bPart) return aPart - bPart;
            }
            return 0;
        });

        if (versions.length > 0) {
            knownVersions[ext] = versions;
            console.log(`   ✅ ${ext}: ${versions.length} versions found`);
        }
    }

    return knownVersions;
}

function updatePatchNotesKnownVersions(knownVersions) {
    const patchNotesPath = path.join(__dirname, 'assets', 'patch-notes.js');

    if (!fs.existsSync(patchNotesPath)) {
        console.log('⚠️  patch-notes.js not found');
        return false;
    }

    let content = fs.readFileSync(patchNotesPath, 'utf8');

    // Build the new knownVersions object string
    const versionEntries = Object.entries(knownVersions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ext, versions]) => {
            const formattedVersions = versions.map(v => `"${v}"`).join(', ');
            return `      "${ext}": [${formattedVersions}]`;
        })
        .join(',\n');

    const newKnownVersionsBlock = `const knownVersions = {\n${versionEntries},\n    };`;

    // Find and replace the knownVersions object in getKnownVersionsForType
    const knownVersionsRegex = /const knownVersions = \{[\s\S]*?\};/;

    if (knownVersionsRegex.test(content)) {
        content = content.replace(knownVersionsRegex, newKnownVersionsBlock);
        fs.writeFileSync(patchNotesPath, content, 'utf8');
        console.log(`💾 Updated known versions in patch-notes.js`);
        return true;
    } else {
        console.log('⚠️  Could not find knownVersions block in patch-notes.js');
        return false;
    }
}

// Scan and update patch notes versions
const knownVersions = scanPatchNotes();
updatePatchNotesKnownVersions(knownVersions);

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