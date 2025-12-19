const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

function createUntranslatableRoutes(api, untranslatableConfig, getTsxFiles) {
    // Scan for untranslatable texts
    router.get('/scan', async (req, res) => {
        try {
            const untranslatableItems = [];
            const enLocale = api.locales.get('en');
            
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }
            
            // Get all enabled patterns from config
            const allPatterns = [...(untranslatableConfig.patterns || []), ...(untranslatableConfig.customPatterns || [])];
            const enabledPatterns = allPatterns.filter(p => p.enabled !== false);
            
            // Scan all English keys
            for (const [key, value] of Object.entries(enLocale.keys)) {
                // Skip empty values
                if (!value || typeof value !== 'string') continue;
                
                const trimmedValue = value.trim();
                
                // Check if value matches any untranslatable pattern
                let type = null;
                let shouldInclude = false;
                let suggestedReplacement = null;
                let matchedPattern = null;
                
                // Extract just the key part (after the last dot)
                const keyPart = key.split('.').pop();
                
                // Check against configured patterns
                for (const patternConfig of enabledPatterns) {
                    const testValue = patternConfig.testOn === 'key' ? keyPart : trimmedValue;
                    const regex = new RegExp(patternConfig.pattern, patternConfig.flags || '');
                    
                    if (regex.test(testValue)) {
                        type = patternConfig.category || patternConfig.id;
                        shouldInclude = true;
                        
                        // Store which pattern matched for debugging
                        matchedPattern = patternConfig.name || patternConfig.id;
                        
                        // Determine replacement based on config
                        if (patternConfig.replacement === 'self') {
                            suggestedReplacement = value;
                        } else if (patternConfig.replacement === 'space') {
                            suggestedReplacement = ' ';
                        } else if (patternConfig.replacement === 'empty') {
                            suggestedReplacement = '';
                        } else if (patternConfig.replacement === 'underscore') {
                            suggestedReplacement = '_';
                        } else {
                            suggestedReplacement = patternConfig.replacement || value;
                        }
                        
                        break; // Stop after first match
                    }
                }
                
                if (shouldInclude) {
                    // Check if this appears identical in all locales
                    let identicalCount = 0;
                    let totalLocales = 0;
                    
                    for (const [localeCode, locale] of api.locales.entries()) {
                        if (localeCode === 'en') continue;
                        totalLocales++;
                        if (locale.keys[key] === value) {
                            identicalCount++;
                        }
                    }
                    
                    untranslatableItems.push({
                        key,
                        value,
                        type,
                        suggestedReplacement,
                        matchedPattern,
                        identicalIn: identicalCount,
                        totalLocales,
                        percentIdentical: totalLocales > 0 ? Math.round((identicalCount / totalLocales) * 100) : 0,
                        locale: 'en'
                    });
                }
            }
            
            // Sort by type and then by key
            untranslatableItems.sort((a, b) => {
                if (a.type !== b.type) return a.type.localeCompare(b.type);
                return a.key.localeCompare(b.key);
            });

            // Build stats dynamically from actual types found
            const stats = {};
            for (const item of untranslatableItems) {
                if (item.type) {
                    stats[item.type] = (stats[item.type] || 0) + 1;
                }
            }

            res.json({
                total: untranslatableItems.length,
                items: untranslatableItems,
                stats
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get untranslatable config
    router.get('/config', (req, res) => {
        res.json(untranslatableConfig);
    });

    // Add custom pattern to config
    router.post('/config/pattern', async (req, res) => {
        try {
            const { pattern } = req.body;
            
            if (!pattern || !pattern.id || !pattern.pattern) {
                return res.status(400).json({ error: 'Invalid pattern configuration' });
            }
            
            // Initialize custom patterns if not exists
            if (!untranslatableConfig.customPatterns) {
                untranslatableConfig.customPatterns = [];
            }
            
            // Check if pattern with same ID exists
            const existingIndex = untranslatableConfig.customPatterns.findIndex(p => p.id === pattern.id);
            if (existingIndex >= 0) {
                untranslatableConfig.customPatterns[existingIndex] = pattern;
            } else {
                untranslatableConfig.customPatterns.push(pattern);
            }
            
            // Save config to file
            await fs.writeFile(
                path.join(__dirname, '../../../untranslatable-config.json'),
                JSON.stringify(untranslatableConfig, null, 2)
            );
            
            res.json({ success: true, pattern });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Delete custom pattern from config
    router.delete('/config/pattern/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!untranslatableConfig.customPatterns) {
                return res.status(404).json({ error: 'Pattern not found' });
            }
            
            const index = untranslatableConfig.customPatterns.findIndex(p => p.id === id);
            if (index < 0) {
                return res.status(404).json({ error: 'Pattern not found' });
            }
            
            untranslatableConfig.customPatterns.splice(index, 1);
            
            // Save config to file
            await fs.writeFile(
                path.join(__dirname, '../../../untranslatable-config.json'),
                JSON.stringify(untranslatableConfig, null, 2)
            );
            
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Toggle pattern enabled/disabled
    router.patch('/config/pattern/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Find in default patterns
            let pattern = untranslatableConfig.patterns?.find(p => p.id === id);
            let isCustom = false;
            
            // If not found, look in custom patterns
            if (!pattern) {
                pattern = untranslatableConfig.customPatterns?.find(p => p.id === id);
                isCustom = true;
            }
            
            if (!pattern) {
                return res.status(404).json({ error: 'Pattern not found' });
            }
            
            // Toggle enabled state
            pattern.enabled = !pattern.enabled;
            
            // Save config to file
            await fs.writeFile(
                path.join(__dirname, '../../../untranslatable-config.json'),
                JSON.stringify(untranslatableConfig, null, 2)
            );
            
            res.json({ success: true, enabled: pattern.enabled });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Clean untranslatable texts (just replace values in locales)
    router.post('/clean', async (req, res) => {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'No items provided' });
            }

            const results = {
                replaced: {},
                removed: {},
                errors: [],
                tsxFiles: []
            };

            // Process each locale
            for (const [localeCode, locale] of api.locales.entries()) {
                const updatedKeys = { ...locale.keys };
                let changesCount = 0;

                for (const item of items) {
                    if (updatedKeys[item.key]) {
                        if (item.suggestedReplacement !== null && item.suggestedReplacement !== undefined) {
                            updatedKeys[item.key] = item.suggestedReplacement;
                            changesCount++;
                        }
                    }
                }

                if (changesCount > 0) {
                    await api.saveLocale(localeCode, updatedKeys);
                    results.replaced[localeCode] = changesCount;
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

    // Remove untranslatable keys from locales AND revert TSX files to literal strings
    router.post('/remove', async (req, res) => {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'No items provided' });
            }

            const results = {
                keysRemoved: 0,
                localesModified: new Set(),
                tsxFilesModified: new Set(),
                replacements: [],
                errors: []
            };

            // Get all TSX files once
            const tsxFiles = getTsxFiles();
            console.log(`[UNTRANSLATABLE] Found ${tsxFiles.length} TSX files to scan`);

            // Group items by namespace for efficient TSX processing
            const itemsByNamespace = {};
            for (const item of items) {
                const [namespace, ...keyParts] = item.key.split('.');
                const keyPart = keyParts.join('.');
                if (!itemsByNamespace[namespace]) {
                    itemsByNamespace[namespace] = [];
                }
                itemsByNamespace[namespace].push({
                    ...item,
                    namespace,
                    keyPart,
                    // The value to replace t('key') with - use the original value as literal text
                    literalValue: item.value
                });
            }

            // Step 1: Update TSX files - replace t('key') with literal value
            console.log(`[UNTRANSLATABLE] Processing ${Object.keys(itemsByNamespace).length} namespaces...`);

            for (const tsxFile of tsxFiles) {
                try {
                    let content = await fs.readFile(tsxFile, 'utf8');
                    let fileModified = false;

                    for (const [namespace, namespaceItems] of Object.entries(itemsByNamespace)) {
                        // Check if file uses this namespace (client or server components)
                        const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                        const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                        if (!clientNamespacePattern.test(content) && !serverNamespacePattern.test(content)) continue;

                        for (const item of namespaceItems) {
                            // Match t('keyPart') or t("keyPart") or tVarName('keyPart')
                            // Need to handle both t() and aliased translators like tCommon()
                            const keyPatterns = [
                                // Standard t('key')
                                new RegExp(`\\bt\\s*\\(\\s*['"\`]${item.keyPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\s*\\)`, 'g'),
                                // Aliased translators like tCommon('key'), tExt('key'), etc.
                                new RegExp(`\\bt\\w+\\s*\\(\\s*['"\`]${item.keyPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]\\s*\\)`, 'g'),
                            ];

                            for (const keyPattern of keyPatterns) {
                                if (keyPattern.test(content)) {
                                    keyPattern.lastIndex = 0;

                                    // Escape the literal value for JSX
                                    let replacement = item.literalValue;

                                    // If the value contains special characters, we might need quotes
                                    // But typically in JSX we just use the literal text
                                    // Check if it's inside JSX attribute vs JSX content

                                    // For now, use quoted string for safety
                                    const escapedValue = replacement
                                        .replace(/\\/g, '\\\\')
                                        .replace(/"/g, '\\"')
                                        .replace(/\n/g, '\\n');

                                    content = content.replace(keyPattern, `"${escapedValue}"`);
                                    fileModified = true;

                                    results.replacements.push({
                                        file: tsxFile.replace(/.*[\/\\]frontend[\/\\]/, ''),
                                        key: item.key,
                                        from: `t('${item.keyPart}')`,
                                        to: `"${escapedValue}"`
                                    });

                                    console.log(`[UNTRANSLATABLE] ${tsxFile.replace(/.*[\/\\]frontend[\/\\]/, '')}: t('${item.keyPart}') → "${escapedValue.substring(0, 30)}..."`);
                                }
                            }
                        }
                    }

                    if (fileModified) {
                        await fs.writeFile(tsxFile, content, 'utf8');
                        results.tsxFilesModified.add(tsxFile);
                    }
                } catch (err) {
                    console.error(`Error processing TSX file ${tsxFile}:`, err.message);
                    results.errors.push({ file: tsxFile, error: err.message });
                }
            }

            console.log(`[UNTRANSLATABLE] Modified ${results.tsxFilesModified.size} TSX files`);

            // Step 2: Remove keys from all locales
            console.log(`[UNTRANSLATABLE] Removing ${items.length} keys from locales...`);

            for (const [localeCode, locale] of api.locales.entries()) {
                let localeModified = false;

                for (const item of items) {
                    if (locale.keys[item.key]) {
                        delete locale.keys[item.key];
                        localeModified = true;
                        results.keysRemoved++;
                    }
                }

                if (localeModified) {
                    await api.saveLocale(localeCode);
                    results.localesModified.add(localeCode);
                }
            }

            console.log(`[UNTRANSLATABLE] Removed keys from ${results.localesModified.size} locales`);

            res.json({
                success: true,
                stats: {
                    keysRemoved: results.keysRemoved,
                    localesModified: results.localesModified.size,
                    tsxFilesModified: results.tsxFilesModified.size
                },
                replacements: results.replacements.slice(0, 50), // Limit response size
                modifiedFiles: {
                    locales: [...results.localesModified],
                    tsx: [...results.tsxFilesModified].map(f => f.replace(/.*[\/\\]frontend[\/\\]/, ''))
                },
                errors: results.errors,
                message: `Removed ${items.length} untranslatable keys from ${results.localesModified.size} locales and reverted ${results.tsxFilesModified.size} TSX files to literal strings.`
            });
        } catch (error) {
            console.error('[UNTRANSLATABLE] Remove error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createUntranslatableRoutes;