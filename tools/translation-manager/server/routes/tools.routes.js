const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

function createToolsRoutes() {
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
    
    // Find missing translations - keys used in code but not in translation files
    router.get('/find-missing', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const glob = require('glob');
            
            // Load all translation keys from en.json (master file)
            const enFilePath = path.join(messagesDir, 'en.json');
            const enContent = await fs.readFile(enFilePath, 'utf8');
            const enData = JSON.parse(enContent);
            const existingKeys = new Set(Object.keys(enData));
            
            // Find all translation usage in code
            const usedKeys = new Set();
            const keyUsageMap = new Map(); // key -> { files: [], count: 0 }
            
            // Pattern to match translation function calls
            const patterns = [
                /\bt\(['"`]([^'"`]+)['"`]\)/g,           // t('key') or t("key") or t(`key`)
                /\{t\(['"`]([^'"`]+)['"`]\)/g,           // {t('key')} in JSX
                /useTranslations\(['"`]([^'"`]+)['"`]\)/g, // useTranslations('namespace')
                /getTranslations\(['"`]([^'"`]+)['"`]\)/g, // getTranslations('namespace')
            ];
            
            // Search only in relevant folders where translations are used
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
                    '**/*.d.ts'
                ]
            });
            
            for (const file of files) {
                const filePath = path.join(frontendDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    for (const pattern of patterns) {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            const key = match[1];
                            if (key && !key.includes('${') && !key.includes('\\')) { // Skip template literals and escaped strings
                                usedKeys.add(key);
                                
                                if (!keyUsageMap.has(key)) {
                                    keyUsageMap.set(key, { files: [], count: 0 });
                                }
                                
                                const usage = keyUsageMap.get(key);
                                if (!usage.files.includes(file)) {
                                    usage.files.push(file);
                                }
                                usage.count++;
                            }
                        }
                        pattern.lastIndex = 0; // Reset regex
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
                        files: usage.files,
                        count: usage.count
                    });
                }
            }
            
            // Sort by usage count (most used first)
            missingKeys.sort((a, b) => b.count - a.count);
            
            // Also find orphaned keys (in translations but not used in code)
            const orphanedKeys = [];
            for (const key of existingKeys) {
                if (!usedKeys.has(key)) {
                    orphanedKeys.push(key);
                }
            }
            
            res.json({
                success: true,
                missing: missingKeys,
                orphaned: orphanedKeys.sort(),
                stats: {
                    totalMissing: missingKeys.length,
                    totalOrphaned: orphanedKeys.length,
                    totalUsedInCode: usedKeys.size,
                    totalInTranslations: existingKeys.size,
                    filesScanned: files.length,
                    foldersScanned: ['app', 'components', 'store', 'hooks', 'lib', 'utils']
                }
            });
            
        } catch (error) {
            console.error('Error finding missing translations:', error);
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
                    id: 'find-missing',
                    name: 'Find Missing Translations',
                    description: 'Find translation keys used in code but missing from translation files',
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