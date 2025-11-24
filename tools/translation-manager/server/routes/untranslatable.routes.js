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
            
            res.json({
                total: untranslatableItems.length,
                items: untranslatableItems,
                stats: {
                    placeholder: untranslatableItems.filter(i => i.type === 'placeholder').length,
                    underscore: untranslatableItems.filter(i => i.type === 'underscore').length,
                    symbols: untranslatableItems.filter(i => i.type === 'symbol').length,
                    numbers: untranslatableItems.filter(i => i.type === 'number').length,
                    single: untranslatableItems.filter(i => i.type === 'single').length,
                    emoji: untranslatableItems.filter(i => i.type === 'emoji').length,
                    special: untranslatableItems.filter(i => i.type === 'special').length,
                    whitespace: untranslatableItems.filter(i => i.type === 'whitespace').length
                }
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

    // Clean untranslatable texts
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

    return router;
}

module.exports = createUntranslatableRoutes;