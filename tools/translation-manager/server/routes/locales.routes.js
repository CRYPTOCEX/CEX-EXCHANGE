const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

module.exports = (translationApi) => {
    // Get locale configuration
    router.get('/locale-config', async (req, res) => {
        try {
            // Read from .env file or return current state
            const envPath = path.join(__dirname, '../../.env');
            let enabledLocales = [];
            let defaultLocale = 'en';
            
            try {
                const envContent = await fs.readFile(envPath, 'utf-8');
                const lines = envContent.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('ENABLED_LOCALES=')) {
                        const value = line.split('=')[1].trim();
                        enabledLocales = value ? value.split(',').map(l => l.trim()) : [];
                    }
                    if (line.startsWith('DEFAULT_LOCALE=')) {
                        defaultLocale = line.split('=')[1].trim() || 'en';
                    }
                }
            } catch (error) {
                console.log('No .env file found or unable to read, using defaults');
            }

            // If no enabled locales configured, return all available locales
            if (enabledLocales.length === 0) {
                // Get all available locales from the translation API
                const localesMap = translationApi.locales;
                if (localesMap && localesMap.size > 0) {
                    enabledLocales = Array.from(localesMap.keys());
                } else {
                    // If no locales loaded yet, try to load them
                    await translationApi.loadLocales();
                    enabledLocales = Array.from(translationApi.locales.keys());
                }
            }

            res.json({
                enabledLocales,
                defaultLocale,
                maxLocales: 12
            });
        } catch (error) {
            console.error('Error getting locale config:', error);
            res.status(500).json({ error: 'Failed to get locale configuration' });
        }
    });

    // Save locale configuration
    router.post('/locale-config', async (req, res) => {
        try {
            const { enabledLocales, defaultLocale } = req.body;
            
            if (!enabledLocales || !Array.isArray(enabledLocales)) {
                return res.status(400).json({ error: 'Invalid enabled locales' });
            }

            if (enabledLocales.length > 12) {
                return res.status(400).json({ error: 'Maximum 12 locales can be enabled' });
            }

            // Update .env file
            const envPath = path.join(__dirname, '../../.env');
            let envContent = '';
            
            try {
                envContent = await fs.readFile(envPath, 'utf-8');
            } catch (error) {
                // Create new .env file if it doesn't exist
                envContent = `# Translation Manager Configuration\n\n`;
            }

            // Update or add ENABLED_LOCALES
            const enabledLocalesLine = `ENABLED_LOCALES=${enabledLocales.join(',')}`;
            const defaultLocaleLine = `DEFAULT_LOCALE=${defaultLocale || 'en'}`;
            
            const lines = envContent.split('\n');
            let enabledLocalesFound = false;
            let defaultLocaleFound = false;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('ENABLED_LOCALES=')) {
                    lines[i] = enabledLocalesLine;
                    enabledLocalesFound = true;
                }
                if (lines[i].startsWith('DEFAULT_LOCALE=')) {
                    lines[i] = defaultLocaleLine;
                    defaultLocaleFound = true;
                }
            }
            
            if (!enabledLocalesFound) {
                lines.push(enabledLocalesLine);
            }
            if (!defaultLocaleFound) {
                lines.push(defaultLocaleLine);
            }
            
            await fs.writeFile(envPath, lines.join('\n'));
            
            res.json({ 
                success: true, 
                enabledLocales, 
                defaultLocale,
                message: 'Configuration saved. Restart the application for changes to take effect.'
            });
        } catch (error) {
            console.error('Error saving locale config:', error);
            res.status(500).json({ error: 'Failed to save locale configuration' });
        }
    });

    // Sync translations - add missing keys from English to all locales
    router.post('/sync-translations', async (req, res) => {
        try {
            const { locales } = req.body;
            
            if (!locales || !Array.isArray(locales)) {
                return res.status(400).json({ error: 'Invalid locales array' });
            }

            // Get English keys
            const englishLocale = translationApi.locales.get('en');
            if (!englishLocale) {
                return res.status(400).json({ error: 'English locale not found' });
            }

            let keysAdded = 0;
            let localesUpdated = 0;

            // Sync each locale
            for (const localeCode of locales) {
                if (localeCode === 'en') continue;
                
                const locale = translationApi.locales.get(localeCode);
                if (!locale) continue;

                let localeUpdated = false;
                
                // Add missing keys from English
                for (const [key, value] of Object.entries(englishLocale.keys)) {
                    if (!locale.keys[key]) {
                        locale.keys[key] = value; // Use English value as placeholder
                        keysAdded++;
                        localeUpdated = true;
                    }
                }

                if (localeUpdated) {
                    await translationApi.saveLocale(localeCode);
                    localesUpdated++;
                }
            }
            
            res.json({
                success: true,
                keysAdded,
                localesUpdated
            });
        } catch (error) {
            console.error('Error syncing translations:', error);
            res.status(500).json({ error: 'Failed to sync translations' });
        }
    });

    // Find bad keys
    router.get('/find-bad-keys', async (req, res) => {
        try {
            const badKeys = [];
            
            // Check all locales for problematic keys
            for (const [localeCode, locale] of translationApi.locales) {
                for (const key of Object.keys(locale.keys)) {
                    // Check for bad patterns
                    if (
                        key.includes(' ') || // spaces in keys
                        key.match(/^[A-Z]/) || // starts with uppercase
                        key.match(/[^a-zA-Z0-9._-]/) // special characters
                    ) {
                        badKeys.push({
                            locale: localeCode,
                            key: key,
                            issues: []
                        });
                        
                        if (key.includes(' ')) badKeys[badKeys.length - 1].issues.push('contains spaces');
                        if (key.match(/^[A-Z]/)) badKeys[badKeys.length - 1].issues.push('starts with uppercase');
                        if (key.match(/[^a-zA-Z0-9._-]/)) badKeys[badKeys.length - 1].issues.push('contains special characters');
                    }
                }
            }
            
            res.json({
                success: true,
                badKeys
            });
        } catch (error) {
            console.error('Error finding bad keys:', error);
            res.status(500).json({ error: 'Failed to find bad keys' });
        }
    });

    // Clean values
    router.post('/clean-values', async (req, res) => {
        try {
            const { locales } = req.body;
            
            if (!locales || !Array.isArray(locales)) {
                return res.status(400).json({ error: 'Invalid locales array' });
            }

            let valuesFixed = 0;
            let localesUpdated = 0;

            for (const localeCode of locales) {
                const locale = translationApi.locales.get(localeCode);
                if (!locale) continue;

                let localeUpdated = false;
                
                for (const [key, value] of Object.entries(locale.keys)) {
                    if (typeof value === 'string') {
                        const cleaned = value
                            .trim() // Remove leading/trailing spaces
                            .replace(/[""]/g, '"') // Replace smart quotes
                            .replace(/['']/g, "'") // Replace smart apostrophes
                            .replace(/\u200B/g, ''); // Remove zero-width spaces
                        
                        if (cleaned !== value) {
                            locale.keys[key] = cleaned;
                            valuesFixed++;
                            localeUpdated = true;
                        }
                    }
                }

                if (localeUpdated) {
                    await translationApi.saveLocale(localeCode);
                    localesUpdated++;
                }
            }
            
            res.json({
                success: true,
                valuesFixed,
                localesUpdated
            });
        } catch (error) {
            console.error('Error cleaning values:', error);
            res.status(500).json({ error: 'Failed to clean values' });
        }
    });

    // Find non-translatable keys
    router.get('/find-non-translatable', async (req, res) => {
        try {
            const nonTranslatable = [];
            
            // Get English locale as reference
            const englishLocale = translationApi.locales.get('en');
            if (!englishLocale) {
                return res.status(400).json({ error: 'English locale not found' });
            }

            for (const [key, value] of Object.entries(englishLocale.keys)) {
                if (typeof value === 'string') {
                    // Check if value is non-translatable
                    if (
                        value.match(/^\d+$/) || // Just numbers
                        value.match(/^[()[\]{}.,;:!?]$/) || // Just punctuation
                        value.match(/^\s*$/) || // Just whitespace
                        value === '' // Empty string
                    ) {
                        nonTranslatable.push({
                            key: key,
                            value: value,
                            reason: value.match(/^\d+$/) ? 'number' :
                                   value.match(/^[()[\]{}.,;:!?]$/) ? 'punctuation' :
                                   value.match(/^\s*$/) ? 'whitespace' : 'empty'
                        });
                    }
                }
            }
            
            res.json({
                success: true,
                nonTranslatable
            });
        } catch (error) {
            console.error('Error finding non-translatable keys:', error);
            res.status(500).json({ error: 'Failed to find non-translatable keys' });
        }
    });

    // Remove non-translatable keys
    router.post('/remove-non-translatable', async (req, res) => {
        try {
            const { keys, locales } = req.body;
            
            if (!keys || !Array.isArray(keys)) {
                return res.status(400).json({ error: 'Invalid keys array' });
            }
            
            if (!locales || !Array.isArray(locales)) {
                return res.status(400).json({ error: 'Invalid locales array' });
            }

            let keysRemoved = 0;
            let localesUpdated = 0;

            for (const localeCode of locales) {
                const locale = translationApi.locales.get(localeCode);
                if (!locale) continue;

                let localeUpdated = false;
                
                for (const key of keys) {
                    if (locale.keys[key] !== undefined) {
                        delete locale.keys[key];
                        keysRemoved++;
                        localeUpdated = true;
                    }
                }

                if (localeUpdated) {
                    await translationApi.saveLocale(localeCode);
                    localesUpdated++;
                }
            }
            
            res.json({
                success: true,
                keysRemoved,
                localesUpdated
            });
        } catch (error) {
            console.error('Error removing non-translatable keys:', error);
            res.status(500).json({ error: 'Failed to remove non-translatable keys' });
        }
    });

    // Delete a locale
    router.delete('/locales/:code', async (req, res) => {
        try {
            const { code } = req.params;
            
            if (!code || code === 'en') {
                return res.status(400).json({ error: 'Cannot delete English locale' });
            }

            // Remove locale from memory
            if (translationApi.locales.has(code)) {
                translationApi.locales.delete(code);
                
                // Delete the locale file
                const messagesDir = process.env.MESSAGES_DIR || path.join(__dirname, '../../../../frontend/messages');
                const localePath = path.join(messagesDir, `${code}.json`);
                
                try {
                    await fs.unlink(localePath);
                } catch (error) {
                    console.error(`Failed to delete file for locale ${code}:`, error);
                }
            }
            
            res.json({
                success: true,
                message: `Locale ${code} deleted successfully`
            });
        } catch (error) {
            console.error('Error deleting locale:', error);
            res.status(500).json({ error: 'Failed to delete locale' });
        }
    });

    return router;
};