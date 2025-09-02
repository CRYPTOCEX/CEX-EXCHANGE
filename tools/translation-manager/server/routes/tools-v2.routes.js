const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

function createToolsRoutes() {
    // Helper function to flatten nested translation object
    function flattenTranslations(obj, prefix = '') {
        const keys = [];
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...flattenTranslations(value, fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }

    // Find missing translations with better accuracy
    router.get('/find-missing-v2', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const glob = require('glob');
            
            // Load and flatten all translation keys from en.json
            const enFilePath = path.join(messagesDir, 'en.json');
            const enContent = await fs.readFile(enFilePath, 'utf8');
            const enData = JSON.parse(enContent);
            const flatKeys = flattenTranslations(enData);
            const existingKeys = new Set(flatKeys);
            
            console.log(`Found ${existingKeys.size} translation keys in en.json`);
            
            // Find all translation usage in code
            const usedKeys = new Set();
            const keyUsageMap = new Map(); // key -> { files: [], count: 0, examples: [] }
            
            // Search only in relevant folders
            const files = glob.sync('{app,components,store,hooks,lib,utils}/**/*.{ts,tsx,js,jsx}', {
                cwd: frontendDir,
                ignore: [
                    'node_modules/**', 
                    'dist/**', 
                    'build/**', 
                    '.next/**',
                    'public/**',
                    '**/*.test.*',
                    '**/*.spec.*',
                    '**/*.d.ts',
                    '**/*.stories.*'
                ]
            });
            
            console.log(`Scanning ${files.length} files for translation usage...`);
            
            for (const file of files) {
                const filePath = path.join(frontendDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // Find ALL namespace declarations in the file (there might be multiple)
                    const namespacePattern = /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\(['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\)/g;
                    const namespaceMap = new Map(); // variable name -> namespace
                    
                    let nsMatch;
                    while ((nsMatch = namespacePattern.exec(content)) !== null) {
                        const varName = nsMatch[1]; // e.g., 't'
                        const namespace = nsMatch[2]; // e.g., 'ext'
                        namespaceMap.set(varName, namespace);
                    }
                    
                    // Pattern to match translation calls with variable name
                    // This will match t('key'), t2('key'), etc.
                    const translationPattern = /\b(\w+)\(['"]([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)['"](?:,\s*[^)]*)?\)/g;
                    
                    let match;
                    while ((match = translationPattern.exec(content)) !== null) {
                        const varName = match[1]; // e.g., 't'
                        let key = match[2]; // e.g., 'payment_activities'
                        
                        // Check if this variable is a translation function
                        if (namespaceMap.has(varName)) {
                            const namespace = namespaceMap.get(varName);
                            // If key doesn't already contain the namespace, prepend it
                            if (!key.startsWith(namespace + '.')) {
                                key = `${namespace}.${key}`;
                            }
                            
                            // Validate key format
                            if (key && /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key)) {
                                usedKeys.add(key);
                                
                                if (!keyUsageMap.has(key)) {
                                    keyUsageMap.set(key, { 
                                        files: new Set(), 
                                        count: 0,
                                        examples: []
                                    });
                                }
                                
                                const usage = keyUsageMap.get(key);
                                usage.files.add(file);
                                usage.count++;
                                
                                // Store first 3 examples
                                if (usage.examples.length < 3) {
                                    const lineNum = content.substring(0, match.index).split('\n').length;
                                    usage.examples.push({
                                        file,
                                        line: lineNum,
                                        context: match[0]
                                    });
                                }
                            }
                        } else if (varName === 't') {
                            // Handle cases where t might be used without explicit useTranslations in the file
                            // This could be from props or context
                            // For now, we'll skip these or you could add logic to infer namespace
                        }
                    }
                } catch (error) {
                    console.error(`Error reading ${file}:`, error);
                }
            }
            
            // Find missing keys (used in code but not in translations)
            const missingKeys = [];
            for (const key of usedKeys) {
                if (!existingKeys.has(key)) {
                    const usage = keyUsageMap.get(key);
                    missingKeys.push({
                        key,
                        files: Array.from(usage.files),
                        count: usage.count,
                        examples: usage.examples,
                        suggestedValue: key.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    });
                }
            }
            
            // Sort by usage count
            missingKeys.sort((a, b) => b.count - a.count);
            
            // Find orphaned keys (in translations but not used)
            const orphanedKeys = [];
            for (const key of existingKeys) {
                if (!usedKeys.has(key)) {
                    orphanedKeys.push(key);
                }
            }
            
            res.json({
                success: true,
                missing: missingKeys.slice(0, 100), // Limit to first 100 for performance
                orphaned: orphanedKeys.slice(0, 100),
                stats: {
                    totalMissing: missingKeys.length,
                    totalOrphaned: orphanedKeys.length,
                    totalUsedInCode: usedKeys.size,
                    totalInTranslations: existingKeys.size,
                    filesScanned: files.length,
                    foldersScanned: ['app', 'components', 'store', 'hooks', 'lib', 'utils']
                },
                hasMore: {
                    missing: missingKeys.length > 100,
                    orphaned: orphanedKeys.length > 100
                }
            });
            
        } catch (error) {
            console.error('Error finding missing translations:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // Add missing translations to all locale files
    router.post('/add-missing', async (req, res) => {
        try {
            const { keys } = req.body; // Array of { key: string, value: string }
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            
            if (!keys || !Array.isArray(keys)) {
                return res.status(400).json({ error: 'Invalid keys array' });
            }
            
            // Get all locale files
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            const results = [];
            
            for (const file of jsonFiles) {
                const filePath = path.join(messagesDir, file);
                const locale = file.replace('.json', '');
                
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    // Add each key to the translation file
                    for (const { key, value } of keys) {
                        const keyParts = key.split('.');
                        let current = data;
                        
                        // Navigate/create the nested structure
                        for (let i = 0; i < keyParts.length - 1; i++) {
                            const part = keyParts[i];
                            if (!current[part]) {
                                current[part] = {};
                            }
                            current = current[part];
                        }
                        
                        // Set the value (use provided value for English, key as placeholder for others)
                        const finalKey = keyParts[keyParts.length - 1];
                        if (locale === 'en') {
                            current[finalKey] = value;
                        } else {
                            // For other locales, use the English value as placeholder
                            current[finalKey] = value; // You might want to prefix with [TRANSLATE] or similar
                        }
                    }
                    
                    // Write back to file
                    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                    results.push({ locale, success: true });
                    
                } catch (error) {
                    console.error(`Error updating ${file}:`, error);
                    results.push({ locale, success: false, error: error.message });
                }
            }
            
            res.json({
                success: true,
                results,
                message: `Added ${keys.length} keys to ${results.filter(r => r.success).length} locale files`
            });
            
        } catch (error) {
            console.error('Error adding missing translations:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // Find duplicate values across translation keys
    router.get('/find-duplicates', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const duplicates = new Map(); // value -> { keys: [], locales: [] }
            
            // Read all locale files
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                const locale = file.replace('.json', '');
                const filePath = path.join(messagesDir, file);
                
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    // Scan through all keys and values
                    for (const [key, value] of Object.entries(data)) {
                        if (typeof value === 'string' && value.trim()) {
                            const trimmedValue = value.trim();
                            
                            // Skip very short values and numbers
                            if (trimmedValue.length < 3 || /^\d+$/.test(trimmedValue)) {
                                continue;
                            }
                            
                            if (!duplicates.has(trimmedValue)) {
                                duplicates.set(trimmedValue, {
                                    keys: new Set(),
                                    locales: new Set()
                                });
                            }
                            
                            duplicates.get(trimmedValue).keys.add(key);
                            duplicates.get(trimmedValue).locales.add(locale);
                        }
                    }
                } catch (error) {
                    console.error(`Error reading ${file}:`, error);
                }
            }
            
            // Filter to only show actual duplicates (value used in multiple keys)
            const actualDuplicates = [];
            for (const [value, data] of duplicates.entries()) {
                if (data.keys.size > 1) {
                    actualDuplicates.push({
                        value,
                        keys: Array.from(data.keys),
                        locales: Array.from(data.locales),
                        count: data.keys.size
                    });
                }
            }
            
            // Sort by count (most duplicates first)
            actualDuplicates.sort((a, b) => b.count - a.count);
            
            res.json({
                success: true,
                duplicates: actualDuplicates,
                stats: {
                    totalDuplicates: actualDuplicates.length,
                    totalKeys: actualDuplicates.reduce((sum, d) => sum + d.count, 0)
                }
            });
            
        } catch (error) {
            console.error('Error finding duplicates:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
    // Get tools info
    router.get('/info', (req, res) => {
        res.json({
            tools: [
                {
                    id: 'apply-english-values',
                    name: 'Apply English Values',
                    description: 'Apply English values to all translation files',
                    command: 'npm run translations:apply-english-values'
                },
                {
                    id: 'find-duplicates',
                    name: 'Find Duplicate Values',
                    description: 'Find duplicate values across translation keys',
                    command: 'api'
                },
                {
                    id: 'find-missing-v2',
                    name: 'Find Missing Translations (Improved)',
                    description: 'Find translation keys used in code but missing from translation files with better accuracy',
                    command: 'api'
                }
            ]
        });
    });

    // Run a tool
    router.post('/:tool', async (req, res) => {
        const { tool } = req.params;
        
        try {
            let command, args;
            
            switch (tool) {
                case 'apply-english-values':
                    command = 'npm';
                    args = ['run', 'translations:apply-english-values'];
                    break;
                default:
                    return res.status(404).json({ error: 'Tool not found' });
            }
            
            const process = spawn(command, args, {
                cwd: path.join(__dirname, '../../../..'),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let output = '';
            let error = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    res.json({
                        success: true,
                        output: output
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: error,
                        output: output
                    });
                }
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createToolsRoutes;