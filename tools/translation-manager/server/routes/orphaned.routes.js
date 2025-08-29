const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

function createOrphanedRoutes(api, getTsxFiles) {
    // Scan for orphaned translations (keys used in TSX but not in message files)
    router.get('/scan', async (req, res) => {
        try {
            const orphanedKeys = [];
            const frontendPath = path.join(__dirname, '../../../../frontend');
            
            // Get all translation keys from all locales
            const allMessageKeys = new Set();
            for (const [localeCode, locale] of api.locales.entries()) {
                for (const key of Object.keys(locale.keys)) {
                    allMessageKeys.add(key);
                }
            }
            
            console.log(`[ORPHAN SCAN] Found ${allMessageKeys.size} keys in message files`);
            
            // Get all TSX files
            const allFiles = getTsxFiles();
            console.log(`[ORPHAN SCAN] Scanning ${allFiles.length} TSX files`);
            
            // Track found translation keys and their locations
            const foundTranslations = new Map(); // key -> { files: [], namespace: '' }
            
            for (const file of allFiles) {
                // file is already a full path from getTsxFiles
                const filePath = file;
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    
                    // Find the namespace used in this file
                    const namespaceMatch = content.match(/useTranslations\(["']([^"']+)["']\)/);
                    const namespace = namespaceMatch ? namespaceMatch[1] : null;
                    
                    if (!namespace) continue; // Skip files without translations
                    
                    // Find all t() calls with proper word boundary to avoid false matches
                    const tCallRegex = /\bt\(["']([^"']+)["']/g;
                    let match;
                    
                    while ((match = tCallRegex.exec(content)) !== null) {
                        const key = match[1];
                        const fullKey = `${namespace}.${key}`;
                        
                        // Check if this key exists in message files
                        if (!allMessageKeys.has(fullKey)) {
                            if (!foundTranslations.has(fullKey)) {
                                foundTranslations.set(fullKey, {
                                    files: [],
                                    namespace: namespace,
                                    key: key,
                                    fullKey: fullKey
                                });
                            }
                            // Store relative path for display
                            const relativePath = path.relative(frontendPath, file).replace(/\\/g, '/');
                            foundTranslations.get(fullKey).files.push(relativePath);
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }
            
            // Convert map to array and add suggested values
            for (const [fullKey, data] of foundTranslations) {
                orphanedKeys.push({
                    ...data,
                    suggestedValue: data.key.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    fileCount: data.files.length
                });
            }
            
            // Sort by namespace and then by key
            orphanedKeys.sort((a, b) => {
                if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
                return a.key.localeCompare(b.key);
            });
            
            console.log(`[ORPHAN SCAN] Found ${orphanedKeys.length} orphaned keys`);
            
            res.json({
                total: orphanedKeys.length,
                orphaned: orphanedKeys,
                stats: {
                    totalFiles: allFiles.length,
                    totalMessageKeys: allMessageKeys.size,
                    totalOrphaned: orphanedKeys.length
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Add orphaned keys back to message files
    router.post('/restore', async (req, res) => {
        try {
            const { keys, locales: targetLocales } = req.body;
            
            if (!keys || !Array.isArray(keys)) {
                return res.status(400).json({ error: 'Keys array is required' });
            }
            
            const results = {
                added: {},
                errors: []
            };
            
            // Default to English if no locales specified
            const localesToUpdate = targetLocales || ['en'];
            
            // Add keys to each locale
            for (const localeCode of localesToUpdate) {
                const locale = api.locales.get(localeCode);
                
                if (!locale) {
                    results.errors.push({ locale: localeCode, error: 'Locale not found' });
                    continue;
                }
                
                let added = 0;
                for (const item of keys) {
                    const fullKey = item.fullKey || item;
                    const value = item.suggestedValue || item.value || fullKey.split('.').pop().replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    // Add the key if it doesn't exist
                    if (!locale.keys[fullKey]) {
                        locale.keys[fullKey] = value;
                        added++;
                    }
                }
                
                if (added > 0) {
                    try {
                        // Save the updated locale
                        await api.saveLocale(localeCode);
                        results.added[localeCode] = added;
                    } catch (error) {
                        results.errors.push({ locale: localeCode, error: error.message });
                    }
                }
            }
            
            res.json({
                success: true,
                results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Clean orphaned keys from TSX files
    router.post('/clean', async (req, res) => {
        try {
            const { keys } = req.body;
            
            if (!keys || !Array.isArray(keys)) {
                return res.status(400).json({ error: 'Keys array is required' });
            }
            
            const frontendPath = path.join(__dirname, '../../../../frontend');
            const tsxFiles = getTsxFiles();
            
            const results = {
                cleaned: {},
                errors: []
            };
            
            // Process each file
            for (const file of tsxFiles) {
                // file is already a full path from getTsxFiles
                const filePath = file;
                try {
                    let content = await fs.readFile(filePath, 'utf8');
                    let modified = false;
                    
                    for (const keyInfo of keys) {
                        const namespace = keyInfo.namespace || keyInfo.fullKey?.split('.')[0];
                        const key = keyInfo.key || keyInfo.fullKey?.split('.').slice(1).join('.') || keyInfo;
                        
                        if (!namespace || !key) continue;
                        
                        // Check if file uses this namespace
                        const namespacePattern = new RegExp(`useTranslations\\(['"\`]${namespace}['"\`]\\)`);
                        const usesNamespace = namespacePattern.test(content);
                        
                        if (usesNamespace) {
                            // File uses namespace, so we look for t('key')
                            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            
                            // Pattern to match t('key') with word boundaries
                            const patterns = [
                                new RegExp(`\\bt\\(['"\`]${escapedKey}['"\`]\\)`, 'g'),
                                new RegExp(`{\\s*t\\(['"\`]${escapedKey}['"\`]\\)\\s*}`, 'g'),
                            ];
                            
                            for (const pattern of patterns) {
                                const matches = content.match(pattern);
                                if (matches) {
                                    // Replace with the key itself as a fallback
                                    content = content.replace(pattern, `'${key}'`);
                                    modified = true;
                                    
                                    if (!results.cleaned[file]) {
                                        results.cleaned[file] = [];
                                    }
                                    results.cleaned[file].push(key);
                                }
                            }
                        }
                    }
                    
                    if (modified) {
                        await fs.writeFile(filePath, content, 'utf8');
                    }
                    
                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }
            
            const totalCleaned = Object.values(results.cleaned).reduce((sum, arr) => sum + arr.length, 0);
            
            res.json({
                success: true,
                message: `Cleaned ${totalCleaned} orphaned keys from ${Object.keys(results.cleaned).length} files`,
                results
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Suggest key replacements
    router.post('/suggest', async (req, res) => {
        try {
            const { key } = req.body;
            
            if (!key) {
                return res.status(400).json({ error: 'Key is required' });
            }
            
            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }
            
            const suggestions = [];
            const keyLower = key.toLowerCase();
            
            // Find similar keys
            for (const existingKey of Object.keys(enLocale.keys)) {
                if (existingKey.toLowerCase().includes(keyLower) || 
                    keyLower.includes(existingKey.toLowerCase())) {
                    suggestions.push({
                        key: existingKey,
                        value: enLocale.keys[existingKey],
                        similarity: calculateSimilarity(key, existingKey)
                    });
                }
            }
            
            // Sort by similarity
            suggestions.sort((a, b) => b.similarity - a.similarity);
            
            res.json({
                suggestions: suggestions.slice(0, 10) // Top 10 suggestions
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

function calculateSimilarity(str1, str2) {
    // Simple similarity calculation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

module.exports = createOrphanedRoutes;