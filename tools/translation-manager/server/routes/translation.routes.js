const express = require('express');
const router = express.Router();

function createTranslationRoutes(api, translationState, wsManager) {
    // Get all locales
    router.get('/locales', async (req, res) => {
        try {
            const locales = {};
            
            for (const [code, locale] of api.locales.entries()) {
                const progress = api.calculateProgress(locale);
                locales[code] = {
                    name: locale.name,
                    totalKeys: locale.totalKeys,
                    ...progress
                };
            }
            
            res.json({
                locales,
                totalKeys: api.locales.get('en')?.totalKeys || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get locale keys
    router.get('/locales/:locale/keys', async (req, res) => {
        try {
            const locale = api.locales.get(req.params.locale);
            const enLocale = api.locales.get('en');
            
            if (!locale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            const keys = [];
            const enKeys = enLocale?.keys || {};
            const localeKeys = locale.keys;
            
            for (const key in enKeys) {
                const needsTranslation = !localeKeys[key] || localeKeys[key].trim() === '';
                const isIdentical = localeKeys[key] === enKeys[key];
                
                keys.push({
                    path: key,
                    value: localeKeys[key] || '',
                    englishValue: enKeys[key],
                    needsTranslation,
                    isIdentical
                });
            }
            
            res.json({ keys });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Update translation
    router.put('/locales/:locale/keys', async (req, res) => {
        try {
            const locale = api.locales.get(req.params.locale);
            if (!locale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            const { key, value } = req.body;
            
            // Update the flattened keys
            const updatedKeys = { ...locale.keys, [key]: value };
            
            // Save to file
            await api.saveLocale(req.params.locale, updatedKeys);
            
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // AI translate single key (legacy endpoint)
    router.post('/ai-translate-key', async (req, res) => {
        try {
            const { text, targetLocale, context } = req.body;
            
            const translation = await api.callClaudeCode(text, targetLocale, context);
            
            res.json({ translation });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Claude translation endpoint (supports both single and batch)
    router.post('/translate/claude', async (req, res) => {
        try {
            const { text, texts, targetLocale, languageName, context } = req.body;
            
            // Support both single text and array of texts
            const inputTexts = texts || text;
            
            if (!inputTexts || !targetLocale) {
                return res.status(400).json({ error: 'Text(s) and target locale are required' });
            }
            
            const translation = await api.callClaudeCode(inputTexts, targetLocale, context || '');
            
            // Return in same format as input (single or array)
            res.json({ 
                translation: Array.isArray(inputTexts) ? translation : translation,
                translations: Array.isArray(inputTexts) ? translation : undefined
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // AI translate batch (optimized for batch processing with WebSocket progress)
    router.post('/ai-translate', async (req, res) => {
        const { targetLocale, mode, priority, batchSize = 10 } = req.body;
        
        try {
            
            // Check if translation is already in progress for this locale
            if (translationState.isActive(targetLocale)) {
                return res.status(409).json({ 
                    error: 'Translation already in progress for this locale',
                    locale: targetLocale 
                });
            }
            
            const locale = api.locales.get(targetLocale);
            const enLocale = api.locales.get('en');
            
            if (!locale || !enLocale) {
                return res.status(404).json({ error: 'Locale not found' });
            }
            
            // Mark this locale as being translated
            translationState.addActive(targetLocale, {
                startTime: Date.now(),
                mode: mode,
                batchSize: batchSize
            });
            
            // Get keys to translate based on mode
            let keysToTranslate = [];
            
            // Debug logging
            console.log(`Debug: EN keys count: ${Object.keys(enLocale.keys).length}`);
            console.log(`Debug: ${targetLocale} keys count: ${Object.keys(locale.keys).length}`);
            
            if (mode === 'missing') {
                for (const key in enLocale.keys) {
                    if (!Object.prototype.hasOwnProperty.call(locale.keys, key) || !locale.keys[key] || (typeof locale.keys[key] === 'string' && locale.keys[key].trim() === '')) {
                        keysToTranslate.push({ key, value: enLocale.keys[key] });
                    }
                }
                console.log(`Debug: Found ${keysToTranslate.length} missing keys to translate`);
            } else if (mode === 'identical') {
                const identical = await api.findIdenticalValues('en', targetLocale);
                keysToTranslate = identical;
            } else if (mode === 'both') {
                // First add missing keys
                for (const key in enLocale.keys) {
                    if (!Object.prototype.hasOwnProperty.call(locale.keys, key) || !locale.keys[key] || locale.keys[key].trim() === '') {
                        keysToTranslate.push({ key, value: enLocale.keys[key] });
                    }
                }
                // Then add identical keys
                const identical = await api.findIdenticalValues('en', targetLocale);
                keysToTranslate = [...keysToTranslate, ...identical];
                // Remove duplicates
                const uniqueKeys = new Map();
                keysToTranslate.forEach(item => {
                    uniqueKeys.set(item.key, item);
                });
                keysToTranslate = Array.from(uniqueKeys.values());
            }
            
            // Filter by priority if needed
            if (priority && priority !== 'all') {
                keysToTranslate = keysToTranslate.filter(item => {
                    return api.getKeyPriority(item.key) === priority || 
                           (priority === 'medium' && api.getKeyPriority(item.key) === 'high');
                });
            }
            
            // Broadcast translation start
            wsManager.broadcast({
                type: 'translation_start',
                locale: targetLocale,
                mode: mode,
                totalKeys: keysToTranslate.length,
                priority: priority
            });
            
            // Process translations in batches
            const results = [];
            const totalBatches = Math.ceil(keysToTranslate.length / batchSize);
            
            console.log(`Starting batch translation: ${keysToTranslate.length} keys in ${totalBatches} batches`);
            
            // Progress callback for WebSocket updates
            const progressCallback = (update) => {
                wsManager.broadcast(update);
            };
            
            for (let i = 0; i < keysToTranslate.length; i += batchSize) {
                // Check if translation was cancelled
                if (translationState.isCancelled(targetLocale)) {
                    console.log(`Translation cancelled for ${targetLocale}`);
                    wsManager.broadcast({
                        type: 'translation_cancelled',
                        locale: targetLocale,
                        completedBatches: Math.floor(i / batchSize),
                        totalBatches: totalBatches
                    });
                    translationState.clearCancelled(targetLocale);
                    translationState.removeActive(targetLocale);
                    return res.json({
                        success: false,
                        cancelled: true,
                        completed: results.length,
                        total: keysToTranslate.length
                    });
                }
                
                // Check if translation was paused
                while (translationState.isPaused(targetLocale)) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Check for cancellation while paused
                    if (translationState.isCancelled(targetLocale)) {
                        console.log(`Translation cancelled while paused for ${targetLocale}`);
                        translationState.clearCancelled(targetLocale);
                        translationState.removeActive(targetLocale);
                        return res.json({
                            success: false,
                            cancelled: true,
                            completed: results.length,
                            total: keysToTranslate.length
                        });
                    }
                }
                
                const batch = keysToTranslate.slice(i, i + batchSize);
                const batchTexts = batch.map(item => item.value);
                const batchKeys = batch.map(item => item.key);
                const batchNumber = Math.floor(i / batchSize) + 1;
                
                // Broadcast batch start
                wsManager.broadcast({
                    type: 'batch_processing',
                    locale: targetLocale,
                    batchNumber: batchNumber,
                    totalBatches: totalBatches,
                    batchSize: batch.length,
                    keys: batchKeys
                });
                
                try {
                    // Get context from keys (e.g., "user.profile" -> "User profile section")
                    const context = `Keys: ${batchKeys.slice(0, 3).join(', ')}${batchKeys.length > 3 ? '...' : ''}`;
                    
                    // Call Claude with batch of texts and progress callback
                    const translations = await api.callClaudeCode(batchTexts, targetLocale, context, progressCallback);
                    
                    // Validate translations array length
                    if (!Array.isArray(translations) || translations.length !== batch.length) {
                        console.error(`Translation count mismatch! Expected ${batch.length}, got ${translations ? translations.length : 0}`);
                        console.error('Batch keys:', batchKeys);
                        console.error('Batch texts:', batchTexts);
                        console.error('Received translations:', translations);
                        
                        // Fall back to originals if mismatch
                        batch.forEach(item => {
                            results.push({
                                key: item.key,
                                original: item.value,
                                translated: item.value,
                                status: 'error',
                                error: 'Translation count mismatch'
                            });
                        });
                        wsManager.broadcast({
                            type: 'batch_error',
                            locale: targetLocale,
                            batchNumber: batchNumber,
                            error: 'Translation count mismatch'
                        });
                        continue; // Skip to next batch
                    }
                    
                    // Map translations back to keys with validation
                    let successCount = 0;
                    let unchangedCount = 0;
                    
                    batch.forEach((item, idx) => {
                        // Additional validation - ensure translation exists and is valid
                        let translatedValue = translations[idx];
                        
                        // Check if translation is valid
                        if (!translatedValue || typeof translatedValue !== 'string') {
                            console.warn(`Invalid translation at index ${idx} for key ${item.key}`);
                            translatedValue = item.value; // Fall back to original
                        }
                        
                        // Enhanced validation for key-value pairing
                        const originalText = item.value;
                        
                        // Check for placeholder preservation
                        const origPlaceholders = (originalText.match(/{[^}]+}|%[sd]/g) || []).sort().join(',');
                        const transPlaceholders = (translatedValue.match(/{[^}]+}|%[sd]/g) || []).sort().join(',');
                        
                        if (origPlaceholders !== transPlaceholders) {
                            console.warn(`⚠️ Placeholder mismatch in ${targetLocale} for key "${item.key}"`);
                            console.warn(`  Original: ${origPlaceholders || 'none'}`);
                            console.warn(`  Translated: ${transPlaceholders || 'none'}`);
                        }
                        
                        // Check for suspicious patterns
                        if (originalText.match(/^[A-Za-z]/) && translatedValue.match(/^[🔍📊📈💰🎮]/)) {
                            console.warn(`⚠️ Suspicious translation for ${targetLocale} key "${item.key}"`);
                            console.warn(`  Original: "${originalText.substring(0, 30)}..."`);
                            console.warn(`  Translated: "${translatedValue.substring(0, 30)}..."`);
                        }
                        
                        // Check for obvious mismatches (e.g., numbers becoming text)
                        if (originalText.match(/^\d+$/) && !translatedValue.match(/^\d/)) {
                            console.warn(`⚠️ Number format lost in ${targetLocale} for key "${item.key}"`);
                        }
                        
                        // Check if translation is actually different
                        const isChanged = translatedValue && translatedValue.toLowerCase() !== item.value.toLowerCase();
                        const status = isChanged ? 'success' : 'unchanged';
                        
                        if (status === 'success') successCount++;
                        else unchangedCount++;
                        
                        results.push({
                            key: item.key,
                            original: item.value,
                            translated: translatedValue,
                            status: status
                        });
                        
                        // Broadcast individual key translation
                        wsManager.broadcast({
                            type: 'key_translated',
                            locale: targetLocale,
                            key: item.key,
                            original: item.value,
                            translated: translations[idx] || item.value,
                            status: status,
                            progress: results.length,
                            total: keysToTranslate.length
                        });
                    });
                    
                    // Broadcast batch complete
                    wsManager.broadcast({
                        type: 'batch_complete',
                        locale: targetLocale,
                        batchNumber: batchNumber,
                        totalBatches: totalBatches,
                        successCount: successCount,
                        unchangedCount: unchangedCount,
                        progress: results.length,
                        total: keysToTranslate.length
                    });
                    
                    console.log(`Batch ${batchNumber}/${totalBatches} completed: ${successCount} translated, ${unchangedCount} unchanged`);
                    
                    // Save successful translations from this batch immediately
                    if (successCount > 0) {
                        try {
                            const batchSuccessful = results.slice(-batch.length).filter(r => r.status === 'success');
                            for (const trans of batchSuccessful) {
                                locale.keys[trans.key] = trans.translated;
                            }
                            await api.saveLocale(targetLocale, locale.keys);
                            console.log(`Saved ${batchSuccessful.length} translations from batch ${batchNumber}`);
                        } catch (saveError) {
                            console.error(`Failed to save batch ${batchNumber} translations:`, saveError);
                        }
                    }
                } catch (error) {
                    console.error(`Batch translation error: ${error.message}`);
                    
                    // Broadcast batch error
                    wsManager.broadcast({
                        type: 'batch_error',
                        locale: targetLocale,
                        batchNumber: batchNumber,
                        error: error.message
                    });
                    
                    // On error, keep original values
                    batch.forEach(item => {
                        results.push({
                            key: item.key,
                            original: item.value,
                            translated: item.value,
                            status: 'error',
                            error: error.message
                        });
                    });
                }
                
                // Small delay between batches to avoid overwhelming
                if (i + batchSize < keysToTranslate.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Final save no longer needed since we save after each batch
            const successfulTranslations = results.filter(r => r.status === 'success');
            console.log(`Translation complete: ${successfulTranslations.length} total translations saved to ${targetLocale}.json`);
            
            
            // Broadcast translation complete
            const successTotal = results.filter(r => r.status === 'success').length;
            const unchangedTotal = results.filter(r => r.status === 'unchanged').length;
            const errorTotal = results.filter(r => r.status === 'error').length;
            
            // Get unchanged items for history tracking
            const unchangedItems = results.filter(r => r.status === 'unchanged').map(r => ({
                key: r.key,
                value: r.original
            }));

            wsManager.broadcast({
                type: 'translation_complete',
                locale: targetLocale,
                totalKeys: keysToTranslate.length,
                successCount: successTotal,
                unchangedCount: unchangedTotal,
                errorCount: errorTotal,
                unchangedItems: unchangedItems
            })
            
            // Clear the active translation for this locale
            translationState.removeActive(targetLocale);
            
            res.json({
                success: true,
                total: keysToTranslate.length,
                translations: results,
                totalBatches,
                successCount: successTotal,
            });
            
        } catch (error) {
            // Clear the active translation on error
            if (targetLocale) {
                translationState.removeActive(targetLocale);
            }
            res.status(500).json({ error: error.message });
        }
    });

    // Get active translations status
    router.get('/translations/active', (req, res) => {
        const active = translationState.getActiveTranslations();
        const paused = translationState.getPausedTranslations();
        res.json({ active: [...active, ...paused] });
    });

    // Stop/cancel a translation
    router.post('/translations/stop/:locale', (req, res) => {
        const { locale } = req.params;
        if (translationState.isActive(locale)) {
            translationState.cancel(locale);
            wsManager.broadcast({
                type: 'translation_cancelled',
                locale: locale
            });
            res.json({ success: true, message: `Stopping translation for ${locale}` });
        } else {
            res.status(404).json({ error: 'No active translation found for this locale' });
        }
    });

    // Stop all active translations
    router.post('/translations/stop-all', (req, res) => {
        const stoppedLocales = translationState.getActiveTranslations().map(t => t.locale);
        translationState.cancelAll();
        
        stoppedLocales.forEach(locale => {
            wsManager.broadcast({
                type: 'translation_cancelled',
                locale: locale
            });
        });
        
        res.json({ 
            success: true, 
            message: `Stopped ${stoppedLocales.length} translations`,
            locales: stoppedLocales 
        });
    });

    // Pause translation
    router.post('/translations/pause/:locale', (req, res) => {
        const { locale } = req.params;
        if (translationState.pause(locale)) {
            wsManager.broadcast({
                type: 'translation_paused',
                locale: locale
            });
            res.json({ success: true, message: `Paused translation for ${locale}` });
        } else {
            res.status(404).json({ error: 'No active translation found for this locale' });
        }
    });

    // Resume translation
    router.post('/translations/resume/:locale', (req, res) => {
        const { locale } = req.params;
        const data = translationState.resume(locale);
        if (data) {
            wsManager.broadcast({
                type: 'translation_resumed',
                locale: locale
            });
            res.json({ success: true, message: `Resumed translation for ${locale}` });
        } else {
            res.status(404).json({ error: 'No paused translation found for this locale' });
        }
    });

    // Delete active translation
    router.delete('/translations/active/:locale', (req, res) => {
        const { locale } = req.params;
        if (translationState.isActive(locale) || translationState.isPaused(locale)) {
            translationState.cancel(locale);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'No translation found for this locale' });
        }
    });

    return router;
}

module.exports = createTranslationRoutes;