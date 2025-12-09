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

            // Process files in parallel batches for better performance
            const BATCH_SIZE = 50;
            const processFile = async (file) => {
                const filePath = path.join(frontendDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');

                    // Quick check - skip files without useTranslations
                    if (!content.includes('useTranslations')) {
                        return [];
                    }

                    const results = [];

                    // Find ALL namespace declarations in the file
                    const namespacePattern = /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\(['"]([a-zA-Z_][a-zA-Z0-9_.]*)['"]\)/g;
                    const namespaceMap = new Map();

                    let nsMatch;
                    while ((nsMatch = namespacePattern.exec(content)) !== null) {
                        namespaceMap.set(nsMatch[1], nsMatch[2]);
                    }

                    if (namespaceMap.size === 0) return [];

                    // Simpler pattern - just match t("key") or t('key')
                    const translationPattern = /\bt\(['"]([^'"]+)['"]/g;

                    let match;
                    while ((match = translationPattern.exec(content)) !== null) {
                        let key = match[1];
                        const namespace = namespaceMap.get('t');

                        if (namespace && !key.startsWith(namespace + '.')) {
                            key = `${namespace}.${key}`;
                        }

                        // Validate key format - must be valid identifier parts separated by dots
                        // Skip keys with special characters like "...", consecutive dots, or trailing dots
                        if (key && /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(key)) {
                            results.push({ file, key, context: match[0] });
                        }
                    }

                    return results;
                } catch (error) {
                    return [];
                }
            };

            // Process in batches
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(batch.map(processFile));

                for (const results of batchResults) {
                    for (const { file, key, context } of results) {
                        usedKeys.add(key);

                        if (!keyUsageMap.has(key)) {
                            keyUsageMap.set(key, { files: new Set(), count: 0, examples: [] });
                        }

                        const usage = keyUsageMap.get(key);
                        usage.files.add(file);
                        usage.count++;

                        if (usage.examples.length < 3) {
                            usage.examples.push({ file, line: 0, context });
                        }
                    }
                }
            }

            console.log(`Found ${usedKeys.size} used translation keys`);
            
            // Keys to skip in missing detection (abbreviations, short codes, etc.)
            const skipMissingKeys = new Set([
                'N_A', 'n_a', 'TBD', 'TBA', 'TODO', 'FIXME', 'WIP',
                'OK', 'ID', 'URL', 'URI', 'API', 'UI', 'UX',
                'vs', 'etc', 'AM', 'PM', 'UTC', 'GMT',
                'USD', 'EUR', 'GBP', 'BTC', 'ETH',
                'KB', 'MB', 'GB', 'TB',
                'px', 'em', 'rem',
            ]);

            // Patterns for keys that should be skipped
            const skipMissingPatterns = [
                /^[A-Z]{1,3}$/,           // 1-3 uppercase letters (abbreviations)
                /^[a-z]_[a-z]$/i,         // Single letter underscore single letter (like N_A)
                /^_?\d+$/,                // Just numbers
                /^\w{1,2}$/,              // Very short keys (1-2 chars)
            ];

            // Find missing keys (used in code but not in translations)
            const missingKeys = [];
            for (const key of usedKeys) {
                if (!existingKeys.has(key)) {
                    // Get the actual key part (after namespace)
                    const keyPart = key.split('.').pop();

                    // Skip if it's in the skip list
                    if (skipMissingKeys.has(keyPart) || skipMissingKeys.has(keyPart.toUpperCase())) {
                        continue;
                    }

                    // Skip if it matches any skip pattern
                    if (skipMissingPatterns.some(pattern => pattern.test(keyPart))) {
                        continue;
                    }

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
            // Skip all top-level namespaces - the detection isn't reliable enough
            // Many keys are used dynamically via t(variableKey) or computed keys
            const skipOrphanedPatterns = [
                /^menu\./,                    // Menu translations are used dynamically via menu-translator
                /^common\./,                  // Common translations may be used in many places
                /^utility\./,                 // Utility translations
                /^dashboard\./,               // Dashboard translations
                /^home\./,                    // Home page translations
                /^market\./,                  // Market translations
                /^support\./,                 // Support translations
                /^nft\./,                     // NFT translations
                /^ext\./,                     // Extension translations (heavily used)
                /^admin\./,                   // Admin translations
                /^blog\./,                    // Blog translations
            ];

            // Also skip keys that look like they're used dynamically (e.g., single words, status codes)
            const skipDynamicPatterns = [
                /\.(Active|Inactive|Pending|Completed|Failed|Success|Error|Warning|Info)$/i,
                /\.(yes|no|ok|cancel|submit|save|delete|edit|view|create|update|close|open)$/i,
                /\.(enabled|disabled|on|off|true|false)$/i,
                /\.(asc|desc|A-Z|Z-A|All|None)$/i,
                /\.(loading|processing|saving|deleting|updating)$/i,
            ];

            const orphanedKeys = [];
            for (const key of existingKeys) {
                if (!usedKeys.has(key)) {
                    // Check if this key should be skipped
                    const shouldSkip = skipOrphanedPatterns.some(pattern => pattern.test(key)) ||
                                       skipDynamicPatterns.some(pattern => pattern.test(key));

                    if (!shouldSkip) {
                        orphanedKeys.push(key);
                    }
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
                    for (const item of keys) {
                        // Handle both { key, value } objects and plain strings
                        const key = typeof item === 'string' ? item : item.key;
                        const value = typeof item === 'string' ? item : (item.value || item.suggestedValue || key);

                        if (!key) continue;

                        // Split key and filter out empty parts (handles keys like "ext.Submitting...")
                        const keyParts = key.split('.').filter(part => part && part.trim());

                        // Skip invalid keys (less than 2 parts after filtering, or contains invalid characters)
                        if (keyParts.length < 2) {
                            console.log(`Skipping invalid key (too few parts): ${key}`);
                            continue;
                        }

                        // Validate all parts are valid identifiers
                        const isValidKey = keyParts.every(part => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part));
                        if (!isValidKey) {
                            console.log(`Skipping invalid key (invalid characters): ${key}`);
                            continue;
                        }

                        let current = data;

                        // Navigate/create the nested structure
                        for (let i = 0; i < keyParts.length - 1; i++) {
                            const part = keyParts[i];
                            // Ensure current is an object and part exists as an object
                            if (!current || typeof current !== 'object') {
                                break;
                            }
                            if (!current[part] || typeof current[part] !== 'object') {
                                current[part] = {};
                            }
                            current = current[part];
                        }

                        // Set the value if we have a valid current object
                        if (current && typeof current === 'object') {
                            const finalKey = keyParts[keyParts.length - 1];
                            current[finalKey] = value;
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
    
    // Extract menu translations
    router.post('/extract-menu', async (req, res) => {
        try {
            const { spawn } = require('child_process');
            const toolsDir = path.join(__dirname, '../../../..');

            console.log('Running menu extraction tool...');

            const process = spawn('node', ['tools/translation-manager/scripts/extract-menu-translations-v2.js'], {
                cwd: toolsDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(text);
            });

            process.stderr.on('data', (data) => {
                const text = data.toString();
                error += text;
                console.error(text);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    // Parse the output to get statistics
                    const keysMatch = output.match(/Translation keys: (\d+)/);
                    const filesMatch = output.match(/Files updated: (\d+)/);
                    const addedMatch = output.match(/Total keys added: (\d+)/);

                    res.json({
                        success: true,
                        message: 'Menu translations extracted successfully',
                        stats: {
                            keysExtracted: keysMatch ? parseInt(keysMatch[1]) : 0,
                            filesUpdated: filesMatch ? parseInt(filesMatch[1]) : 0,
                            totalAdded: addedMatch ? parseInt(addedMatch[1]) : 0
                        },
                        output: output
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: error || 'Menu extraction failed',
                        output: output
                    });
                }
            });

        } catch (error) {
            console.error('Error extracting menu translations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Get menu translation status
    router.get('/menu-status', async (req, res) => {
        try {
            const menuTranslationsPath = path.join(__dirname, '../../../../menu-translations.json');
            const menuPath = path.join(__dirname, '../../../../frontend/config/menu.ts');

            // Check if menu-translations.json exists
            let extractedKeys = 0;
            let lastExtracted = null;
            try {
                const menuTransContent = await fs.readFile(menuTranslationsPath, 'utf8');
                const menuTrans = JSON.parse(menuTransContent);
                extractedKeys = Object.keys(menuTrans).length;

                const stats = await fs.stat(menuTranslationsPath);
                lastExtracted = stats.mtime;
            } catch (e) {
                // File doesn't exist yet
            }

            // Get menu file info
            let menuLastModified = null;
            try {
                const menuStats = await fs.stat(menuPath);
                menuLastModified = menuStats.mtime;
            } catch (e) {
                // Menu file doesn't exist
            }

            // Check if menu was modified after last extraction
            const needsUpdate = menuLastModified && lastExtracted && menuLastModified > lastExtracted;

            res.json({
                success: true,
                status: {
                    extracted: extractedKeys > 0,
                    extractedKeys,
                    lastExtracted,
                    menuLastModified,
                    needsUpdate,
                    menuPath: 'frontend/config/menu.ts'
                }
            });

        } catch (error) {
            console.error('Error getting menu status:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get available directories for extraction
    router.get('/extraction-directories', async (req, res) => {
        try {
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const appDir = path.join(frontendDir, 'app');
            const componentsDir = path.join(frontendDir, 'components');

            const directories = [];

            // Helper to count TSX files recursively in a directory
            async function countTsxFilesRecursive(dir) {
                let count = 0;
                try {
                    const items = await fs.readdir(dir, { withFileTypes: true });
                    for (const item of items) {
                        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                            count += await countTsxFilesRecursive(path.join(dir, item.name));
                        } else if (item.isFile() && item.name.endsWith('.tsx')) {
                            count++;
                        }
                    }
                } catch (e) {
                    // Ignore errors
                }
                return count;
            }

            // Helper to recursively get directories with full path display
            async function getDirectories(dir, relativePath = '', depth = 0) {
                try {
                    const items = await fs.readdir(dir, { withFileTypes: true });
                    const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));

                    for (const item of sortedItems) {
                        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                            const fullPath = relativePath ? `${relativePath}/${item.name}` : item.name;
                            const absolutePath = path.join(dir, item.name);

                            const tsxCount = await countTsxFilesRecursive(absolutePath);

                            if (tsxCount > 0) {
                                directories.push({
                                    path: fullPath,
                                    name: item.name,
                                    fullPath: fullPath,
                                    tsxFiles: tsxCount,
                                    depth: depth,
                                    type: fullPath.startsWith('app') ? 'app' : 'components'
                                });

                                // Recursively get subdirectories (limit depth to 8)
                                if (depth < 8) {
                                    await getDirectories(absolutePath, fullPath, depth + 1);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore errors reading directories
                }
            }

            // Add root options with recursive counts
            const appTsxCount = await countTsxFilesRecursive(appDir);
            const componentsTsxCount = await countTsxFilesRecursive(componentsDir);

            directories.push({
                path: 'app',
                name: 'app',
                fullPath: 'app',
                tsxFiles: appTsxCount,
                depth: 0,
                type: 'app',
                isRoot: true
            });

            await getDirectories(appDir, 'app', 1);

            directories.push({
                path: 'components',
                name: 'components',
                fullPath: 'components',
                tsxFiles: componentsTsxCount,
                depth: 0,
                type: 'components',
                isRoot: true
            });

            await getDirectories(componentsDir, 'components', 1);

            res.json({
                success: true,
                directories: directories
            });

        } catch (error) {
            console.error('Error getting extraction directories:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Extract translations from text to translatable strings
    router.post('/extract-translations', async (req, res) => {
        try {
            const { directory, limit } = req.body;

            if (!directory) {
                return res.status(400).json({ error: 'Directory is required' });
            }

            console.log(`Running translation extraction for directory: ${directory}`);

            // Clear require cache to always load fresh code (for dev mode)
            const servicePath = require.resolve('../services/extract-translations.service');
            delete require.cache[servicePath];

            // Use the extraction service
            const { TranslationExtractor } = require('../services/extract-translations.service');
            const extractor = new TranslationExtractor({
                frontendDir: path.join(__dirname, '../../../../frontend')
            });

            const result = await extractor.extract({
                directory,
                limit: limit ? parseInt(limit) : null
            });

            res.json({
                success: true,
                message: 'Translation extraction completed',
                stats: result.stats,
                output: result.logs.join('\n'),
                modifiedFiles: result.modifiedFiles
            });

        } catch (error) {
            console.error('Error extracting translations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Get tools info
    router.get('/info', (req, res) => {
        res.json({
            tools: [
                {
                    id: 'extract-menu',
                    name: 'Extract Menu Translations',
                    description: 'Extract all menu titles and descriptions from menu.ts and add to translation files',
                    command: 'api',
                    category: 'extraction',
                    icon: 'menu'
                },
                {
                    id: 'apply-english-values',
                    name: 'Apply English Values',
                    description: 'Apply English values to all translation files',
                    command: 'npm run translations:apply-english-values',
                    category: 'maintenance'
                },
                {
                    id: 'find-duplicates',
                    name: 'Find Duplicate Values',
                    description: 'Find duplicate values across translation keys',
                    command: 'api',
                    category: 'analysis'
                },
                {
                    id: 'find-missing-v2',
                    name: 'Find Missing Translations (Improved)',
                    description: 'Find translation keys used in code but missing from translation files with better accuracy',
                    command: 'api',
                    category: 'analysis'
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