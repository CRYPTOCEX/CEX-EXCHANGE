const express = require('express');
const router = express.Router();

function createComparisonRoutes(api) {
    // Compare two locales
    router.post('/compare', async (req, res) => {
        try {
            const { source, target } = req.body;
            
            const sourceLocale = api.locales.get(source);
            const targetLocale = api.locales.get(target);
            
            if (!sourceLocale || !targetLocale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            const comparison = {
                missing: [],
                identical: [],
                different: []
            };
            
            const sourceKeys = sourceLocale.keys;
            const targetKeys = targetLocale.keys;
            
            for (const key in sourceKeys) {
                if (!targetKeys[key]) {
                    comparison.missing.push({
                        key,
                        sourceValue: sourceKeys[key]
                    });
                } else if (sourceKeys[key] === targetKeys[key]) {
                    comparison.identical.push({
                        key,
                        value: sourceKeys[key]
                    });
                } else {
                    comparison.different.push({
                        key,
                        sourceValue: sourceKeys[key],
                        targetValue: targetKeys[key]
                    });
                }
            }
            
            res.json({
                source: sourceLocale.name,
                target: targetLocale.name,
                stats: {
                    missing: comparison.missing.length,
                    identical: comparison.identical.length,
                    different: comparison.different.length,
                    total: Object.keys(sourceKeys).length
                },
                comparison
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get comparison between two locales
    router.get('/compare/:source/:target', async (req, res) => {
        try {
            const { source, target } = req.params;
            
            const sourceLocale = api.locales.get(source);
            const targetLocale = api.locales.get(target);
            
            if (!sourceLocale || !targetLocale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            const identical = await api.findIdenticalValues(source, target);
            
            res.json({
                source: sourceLocale.name,
                target: targetLocale.name,
                identical: identical.length,
                items: identical
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Find identical values
    router.post('/identical', async (req, res) => {
        try {
            const { sourceLocale = 'en', targetLocale } = req.body;
            
            const identical = await api.findIdenticalValues(sourceLocale, targetLocale);
            
            res.json({
                total: identical.length,
                items: identical
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get non-translatable values
    router.get('/non-translatable', async (req, res) => {
        try {
            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }
            
            const nonTranslatable = [];
            
            for (const [key, value] of Object.entries(enLocale.keys)) {
                // Check for patterns that shouldn't be translated
                if (value.match(/^[0-9]+$/) || // Pure numbers
                    value.match(/^[A-Z_]+$/) || // All caps with underscores
                    value.match(/^\{.*\}$/) || // Placeholders
                    value.match(/^%[sd]$/) || // Format specifiers
                    value === '' || // Empty strings
                    value === ' ' || // Single space
                    value === '_') { // Single underscore
                    
                    nonTranslatable.push({ key, value });
                }
            }
            
            res.json({
                total: nonTranslatable.length,
                items: nonTranslatable
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Remove non-translatable values from other locales
    router.post('/non-translatable/remove', async (req, res) => {
        try {
            const { keys, targetLocale } = req.body;
            
            if (!keys || !Array.isArray(keys)) {
                return res.status(400).json({ error: 'Invalid keys array' });
            }
            
            const locale = api.locales.get(targetLocale);
            if (!locale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            const updatedKeys = { ...locale.keys };
            let removedCount = 0;
            
            for (const key of keys) {
                if (updatedKeys[key]) {
                    delete updatedKeys[key];
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                await api.saveLocale(targetLocale, updatedKeys);
            }
            
            res.json({
                success: true,
                removed: removedCount
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createComparisonRoutes;