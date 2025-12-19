const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Import shared utilities for consistent key generation across all routes
const {
    generateTranslationKey,
    keyToReadableValue,
    shouldSkipForExtraction,
    isValidTranslationKey,
    stripComments
} = require('../services/namespace-utils');

/**
 * Get namespace from file path
 * Matches the logic in extract-translations.service.js
 */
function getNamespaceFromPath(relativePath) {
    let rel = relativePath;

    // Handle components directory -> components namespace
    if (rel.startsWith('components/')) {
        const parts = rel.split('/').filter(Boolean);
        parts.shift(); // Remove 'components'
        parts.pop(); // Remove filename

        if (parts.length === 0) {
            return 'components';
        }

        // Known component sub-namespaces
        const knownSubs = ['nft', 'p2p', 'staking', 'forex', 'futures', 'binary', 'ai', 'ecommerce', 'blog', 'auth', 'blocks'];
        const firstPart = parts[0].toLowerCase();
        if (knownSubs.includes(firstPart)) {
            return `components_${firstPart}`;
        }

        return 'components';
    }

    // Handle app directory
    if (rel.startsWith('app/')) {
        rel = rel.slice(4);
    }

    // Remove [locale]/ prefix
    rel = rel.replace(/^\[locale\]\//, '');

    // Remove filename
    rel = rel.replace(/\/(page|layout|client|error|loading)\.tsx$/, '');
    rel = rel.replace(/\.tsx$/, '');

    const segments = rel.split('/').filter(Boolean);

    // Clean up segments - extract route groups and skip dynamic segments
    const cleanSegments = segments.map(s => {
        if (s.startsWith('(') && s.endsWith(')')) {
            return s.slice(1, -1); // (ext) -> ext
        }
        if (s.startsWith('[') && s.endsWith(']')) {
            return null; // Skip dynamic segments
        }
        return s;
    }).filter(Boolean);

    if (cleanSegments.length === 0) {
        return 'common';
    }

    // Build namespace with max depth of 2
    const MAX_DEPTH = 2;
    const nsSegments = cleanSegments.slice(0, MAX_DEPTH);
    return nsSegments.join('_');
}

function createOrphanedRoutes(api, getTsxFiles) {
    // Scan for orphaned translations (keys used in TSX but not in message files)
    router.get('/scan', async (req, res) => {
        try {
            const orphanedKeys = [];
            const frontendPath = path.join(__dirname, '../../../../frontend');

            // Reload locales to get fresh data (in case new keys were added)
            await api.loadLocales();

            // Get all translation keys from all locales
            const allMessageKeys = new Set();
            for (const [localeCode, locale] of api.locales.entries()) {
                for (const key of Object.keys(locale.keys)) {
                    allMessageKeys.add(key);
                }
            }

            console.log(`[ORPHAN SCAN] Found ${allMessageKeys.size} keys in message files`);

            // Get all TSX/TS files (including .ts for analytics.ts, columns.ts files)
            const tsxFiles = getTsxFiles();
            const tsFiles = getTsxFiles('**/*.ts');
            const allFiles = [...new Set([...tsxFiles, ...tsFiles])];
            console.log(`[ORPHAN SCAN] Scanning ${allFiles.length} TSX/TS files`);

            // Track found translation keys and their locations
            const foundTranslations = new Map(); // key -> { files: [], namespace: '' }

            for (const file of allFiles) {
                // file is already a full path from getTsxFiles
                const filePath = file;
                try {
                    const rawContent = await fs.readFile(filePath, 'utf8');

                    // Strip comments to avoid false positives from commented-out code
                    const content = stripComments(rawContent);

                    // Find ALL useTranslations AND getTranslations (server-side) calls in this file
                    // Pattern variations:
                    //   const t = useTranslations("namespace")
                    //   const t = await getTranslations("namespace")
                    //   let t = useTranslations("namespace")
                    const useTranslationsMatches = [...content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];
                    const getTranslationsMatches = [...content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];
                    const namespaceMatches = [...useTranslationsMatches, ...getTranslationsMatches];

                    // Build a map of varName -> [namespaces] (a variable can map to multiple namespaces
                    // when different functions in the same file declare the same variable name)
                    const varNameToNamespaces = new Map(); // variableName -> Set<namespace>

                    for (const match of namespaceMatches) {
                        const varName = match[1];
                        const namespace = match[2];
                        if (!varNameToNamespaces.has(varName)) {
                            varNameToNamespaces.set(varName, new Set());
                        }
                        varNameToNamespaces.get(varName).add(namespace);
                    }

                    // Also check for useTranslations() without namespace (uses root)
                    const rootTranslationsMatch = content.match(/(?:const|let)\s+(\w+)\s*=\s*useTranslations\s*\(\s*\)/);
                    if (rootTranslationsMatch) {
                        const varName = rootTranslationsMatch[1];
                        if (!varNameToNamespaces.has(varName)) {
                            varNameToNamespaces.set(varName, new Set());
                        }
                        varNameToNamespaces.get(varName).add('common');
                    }

                    if (varNameToNamespaces.size === 0) continue; // Skip files without translations

                    // Store relative path for display
                    const relativePath = path.relative(frontendPath, file).replace(/\\/g, '/');

                    // Find all translator function calls: t(), tCommon(), tExt(), etc.
                    // Match pattern: variableName("key") or variableName('key') or variableName(`key`)
                    // Use negative lookbehind to exclude method calls like .closest()
                    for (const [varName, namespaces] of varNameToNamespaces) {
                        // Escape special regex chars in variable name and build pattern
                        const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Handle double quotes, single quotes, and backticks
                        const callRegex = new RegExp(`(?<![.\\w])${escapedVarName}\\s*\\(\\s*["'\`]([^"'\`]+)["'\`]`, 'g');

                        let match;
                        while ((match = callRegex.exec(content)) !== null) {
                            let key = match[1];

                            // Skip if key contains template literal expressions like ${
                            if (key.includes('${')) continue;

                            // Check if key contains a dot - it might be a full key path with namespace
                            // like t('ext_copy-trading.enable_markets_description')
                            let fullKey;
                            let extractedNamespace;
                            let extractedKey;

                            if (key.includes('.')) {
                                // Key contains dots - could be full path or nested key
                                // Check if it matches a known namespace pattern
                                const dotIndex = key.indexOf('.');
                                const possibleNamespace = key.substring(0, dotIndex);
                                const possibleKey = key.substring(dotIndex + 1);

                                // Check if this looks like a full namespace.key pattern
                                if (possibleNamespace && possibleKey && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(possibleNamespace)) {
                                    // This is a full key path like "ext_copy-trading.days_active"
                                    fullKey = key;
                                    extractedNamespace = possibleNamespace;
                                    extractedKey = possibleKey;
                                } else {
                                    // Skip nested keys or invalid formats
                                    continue;
                                }
                            } else {
                                // No dots - this is a regular key, validate format
                                // Valid keys should be snake_case identifiers
                                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
                                extractedKey = key;
                            }

                            // When the same variable name is used in multiple functions with different namespaces,
                            // we need to check if the key exists in ANY of those namespaces.
                            // This handles cases like:
                            //   function A() { const t = useTranslations("common"); return t("filters"); }
                            //   function B() { const t = useTranslations("ext"); return t("date_range"); }
                            // Where we can't determine function scope easily with regex.

                            let keyExistsInAnyNamespace = false;

                            // If we have a full key path, check it directly
                            if (fullKey && extractedNamespace) {
                                if (allMessageKeys.has(fullKey)) {
                                    keyExistsInAnyNamespace = true;
                                }
                            } else {
                                // Check against all possible namespaces for this variable
                                for (const namespace of namespaces) {
                                    const testKey = `${namespace}.${extractedKey}`;
                                    if (allMessageKeys.has(testKey)) {
                                        keyExistsInAnyNamespace = true;
                                        break;
                                    }
                                }
                            }

                            // Only report as orphaned if the key doesn't exist in ANY of the possible namespaces
                            if (!keyExistsInAnyNamespace) {
                                // Use the first namespace for reporting (we can't know which one was intended)
                                const namespace = namespaces.values().next().value;
                                const fullKey = `${namespace}.${key}`;

                                if (!foundTranslations.has(fullKey)) {
                                    foundTranslations.set(fullKey, {
                                        files: [],
                                        namespace: namespace,
                                        key: key,
                                        fullKey: fullKey,
                                        translatorVar: varName,
                                        possibleNamespaces: Array.from(namespaces) // Include all possible namespaces for debugging
                                    });
                                }
                                foundTranslations.get(fullKey).files.push(relativePath);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }

            // Convert map to array and add suggested values
            // Use proper key-to-value conversion
            for (const [fullKey, data] of foundTranslations) {
                orphanedKeys.push({
                    ...data,
                    suggestedValue: keyToReadableValue(data.key),
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
                errors: [],
                warnings: []
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
                    // Use keyToReadableValue for consistent value generation
                    const keyPart = fullKey.split('.').pop();

                    // Priority: customValue (user edited) > suggestedValue > value > generated from key
                    let value = item.customValue || item.suggestedValue || item.value || keyToReadableValue(keyPart);

                    // Check if value contains periods (sentences should be split)
                    // Pattern: period/exclamation/question mark followed by space
                    const hasSentenceEndings = /[.!?]\s+/.test(value);

                    if (hasSentenceEndings) {
                        // Value contains multiple sentences - should be split
                        // Remove all periods from the value as they should be in code
                        const originalValue = value;
                        value = value
                            .replace(/\.\s*/g, ' ')  // Remove periods with optional trailing space
                            .replace(/\s+/g, ' ')    // Collapse multiple spaces
                            .trim();

                        // Only warn if this wasn't a custom value (user might have intentionally added periods)
                        if (!item.customValue) {
                            // Add warning that this value should be manually split
                            results.warnings.push({
                                key: fullKey,
                                message: 'Value contains sentence-ending punctuation. Consider splitting into multiple translation keys and adding periods as plain text in code.',
                                originalValue: originalValue,
                                cleanedValue: value
                            });
                        }
                    }

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
                        
                        // Check if file uses this namespace (client or server component)
                        const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(['"\`]${namespace}['"\`]\\)`);
                        const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(['"\`]${namespace}['"\`]\\)`);
                        const usesNamespace = clientNamespacePattern.test(content) || serverNamespacePattern.test(content);
                        
                        if (usesNamespace) {
                            // File uses namespace, so we look for t('key')
                            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                            // Get the suggested value (convert key to readable text using keyToReadableValue)
                            const suggestedValue = keyInfo.suggestedValue || keyToReadableValue(key);

                            // Pattern 1: {t('key')} in JSX - replace with plain text or quoted string
                            const jsxPattern = new RegExp(`{\\s*t\\(['"\`]${escapedKey}['"\`]\\)\\s*}`, 'g');
                            if (jsxPattern.test(content)) {
                                content = content.replace(jsxPattern, suggestedValue);
                                modified = true;
                                if (!results.cleaned[file]) {
                                    results.cleaned[file] = [];
                                }
                                results.cleaned[file].push(key);
                            }

                            // Pattern 2: t('key') in attributes like title={t('key')} - replace with string
                            const attrPattern = new RegExp(`={\\s*t\\(['"\`]${escapedKey}['"\`]\\)\\s*}`, 'g');
                            if (attrPattern.test(content)) {
                                content = content.replace(attrPattern, `="${suggestedValue}"`);
                                modified = true;
                                if (!results.cleaned[file]) {
                                    results.cleaned[file] = [];
                                }
                                if (!results.cleaned[file].includes(key)) {
                                    results.cleaned[file].push(key);
                                }
                            }

                            // Pattern 3: standalone t('key') - replace with string literal
                            const standalonePattern = new RegExp(`\\bt\\(['"\`]${escapedKey}['"\`]\\)`, 'g');
                            if (standalonePattern.test(content)) {
                                content = content.replace(standalonePattern, `"${suggestedValue}"`);
                                modified = true;
                                if (!results.cleaned[file]) {
                                    results.cleaned[file] = [];
                                }
                                if (!results.cleaned[file].includes(key)) {
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

    // Scan for useTranslations()/getTranslations() calls without namespace parameter
    router.get('/scan-missing-namespaces', async (req, res) => {
        try {
            const frontendPath = path.join(__dirname, '../../../../frontend');
            const allFiles = getTsxFiles();

            const issues = [];

            for (const file of allFiles) {
                try {
                    const content = await fs.readFile(file, 'utf8');

                    // Find useTranslations() without namespace (client components)
                    const clientEmptyPattern = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*\)/g;
                    // Find getTranslations() without namespace (server components)
                    const serverEmptyPattern = /const\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*\)/g;

                    const patterns = [
                        { pattern: clientEmptyPattern, type: 'client' },
                        { pattern: serverEmptyPattern, type: 'server' }
                    ];

                    for (const { pattern, type } of patterns) {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            const varName = match[1];
                            const relativePath = path.relative(frontendPath, file).replace(/\\/g, '/');

                            // Determine the correct namespace based on file path
                            const suggestedNamespace = getNamespaceFromPath(relativePath);

                            // Find what keys this variable is using
                            const usedKeys = [];
                            const callPattern = new RegExp(`(?<![.\\w])${varName}\\(["']([^"']+)["']\\)`, 'g');
                            let keyMatch;
                            while ((keyMatch = callPattern.exec(content)) !== null) {
                                if (!usedKeys.includes(keyMatch[1])) {
                                    usedKeys.push(keyMatch[1]);
                                }
                            }

                            issues.push({
                                file: relativePath,
                                fullPath: file,
                                varName,
                                suggestedNamespace,
                                componentType: type,
                                usedKeys: usedKeys.slice(0, 10), // Limit to first 10 keys
                                totalKeys: usedKeys.length,
                                lineNumber: content.substring(0, match.index).split('\n').length
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }

            res.json({
                total: issues.length,
                issues,
                message: issues.length > 0
                    ? `Found ${issues.length} translation calls without namespace`
                    : 'No missing namespace issues found'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Fix useTranslations()/getTranslations() calls by adding the correct namespace
    router.post('/fix-missing-namespaces', async (req, res) => {
        try {
            const { files } = req.body; // Optional: specific files to fix
            const frontendPath = path.join(__dirname, '../../../../frontend');
            const allFiles = files ? files.map(f => path.join(frontendPath, f)) : getTsxFiles();

            const results = {
                fixed: [],
                errors: []
            };

            for (const file of allFiles) {
                try {
                    let content = await fs.readFile(file, 'utf8');
                    const originalContent = content;

                    // Detect if this is a server component (no "use client" directive)
                    const trimmed = content.trim();
                    const isServer = !trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'");

                    // Find all translation calls without namespace (both client and server patterns)
                    const clientEmptyPattern = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*\)/g;
                    const serverEmptyPattern = /const\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*\)/g;

                    const clientMatches = [...content.matchAll(clientEmptyPattern)];
                    const serverMatches = [...content.matchAll(serverEmptyPattern)];

                    // Combine and sort matches by position (descending for reverse processing)
                    const allMatches = [
                        ...clientMatches.map(m => ({ ...m, type: 'client' })),
                        ...serverMatches.map(m => ({ ...m, type: 'server' }))
                    ].sort((a, b) => b.index - a.index);

                    if (allMatches.length === 0) continue;

                    const relativePath = path.relative(frontendPath, file).replace(/\\/g, '/');
                    const suggestedNamespace = getNamespaceFromPath(relativePath);

                    // Replace all empty translation calls with the correct namespace
                    // Process in reverse order to maintain correct positions
                    for (const match of allMatches) {
                        const varName = match[1];
                        const startIndex = match.index;
                        const endIndex = startIndex + match[0].length;

                        // Use the appropriate syntax based on actual match type and file type
                        let replacement;
                        if (match.type === 'server' || isServer) {
                            replacement = `const ${varName} = await getTranslations("${suggestedNamespace}")`;
                        } else {
                            replacement = `const ${varName} = useTranslations("${suggestedNamespace}")`;
                        }
                        content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
                    }

                    if (content !== originalContent) {
                        await fs.writeFile(file, content, 'utf8');
                        results.fixed.push({
                            file: relativePath,
                            namespace: suggestedNamespace,
                            count: allMatches.length,
                            componentType: isServer ? 'server' : 'client'
                        });
                    }
                } catch (error) {
                    results.errors.push({
                        file: path.relative(frontendPath, file).replace(/\\/g, '/'),
                        error: error.message
                    });
                }
            }

            const totalFixed = results.fixed.reduce((sum, f) => sum + f.count, 0);

            res.json({
                success: true,
                message: `Fixed ${totalFixed} translation calls in ${results.fixed.length} files`,
                results
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * Process a single batch with Claude agent for AI suggestions
     * Returns a promise that resolves with the suggestions
     */
    function processSuggestBatchWithAgent(batch, batchIndex) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            const prompt = `TASK: Generate English UI translation values for the following translation keys.

You are generating translation VALUES (not translating between languages). Each key is used in a React/Next.js application.
Based on the key name and code context, suggest the most appropriate English text value.

RULES:
1. Generate natural, human-readable English text
2. Use Title Case for headings/buttons (e.g., "New Balance", "Last Login")
3. Use sentence case for descriptions/messages
4. Keep values concise - they're for UI labels
5. If key has a number suffix like "_1", it likely means WITH a variable placeholder, e.g., "profit_share_1" → "Profit Share: {value}%"
6. Look at the context code to understand what the text should say
7. Common patterns:
   - "_1" suffix = includes a variable like {value} or {name}
   - "ellipsis" = ends with "..."
   - Underscores = spaces in the output

KEYS TO GENERATE VALUES FOR:
${batch.map((k, i) => `
[${i}] Key: "${k.namespace}.${k.key}"
${k.context ? `Context: ${k.context.substring(0, 300)}` : ''}
`).join('\n')}

OUTPUT: Return ONLY a JSON array with EXACTLY ${batch.length} suggested English values in the same order.
Example format: ["New Balance", "Last Login: {date}", "Side"]

JSON array:`;

            const claudeProcess = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                windowsHide: true,
                env: {
                    ...process.env,
                    CLAUDE_CODE_MAX_OUTPUT_TOKENS: '16000'
                }
            });

            let output = '';
            let error = '';

            const timeoutId = setTimeout(() => {
                claudeProcess.kill();
                reject(new Error(`Agent ${batchIndex + 1} timed out`));
            }, 90000); // 90 seconds per agent

            claudeProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            claudeProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            claudeProcess.on('close', (code) => {
                clearTimeout(timeoutId);

                if (code !== 0) {
                    console.error(`Agent ${batchIndex + 1} error:`, error);
                    reject(new Error(`Agent ${batchIndex + 1} failed: ${error}`));
                    return;
                }

                try {
                    let processedOutput = output.trim();

                    // Remove markdown code blocks if present
                    processedOutput = processedOutput.replace(/^```json\s*/i, '');
                    processedOutput = processedOutput.replace(/^```\s*/i, '');
                    processedOutput = processedOutput.replace(/\s*```\s*$/i, '');
                    processedOutput = processedOutput.replace(/```json\s*\n/gi, '');
                    processedOutput = processedOutput.replace(/\n\s*```/gi, '');

                    // Find the JSON array
                    if (processedOutput.includes('[') && !processedOutput.trim().startsWith('[')) {
                        processedOutput = processedOutput.substring(processedOutput.indexOf('['));
                    }
                    if (processedOutput.includes(']')) {
                        processedOutput = processedOutput.substring(0, processedOutput.lastIndexOf(']') + 1);
                    }

                    const suggestions = JSON.parse(processedOutput);

                    if (!Array.isArray(suggestions)) {
                        throw new Error('Response is not an array');
                    }

                    // Map suggestions back to keys
                    const result = batch.map((k, i) => ({
                        namespace: k.namespace,
                        key: k.key,
                        fullKey: `${k.namespace}.${k.key}`,
                        suggestedValue: suggestions[i] || keyToReadableValue(k.key),
                        files: k.files
                    }));

                    resolve({
                        batchIndex,
                        suggestions: result,
                        keysProcessed: batch.length
                    });

                } catch (parseError) {
                    console.error(`Agent ${batchIndex + 1} parse error:`, parseError);
                    console.error('Raw output:', output.substring(0, 500));
                    // Return fallback values instead of failing
                    const fallbackResult = batch.map(k => ({
                        namespace: k.namespace,
                        key: k.key,
                        fullKey: `${k.namespace}.${k.key}`,
                        suggestedValue: keyToReadableValue(k.key),
                        files: k.files
                    }));
                    resolve({
                        batchIndex,
                        suggestions: fallbackResult,
                        keysProcessed: batch.length,
                        error: parseError.message
                    });
                }
            });

            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    // AI-powered suggestion for orphaned keys using Claude - PARALLEL AGENTS
    router.post('/ai-suggest', async (req, res) => {
        try {
            const { keys, maxAgents = 5, batchSize = 10 } = req.body;

            if (!keys || !Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ error: 'Keys array is required' });
            }

            // Split keys into batches
            const batches = [];
            for (let i = 0; i < keys.length; i += batchSize) {
                batches.push(keys.slice(i, i + batchSize));
            }

            console.log(`[AI-SUGGEST] Processing ${keys.length} keys in ${batches.length} batches with up to ${maxAgents} parallel agents`);

            // Process batches in parallel waves
            const allSuggestions = [];
            let totalProcessed = 0;
            let totalErrors = 0;

            // Process in waves of maxAgents
            for (let wave = 0; wave < batches.length; wave += maxAgents) {
                const waveBatches = batches.slice(wave, wave + maxAgents);
                const wavePromises = waveBatches.map((batch, idx) =>
                    processSuggestBatchWithAgent(batch, wave + idx)
                );

                console.log(`[AI-SUGGEST] Starting wave ${Math.floor(wave / maxAgents) + 1}: ${waveBatches.length} agents`);

                // Wait for all agents in this wave to complete
                const waveResults = await Promise.allSettled(wavePromises);

                for (const result of waveResults) {
                    if (result.status === 'fulfilled') {
                        const { suggestions, keysProcessed, error } = result.value;
                        if (error) {
                            totalErrors++;
                        }
                        allSuggestions.push(...suggestions);
                        totalProcessed += keysProcessed;
                    } else {
                        console.error('Agent failed:', result.reason);
                        totalErrors++;
                    }
                }
            }

            res.json({
                success: true,
                suggestions: allSuggestions,
                stats: {
                    totalKeys: keys.length,
                    processed: totalProcessed,
                    batches: batches.length,
                    errors: totalErrors
                }
            });

        } catch (error) {
            console.error('AI suggest error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Scan for unused keys in message files (reverse orphan scan)
    // Finds keys that exist in message files but are NOT used anywhere in the codebase
    router.get('/scan-unused', async (req, res) => {
        try {
            const frontendPath = path.join(__dirname, '../../../../frontend');

            // Reload locales to get fresh data
            await api.loadLocales();

            // Get all translation keys from English locale (source of truth)
            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }

            // Build a map of namespace -> keys from the message file
            const messageKeys = new Map(); // fullKey -> { namespace, key, value }
            for (const [fullKey, value] of Object.entries(enLocale.keys)) {
                const parts = fullKey.split('.');
                const namespace = parts[0];
                const key = parts.slice(1).join('.');
                messageKeys.set(fullKey, { namespace, key, value, fullKey });
            }

            console.log(`[UNUSED SCAN] Found ${messageKeys.size} keys in message files`);

            // Get all TSX/TS files (including .ts for analytics.ts, columns.ts files)
            const tsxFiles = getTsxFiles();
            const tsFiles = getTsxFiles('**/*.ts');
            const allFiles = [...new Set([...tsxFiles, ...tsFiles])];
            console.log(`[UNUSED SCAN] Scanning ${allFiles.length} TSX/TS files for usage`);

            // Track which keys are used
            const usedKeys = new Set();

            // ========================================================================
            // PHASE 1: Build a GLOBAL map of all variable names -> namespaces
            // by scanning ALL files for useTranslations/getTranslations declarations
            // ========================================================================
            const globalVarToNamespace = new Map(); // varName -> Set<namespace>

            console.log(`[UNUSED SCAN] Phase 1: Building global variable-to-namespace map...`);

            for (const file of allFiles) {
                try {
                    const rawContent = await fs.readFile(file, 'utf8');
                    const content = stripComments(rawContent);

                    // Find ALL useTranslations AND getTranslations declarations
                    // Patterns:
                    //   const t = useTranslations("namespace")
                    //   let t = useTranslations("namespace")
                    //   const t = await getTranslations("namespace")
                    //   const tCommon = useTranslations("common")
                    const useTranslationsMatches = [...content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];
                    const getTranslationsMatches = [...content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];

                    for (const match of [...useTranslationsMatches, ...getTranslationsMatches]) {
                        const varName = match[1];
                        const namespace = match[2];

                        if (!globalVarToNamespace.has(varName)) {
                            globalVarToNamespace.set(varName, new Set());
                        }
                        globalVarToNamespace.get(varName).add(namespace);
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }

            // Log the discovered mappings
            console.log(`[UNUSED SCAN] Discovered ${globalVarToNamespace.size} unique variable names:`);
            for (const [varName, namespaces] of globalVarToNamespace) {
                if (namespaces.size > 1) {
                    console.log(`  - ${varName} -> [${[...namespaces].join(', ')}] (multiple namespaces)`);
                }
            }

            // ========================================================================
            // PHASE 2: Scan each file for translation function calls
            // and map them to namespaces using the global map + per-file declarations
            // ========================================================================
            console.log(`[UNUSED SCAN] Phase 2: Scanning for key usage...`);

            for (const file of allFiles) {
                try {
                    const rawContent = await fs.readFile(file, 'utf8');
                    const content = stripComments(rawContent);

                    // Build per-file map of varName -> namespaces (more specific than global)
                    const fileVarToNamespace = new Map();

                    // Find declarations in THIS file
                    const useTranslationsMatches = [...content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];
                    const getTranslationsMatches = [...content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g)];

                    for (const match of [...useTranslationsMatches, ...getTranslationsMatches]) {
                        const varName = match[1];
                        const namespace = match[2];

                        if (!fileVarToNamespace.has(varName)) {
                            fileVarToNamespace.set(varName, new Set());
                        }
                        fileVarToNamespace.get(varName).add(namespace);
                    }

                    // Find all potential translation function calls in this file
                    // Pattern: word followed by ( then quote then key then quote
                    // e.g., t("key"), tCommon("key"), myTranslate("key")
                    const allCalls = [...content.matchAll(/(?<![.\w])(\w+)\s*\(\s*["'`]([a-zA-Z_][a-zA-Z0-9_]*)["'`]/g)];

                    for (const callMatch of allCalls) {
                        const varName = callMatch[1];
                        const key = callMatch[2];

                        // Skip common non-translation functions
                        const skipFunctions = new Set([
                            'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
                            'require', 'import', 'console', 'setTimeout', 'setInterval', 'clearTimeout',
                            'fetch', 'resolve', 'reject', 'includes', 'indexOf', 'find', 'findIndex',
                            'filter', 'map', 'reduce', 'forEach', 'push', 'pop', 'shift', 'unshift',
                            'get', 'set', 'delete', 'has', 'add', 'clear', 'split', 'join', 'replace',
                            'match', 'test', 'exec', 'slice', 'substring', 'substr', 'charAt', 'charCodeAt',
                            'toLowerCase', 'toUpperCase', 'trim', 'trimStart', 'trimEnd', 'parse', 'stringify',
                            'Number', 'String', 'Boolean', 'Array', 'Object', 'Date', 'RegExp', 'Error',
                            'Math', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'isArray',
                            'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'btoa', 'atob',
                            'toast', 'alert', 'confirm', 'prompt', 'navigate', 'redirect', 'push',
                            'router', 'useRouter', 'usePathname', 'useSearchParams', 'useParams',
                            'cn', 'clsx', 'classNames', 'formatDate', 'formatCurrency', 'format',
                            'createElement', 'createContext', 'forwardRef', 'memo', 'lazy',
                            'emit', 'on', 'off', 'once', 'addEventListener', 'removeEventListener',
                            'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
                            'setAttribute', 'getAttribute', 'removeAttribute', 'classList',
                            'log', 'warn', 'error', 'info', 'debug', 'trace', 'assert',
                            'keys', 'values', 'entries', 'assign', 'freeze', 'seal',
                            'from', 'of', 'isArray', 'concat', 'every', 'some', 'sort', 'reverse',
                            'startsWith', 'endsWith', 'padStart', 'padEnd', 'repeat', 'normalize'
                        ]);

                        if (skipFunctions.has(varName)) continue;

                        // Skip if key contains template expressions
                        if (key.includes('${')) continue;

                        // Determine which namespace(s) this call belongs to
                        let namespaces = new Set();

                        // Priority 1: Check per-file declarations (most specific)
                        if (fileVarToNamespace.has(varName)) {
                            namespaces = fileVarToNamespace.get(varName);
                        }
                        // Priority 2: Check global variable map (covers all declarations across codebase)
                        else if (globalVarToNamespace.has(varName)) {
                            namespaces = globalVarToNamespace.get(varName);
                        }

                        // Mark key as used for all possible namespaces
                        for (const namespace of namespaces) {
                            usedKeys.add(`${namespace}.${key}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error.message);
                }
            }

            console.log(`[UNUSED SCAN] Found ${usedKeys.size} keys used in code`);

            // Find unused keys (in message files but not used in code)
            const unusedKeys = [];

            // Namespaces to skip (these are special or dynamically used)
            const skipNamespaces = ['menu']; // menu keys are often used dynamically

            // Patterns for keys to skip (menu nav translations are used dynamically)
            const skipKeyPatterns = [
                /^nav\./,           // ext_*.nav.* keys (navbar menu translations)
                /\.nav\./,          // Any nested nav keys
            ];

            // Namespace patterns to skip entirely (extension namespaces with nav menus)
            const skipNamespacePatterns = [
                /^ext_/,            // All extension namespaces (ext_forex, ext_admin_forex, etc.)
            ];

            for (const [fullKey, data] of messageKeys) {
                // Skip special namespaces
                if (skipNamespaces.includes(data.namespace)) continue;

                // Skip extension namespaces (they contain nav menu translations)
                if (skipNamespacePatterns.some(pattern => pattern.test(data.namespace))) continue;

                // Skip nav keys within any namespace
                if (skipKeyPatterns.some(pattern => pattern.test(data.key))) continue;

                // Skip if key is used
                if (usedKeys.has(fullKey)) continue;

                // This key is unused!
                unusedKeys.push({
                    ...data,
                    id: `unused_${unusedKeys.length}`
                });
            }

            // Sort by namespace and then by key
            unusedKeys.sort((a, b) => {
                if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
                return a.key.localeCompare(b.key);
            });

            // Group by namespace for stats
            const byNamespace = {};
            for (const item of unusedKeys) {
                if (!byNamespace[item.namespace]) {
                    byNamespace[item.namespace] = 0;
                }
                byNamespace[item.namespace]++;
            }

            console.log(`[UNUSED SCAN] Found ${unusedKeys.length} unused keys`);

            res.json({
                success: true,
                total: unusedKeys.length,
                unused: unusedKeys,
                stats: {
                    totalMessageKeys: messageKeys.size,
                    totalUsedKeys: usedKeys.size,
                    totalUnusedKeys: unusedKeys.length,
                    byNamespace
                }
            });
        } catch (error) {
            console.error('Unused scan error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Remove unused keys from all message files
    router.post('/remove-unused', async (req, res) => {
        try {
            const { keys } = req.body;

            if (!keys || !Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ error: 'Keys array is required' });
            }

            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            const results = {
                removed: 0,
                filesModified: 0,
                errors: []
            };

            // Process each locale file
            for (const file of jsonFiles) {
                const filePath = path.join(messagesDir, file);
                try {
                    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    let modified = false;

                    for (const keyInfo of keys) {
                        const fullKey = keyInfo.fullKey || keyInfo;
                        const parts = fullKey.split('.');
                        const namespace = parts[0];
                        const key = parts.slice(1).join('.');

                        if (content[namespace] && content[namespace][key] !== undefined) {
                            delete content[namespace][key];
                            modified = true;
                            results.removed++;
                        }
                    }

                    if (modified) {
                        await fs.writeFile(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
                        results.filesModified++;
                    }
                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }

            // Clear namespace cache after modifying files
            const { clearNamespaceCache } = require('../services/namespace-utils');
            clearNamespaceCache();

            // Reload locales
            await api.loadLocales();

            res.json({
                success: true,
                message: `Removed ${results.removed} key instances from ${results.filesModified} files`,
                results
            });
        } catch (error) {
            console.error('Remove unused error:', error);
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