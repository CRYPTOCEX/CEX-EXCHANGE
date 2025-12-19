const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Import shared utilities for consistent key generation across all routes
const {
    generateTranslationKey,
    parseTextIntoParts,
    stripTrailingNumber,
    correctBadKey,
    keyToReadableValue,
    shouldSkipForExtraction,
    isValidTranslationKey,
    stripComments
} = require('../services/namespace-utils');

function createToolsRoutes() {
    /**
     * Check if a file is a server component (no "use client" directive)
     * Server components use getTranslations from next-intl/server
     * Client components use useTranslations from next-intl
     */
    function isServerComponent(content) {
        // Check for "use client" directive - it must be at the very beginning of the file
        // (after optional whitespace/comments)
        const trimmed = content.trim();

        // Direct check for "use client" at start
        if (trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'")) {
            return false;
        }

        // Also check with regex for more flexibility (handles semicolons, etc.)
        if (/^["']use client["'];?/.test(trimmed)) {
            return false;
        }

        // It's a server component if no "use client" found
        return true;
    }

    /**
     * Generate the appropriate translation declaration based on component type
     * @param {string} varName - Variable name (e.g., 't', 'tCommon')
     * @param {string} namespace - Namespace (e.g., 'common', 'ext_admin')
     * @param {boolean} isServer - Whether this is a server component
     * @returns {string} Declaration line
     */
    function getTranslationDeclaration(varName, namespace, isServer) {
        if (isServer) {
            return `const ${varName} = await getTranslations("${namespace}");`;
        }
        return `const ${varName} = useTranslations("${namespace}");`;
    }

    /**
     * Get the import statement needed for translations
     * @param {boolean} isServer - Whether this is a server component
     * @returns {string} Import statement
     */
    function getTranslationImport(isServer) {
        if (isServer) {
            return 'import { getTranslations } from "next-intl/server";';
        }
        return 'import { useTranslations } from "next-intl";';
    }

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
                    const rawContent = await fs.readFile(filePath, 'utf8');

                    // Quick check - skip files without useTranslations
                    // Check for either useTranslations (client) or getTranslations (server)
                    if (!rawContent.includes('useTranslations') && !rawContent.includes('getTranslations')) {
                        return [];
                    }

                    // Strip comments to avoid false positives from commented-out code
                    const content = stripComments(rawContent);

                    const results = [];

                    // Find ALL namespace declarations in the file (both client and server components)
                    // Client: const t = useTranslations("namespace")
                    // Server: const t = await getTranslations("namespace")
                    const useTranslationsPattern = /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\s*\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]*)['"]\s*\)/g;
                    const getTranslationsPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*['"]([a-zA-Z_][a-zA-Z0-9_.]*)['"]\s*\)/g;
                    const namespaceMap = new Map();

                    let nsMatch;
                    while ((nsMatch = useTranslationsPattern.exec(content)) !== null) {
                        namespaceMap.set(nsMatch[1], nsMatch[2]);
                    }
                    while ((nsMatch = getTranslationsPattern.exec(content)) !== null) {
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
                        // Use keyToReadableValue for proper conversion (handles ellipsis, etc.)
                        // keyPart is already defined above as key.split('.').pop()
                        suggestedValue: keyToReadableValue(keyPart)
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
                /^ext_/,                      // Extension translations with underscore (ext_forex, ext_admin_forex)
                /^admin\./,                   // Admin translations
                /^blog\./,                    // Blog translations
                /\.nav\./,                    // Navigation menu items (nested nav objects)
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
    
    // ============================================================
    // Scan menu translations (preview) - Step 1
    // Scans both admin menu and navbar menu files
    // Uses the same parsing logic as the extraction script
    // ============================================================
    router.get('/scan-menu', async (req, res) => {
        try {
            const glob = require('glob');
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const menuPath = path.join(frontendDir, 'config/menu.ts');
            const navbarMenuDir = path.join(frontendDir, 'app/[locale]/(ext)');
            const messagesDir = path.join(frontendDir, 'messages');

            // Load existing translations
            const enPath = path.join(messagesDir, 'en.json');
            let existingTranslations = {};
            try {
                const enContent = await fs.readFile(enPath, 'utf8');
                existingTranslations = JSON.parse(enContent);
            } catch (e) {
                // File doesn't exist yet
            }

            // Helper to get nested property
            const getNestedProperty = (obj, path) => {
                const keys = path.split('.');
                let current = obj;
                for (const key of keys) {
                    if (current && typeof current === 'object' && key in current) {
                        current = current[key];
                    } else {
                        return undefined;
                    }
                }
                return current;
            };

            // Helper to parse menu items from content
            // Handles both simple objects and nested structures with multiline descriptions
            const parseMenuItems = (content, isAdminMenu = false) => {
                const items = [];

                // First, find all key: "value" patterns
                const keyPattern = /key:\s*["']([^"']+)["']/g;
                let keyMatch;

                while ((keyMatch = keyPattern.exec(content)) !== null) {
                    const key = keyMatch[1];
                    const startPos = keyMatch.index;

                    // Find the object boundaries - look backwards for { and forwards for matching }
                    let braceCount = 0;
                    let objStart = startPos;
                    let objEnd = startPos;

                    // Find start of object (go backwards)
                    for (let i = startPos; i >= 0; i--) {
                        if (content[i] === '{') {
                            braceCount++;
                            if (braceCount === 1) {
                                objStart = i;
                                break;
                            }
                        } else if (content[i] === '}') {
                            braceCount--;
                        }
                    }

                    // Find end of object (go forwards)
                    braceCount = 1;
                    for (let i = objStart + 1; i < content.length; i++) {
                        if (content[i] === '{') braceCount++;
                        else if (content[i] === '}') braceCount--;
                        if (braceCount === 0) {
                            objEnd = i;
                            break;
                        }
                    }

                    const objContent = content.substring(objStart, objEnd + 1);

                    // Extract title
                    const titleMatch = objContent.match(/title:\s*["']([^"']+)["']/);
                    const title = titleMatch ? titleMatch[1] : null;

                    // Extract description (can be multiline)
                    let description = null;
                    const descMatch = objContent.match(/description:\s*\n?\s*["']([^"']+)["']/s);
                    if (descMatch) {
                        description = descMatch[1].replace(/\s+/g, ' ').trim();
                    }

                    const line = content.substring(0, startPos).split('\n').length;

                    if (title) {
                        items.push({
                            key: key.replace(/-/g, '.'),
                            title,
                            description,
                            line
                        });
                    }
                }

                return items;
            };

            const allTranslations = [];
            const fileStats = [];

            // ============================================================
            // Part 1: Scan main admin menu (frontend/config/menu.ts)
            // Uses nested structure: menu.admin.{key}.title/description
            // Key format: admin-dashboard -> admin.dashboard (hyphen to dot for nesting)
            // ============================================================
            const menuContent = await fs.readFile(menuPath, 'utf8');
            const adminMenuItems = parseMenuItems(menuContent, true);
            const adminMenuTranslations = [];

            // Helper to check nested property existence
            const checkNestedExists = (obj, keyPath) => {
                const parts = keyPath.split('.');
                let current = obj;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part];
                    } else {
                        return false;
                    }
                }
                return current !== undefined;
            };

            for (const item of adminMenuItems) {
                // item.key is already converted from hyphen to dot by parseMenuItems
                // e.g., "admin-dashboard" -> "admin.dashboard"
                const nestedKey = item.key;

                // Title - nested path: admin.dashboard.title
                const titlePath = `${nestedKey}.title`;
                const titleExists = checkNestedExists(existingTranslations.menu, titlePath);

                adminMenuTranslations.push({
                    type: 'title',
                    value: item.title,
                    key: titlePath,
                    exists: titleExists,
                    line: item.line,
                    file: 'frontend/config/menu.ts',
                    namespace: 'menu'
                });

                // Description - nested path: admin.dashboard.description
                if (item.description) {
                    const descPath = `${nestedKey}.description`;
                    const descExists = checkNestedExists(existingTranslations.menu, descPath);

                    adminMenuTranslations.push({
                        type: 'description',
                        value: item.description,
                        key: descPath,
                        exists: descExists,
                        line: item.line,
                        file: 'frontend/config/menu.ts',
                        namespace: 'menu'
                    });
                }
            }

            allTranslations.push(...adminMenuTranslations);
            fileStats.push({
                file: 'frontend/config/menu.ts',
                namespace: 'menu',
                totalKeys: adminMenuTranslations.length,
                newKeys: adminMenuTranslations.filter(t => !t.exists).length
            });

            // ============================================================
            // Part 2: Scan navbar menu files
            // Uses nested nav structure: namespace.nav.key.title/description
            // ============================================================
            const navbarMenuFiles = glob.sync('**/menu.ts', {
                cwd: navbarMenuDir,
                ignore: ['node_modules/**']
            });

            for (const file of navbarMenuFiles) {
                const filePath = path.join(navbarMenuDir, file);
                const relativePath = file.replace(/[\\\/]menu\.ts$/, '').split(/[\\\/]/);
                const namespace = 'ext_' + relativePath.join('_');

                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const navbarItems = parseMenuItems(content, false);
                    const navbarTranslations = [];

                    for (const item of navbarItems) {
                        // Use nested path format: nav.key.title (matches existing structure)
                        // The key from menu.ts might have hyphens, keep them as-is
                        const menuKey = item.key;

                        // Title - nested path: nav.home.title
                        const titlePath = `nav.${menuKey}.title`;
                        const titleExists = checkNestedExists(existingTranslations[namespace], titlePath);

                        navbarTranslations.push({
                            type: 'title',
                            value: item.title,
                            key: titlePath,
                            exists: titleExists,
                            line: item.line,
                            file: `frontend/app/[locale]/(ext)/${file}`,
                            namespace
                        });

                        // Description - nested path: nav.home.description
                        if (item.description) {
                            const descPath = `nav.${menuKey}.description`;
                            const descExists = checkNestedExists(existingTranslations[namespace], descPath);

                            navbarTranslations.push({
                                type: 'description',
                                value: item.description,
                                key: descPath,
                                exists: descExists,
                                line: item.line,
                                file: `frontend/app/[locale]/(ext)/${file}`,
                                namespace
                            });
                        }
                    }

                    if (navbarTranslations.length > 0) {
                        allTranslations.push(...navbarTranslations);
                        fileStats.push({
                            file: `frontend/app/[locale]/(ext)/${file}`,
                            namespace,
                            totalKeys: navbarTranslations.length,
                            newKeys: navbarTranslations.filter(t => !t.exists).length
                        });
                    }
                } catch (error) {
                    console.warn(`Error scanning ${file}:`, error.message);
                }
            }

            const newKeys = allTranslations.filter(t => !t.exists).length;
            const existingKeys = allTranslations.filter(t => t.exists).length;

            res.json({
                success: true,
                stats: {
                    totalTranslations: allTranslations.length,
                    newKeys,
                    existingKeys,
                    filesScanned: fileStats.length,
                    navbarNamespaces: navbarMenuFiles.length
                },
                translations: allTranslations,
                files: fileStats
            });

        } catch (error) {
            console.error('Error scanning menu translations:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Apply menu translations - Step 2
    // Extracts translations from:
    // - Main admin menu (frontend/config/menu.ts)
    // - Navbar menus (frontend/app/[locale]/(ext)/**/menu.ts)
    // ============================================================
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
                    // Parse the output to get statistics (from Final Summary section)
                    const keysMatch = output.match(/Translation keys: (\d+)/g);
                    const filesMatch = output.match(/Files updated: (\d+)/g);
                    const addedMatch = output.match(/Total keys added: (\d+)/g);
                    const navbarMatch = output.match(/Navbar namespaces: (\d+)/);

                    // Get the last (final) values from the matches
                    const lastKeysMatch = keysMatch ? keysMatch[keysMatch.length - 1].match(/(\d+)/) : null;
                    const lastFilesMatch = filesMatch ? filesMatch[filesMatch.length - 1].match(/(\d+)/) : null;
                    const lastAddedMatch = addedMatch ? addedMatch[addedMatch.length - 1].match(/(\d+)/) : null;

                    res.json({
                        success: true,
                        message: 'Menu translations extracted successfully (admin menu + navbar menus)',
                        stats: {
                            keysExtracted: lastKeysMatch ? parseInt(lastKeysMatch[1]) : 0,
                            filesUpdated: lastFilesMatch ? parseInt(lastFilesMatch[1]) : 0,
                            totalAdded: lastAddedMatch ? parseInt(lastAddedMatch[1]) : 0,
                            navbarNamespaces: navbarMatch ? parseInt(navbarMatch[1]) : 0
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

    // Get all extractable files (TSX files in app and components)
    router.get('/extraction-files', async (req, res) => {
        try {
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const files = [];

            // Helper to recursively get all TSX files
            async function getTsxFiles(dir, relativePath = '') {
                try {
                    const items = await fs.readdir(dir, { withFileTypes: true });
                    for (const item of items) {
                        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                            await getTsxFiles(path.join(dir, item.name), relativePath ? `${relativePath}/${item.name}` : item.name);
                        } else if (item.isFile() && item.name.endsWith('.tsx')) {
                            const filePath = relativePath ? `${relativePath}/${item.name}` : item.name;
                            files.push(filePath);
                        }
                    }
                } catch (e) {
                    // Ignore errors
                }
            }

            // Get files from app and components directories
            await getTsxFiles(path.join(frontendDir, 'app'), 'app');
            await getTsxFiles(path.join(frontendDir, 'components'), 'components');

            // Sort files alphabetically
            files.sort();

            res.json({
                success: true,
                files: files,
                count: files.length
            });

        } catch (error) {
            console.error('Error getting extraction files:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Scan translations (preview) - Step 1: Show what will be changed
    // ============================================================
    router.post('/scan-translations', async (req, res) => {
        try {
            const { directory, file, limit, fileType = 'all' } = req.body;
            // fileType can be: 'all', 'columns', 'analytics', 'page'

            if (!directory && !file) {
                return res.status(400).json({ error: 'Directory or file is required' });
            }

            const target = file || directory;
            console.log(`Scanning translations for ${file ? 'file' : 'directory'}: ${target}, fileType: ${fileType}`);

            const frontendDir = path.join(__dirname, '../../../../frontend');
            const glob = require('glob');

            let files = [];

            if (file) {
                // Single file mode
                files = [file];
            } else {
                // Directory mode - use patterns
                // Determine file pattern based on fileType
                let filePatterns;
                switch (fileType) {
                    case 'columns':
                        filePatterns = ['**/columns.tsx'];
                        break;
                    case 'analytics':
                        filePatterns = ['**/analytics.ts'];
                        break;
                    case 'columns-analytics':
                        filePatterns = ['**/columns.tsx', '**/analytics.ts'];
                        break;
                    case 'page':
                        filePatterns = ['**/{page,client,error,not-found,global-error,loading}.tsx'];
                        break;
                    default:
                        filePatterns = ['**/*.tsx'];
                }

                // Find files matching pattern(s)
                const targetDir = path.join(frontendDir, directory);
                for (const pattern of filePatterns) {
                    const matched = glob.sync(pattern, {
                        cwd: targetDir,
                        ignore: ['node_modules/**', '.next/**']
                    });
                    files.push(...matched.map(f => path.join(directory, f)));
                }
                // Remove duplicates and sort
                files = [...new Set(files)].sort();

                // Apply limit
                if (limit && limit < files.length) {
                    files = files.slice(0, parseInt(limit));
                }
            }

            const previewResults = [];
            const messagesDir = path.join(frontendDir, 'messages');

            // Load existing translations to check for duplicates
            const enPath = path.join(messagesDir, 'en.json');
            let existingTranslations = {};
            try {
                const enContent = await fs.readFile(enPath, 'utf8');
                existingTranslations = JSON.parse(enContent);
            } catch (e) {
                // File doesn't exist yet
            }

            // ============================================================
            // Namespace analysis helpers (same logic as extraction)
            // ============================================================

            // Normalize value for comparison
            const normalizeValue = (value) => {
                if (typeof value !== 'string') return '';
                return value.trim().toLowerCase().replace(/[\s\u00A0]+/g, ' ').replace(/['']/g, "'").replace(/[""]/g, '"');
            };

            // Get parent namespaces from a namespace
            const getParentNamespaces = (namespace) => {
                const parents = [];
                const parts = namespace.split('_');
                for (let i = parts.length - 1; i > 0; i--) {
                    parents.push(parts.slice(0, i).join('_'));
                }
                parents.push('common');
                return parents;
            };

            // Find existing key-value pair across all related namespaces
            const findExistingKey = (targetNamespace, value) => {
                const normalizedValue = normalizeValue(value);
                const namespacesToCheck = [targetNamespace, ...getParentNamespaces(targetNamespace)];

                for (const ns of namespacesToCheck) {
                    const nsData = existingTranslations[ns];
                    if (!nsData || typeof nsData !== 'object') continue;

                    for (const [existingKey, existingVal] of Object.entries(nsData)) {
                        if (typeof existingVal === 'string' && normalizeValue(existingVal) === normalizedValue) {
                            return { namespace: ns, key: existingKey, isReused: ns !== targetNamespace };
                        }
                    }
                }
                return null;
            };

            // Check if key exists in namespace
            const keyExists = (namespace, key) => {
                return existingTranslations[namespace] && existingTranslations[namespace][key];
            };

            // Get translator variable name
            const getTranslatorVarName = (ns, primaryNamespace) => {
                if (ns === primaryNamespace) return 't';
                const parts = ns.split('_');
                const camelCase = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                return `t${camelCase}`;
            };

            // Track namespace usage across all files
            const globalNamespaceUsage = new Map(); // namespace -> { keys: Set, files: Set }

            for (const file of files) {
                const filePath = path.join(targetDir, file);
                const relPath = path.relative(frontendDir, filePath).replace(/\\/g, '/');
                const fileNamespace = getNamespaceFromFile(filePath, frontendDir);

                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const fileTranslations = [];
                    const fileNamespacesUsed = new Map(); // namespace -> Set of keys

                    // Helper to analyze a translation value
                    const analyzeTranslation = (value, type, lineNum) => {
                        // Determine context: jsx-text uses 'jsx' context, everything else uses 'attribute'
                        const parseContext = type === 'jsx-text' ? 'jsx' : 'attribute';
                        // Parse text into parts (handles prefixes like "e.g.," and trailing numbers)
                        const { parts, hasMultipleParts } = parseTextIntoParts(value, parseContext);

                        // Process each key part to get final keys and track namespaces
                        const processedParts = parts.map(part => {
                            if (part.type === 'literal') {
                                return part; // Keep literals as-is
                            }

                            // It's a key part - find or create the key
                            const existing = findExistingKey(fileNamespace, part.value);
                            let targetNamespace, finalKey, action, translatorVar;

                            if (existing) {
                                targetNamespace = existing.namespace;
                                finalKey = existing.key;
                                action = existing.isReused ? 'reuse_from_shared' : 'exists';
                                translatorVar = getTranslatorVarName(targetNamespace, fileNamespace);
                            } else {
                                targetNamespace = fileNamespace;
                                finalKey = part.key;
                                action = 'new';
                                translatorVar = 't';

                                // Check if key is taken by different value
                                if (keyExists(fileNamespace, part.key)) {
                                    for (let i = 1; i <= 100; i++) {
                                        const suffixed = `${part.key}_${i}`;
                                        if (!keyExists(fileNamespace, suffixed)) {
                                            finalKey = suffixed;
                                            break;
                                        }
                                    }
                                }
                            }

                            // Track namespace usage
                            if (!fileNamespacesUsed.has(targetNamespace)) {
                                fileNamespacesUsed.set(targetNamespace, new Set());
                            }
                            fileNamespacesUsed.get(targetNamespace).add(finalKey);

                            // Track global namespace usage
                            if (!globalNamespaceUsage.has(targetNamespace)) {
                                globalNamespaceUsage.set(targetNamespace, { keys: new Set(), files: new Set() });
                            }
                            globalNamespaceUsage.get(targetNamespace).keys.add(finalKey);
                            globalNamespaceUsage.get(targetNamespace).files.add(relPath);

                            return {
                                ...part,
                                finalKey,
                                targetNamespace,
                                translatorVar,
                                action
                            };
                        });

                        // Determine overall action (new if any part is new)
                        const hasNewKey = processedParts.some(p => p.type === 'key' && p.action === 'new');
                        const hasExisting = processedParts.some(p => p.type === 'key' && p.action === 'exists');
                        const overallAction = hasNewKey ? 'new' : (hasExisting ? 'exists' : 'reuse_from_shared');

                        // For backward compatibility, get primary key info
                        const primaryKeyPart = processedParts.find(p => p.type === 'key');

                        return {
                            type,
                            value,                           // Original value "e.g., Trade Crypto"
                            parts: processedParts,           // Parsed parts with keys and literals
                            hasMultipleParts,                // Whether text was split into multiple parts
                            key: primaryKeyPart?.finalKey || '',
                            targetNamespace: primaryKeyPart?.targetNamespace || fileNamespace,
                            translatorVar: primaryKeyPart?.translatorVar || 't',
                            action: overallAction,
                            line: lineNum
                        };
                    };

                    // For columns.tsx and analytics.ts files
                    if (file.endsWith('columns.tsx') || file.endsWith('analytics.ts')) {
                        const isAlreadyKey = (val) => /^[a-z][a-z0-9_]*$/.test(val);

                        // Extract title, description, label values
                        const extractPatterns = [
                            { regex: /title:\s*"([^"]+)"/g, type: 'title' },
                            { regex: /title:\s*'([^']+)'/g, type: 'title' },
                            { regex: /description:\s*"([^"]+)"/g, type: 'description' },
                            { regex: /description:\s*'([^']+)'/g, type: 'description' },
                            { regex: /label:\s*"([^"]+)"/g, type: 'label' },
                            { regex: /label:\s*'([^']+)'/g, type: 'label' }
                        ];

                        let match;
                        for (const { regex, type } of extractPatterns) {
                            while ((match = regex.exec(content)) !== null) {
                                const value = match[1];
                                if (!isAlreadyKey(value) && value.length > 1 && !shouldSkipForExtraction(value)) {
                                    const lineNum = content.substring(0, match.index).split('\n').length;
                                    fileTranslations.push(analyzeTranslation(value, type, lineNum));
                                }
                            }
                        }

                        // Extract array values
                        const arrayPatterns = [
                            { regex: /title:\s*\[([^\]]+)\]/g, type: 'title (array)' },
                            { regex: /description:\s*\[([^\]]+)\]/g, type: 'description (array)' }
                        ];

                        for (const { regex: arrayRegex, type: arrayType } of arrayPatterns) {
                            while ((match = arrayRegex.exec(content)) !== null) {
                                const arrayContent = match[1];
                                const lineNum = content.substring(0, match.index).split('\n').length;

                                // Double-quoted strings
                                const doubleQuoteRegex = /"([^"]+)"/g;
                                let strMatch;
                                while ((strMatch = doubleQuoteRegex.exec(arrayContent)) !== null) {
                                    const value = strMatch[1];
                                    if (!isAlreadyKey(value) && value.length > 1 && !shouldSkipForExtraction(value)) {
                                        fileTranslations.push(analyzeTranslation(value, arrayType, lineNum));
                                    }
                                }

                                // Single-quoted strings
                                const singleQuoteRegex = /'([^']+)'/g;
                                while ((strMatch = singleQuoteRegex.exec(arrayContent)) !== null) {
                                    const value = strMatch[1];
                                    if (!isAlreadyKey(value) && value.length > 1 && !shouldSkipForExtraction(value)) {
                                        fileTranslations.push(analyzeTranslation(value, arrayType, lineNum));
                                    }
                                }
                            }
                        }
                    } else {
                        // For page.tsx / client.tsx files

                        // Helper to check if a position is inside a comment (/* ... */ or // ...)
                        const isInsideComment = (content, matchIndex) => {
                            // Look backwards for /* without closing */
                            const beforeMatch = content.substring(0, matchIndex);

                            // Find all /* and */ positions before match
                            let lastBlockCommentStart = beforeMatch.lastIndexOf('/*');
                            let lastBlockCommentEnd = beforeMatch.lastIndexOf('*/');

                            // If there's an unclosed block comment, we're inside it
                            if (lastBlockCommentStart > lastBlockCommentEnd) {
                                return true;
                            }

                            // Check for single-line comment on the same line
                            const lastNewline = beforeMatch.lastIndexOf('\n');
                            const currentLine = beforeMatch.substring(lastNewline + 1);
                            if (currentLine.includes('//')) {
                                return true;
                            }

                            return false;
                        };

                        // Helper to check if a position is inside sr-only (screen reader only) element
                        const isInsideSrOnly = (content, matchIndex) => {
                            // The matchIndex points to the '>' character before the text
                            // We need to find the opening tag that this '>' belongs to
                            // Look backwards to find the complete opening tag

                            const beforeMatch = content.substring(0, matchIndex + 1); // Include the '>'

                            // Find the last complete opening tag that ends at our position
                            // This should be something like <span className="sr-only">
                            // We look for patterns ending with '>' at matchIndex

                            // Strategy: Find the last '<' before our position, then check if
                            // the tag between '<' and our '>' contains sr-only
                            let lastTagStart = beforeMatch.lastIndexOf('<');
                            if (lastTagStart === -1) return false;

                            // Get the opening tag
                            const openingTag = beforeMatch.substring(lastTagStart);

                            // Check if this opening tag contains sr-only or visually-hidden
                            if (/(?:className|class)\s*=\s*["'][^"']*(?:sr-only|visually-hidden)[^"']*["']/i.test(openingTag)) {
                                return true;
                            }

                            return false;
                        };

                        // Extract JSX text content - text between JSX closing > and opening <
                        // Must be careful to avoid matching TypeScript generics like useState<any>
                        const jsxTextRegex = />([^<>{]+)</g;
                        let match;
                        while ((match = jsxTextRegex.exec(content)) !== null) {
                            const value = match[1].trim();
                            if (value.length < 3) continue;

                            // Skip if inside a comment (/* ... */ or // ...)
                            if (isInsideComment(content, match.index)) continue;

                            // Skip if inside sr-only (screen reader only) element
                            // These are accessibility texts that shouldn't be extracted for translation
                            if (isInsideSrOnly(content, match.index)) continue;

                            // Skip if it's purely punctuation/symbols/numbers
                            if (/^[\s\d\p{P}\p{S}]+$/u.test(value)) continue;

                            // Skip single words that look like identifiers
                            if (/^[a-z_]+$/i.test(value)) continue;

                            // Skip if contains JSX expression markers
                            if (value.includes('{')) continue;

                            // Skip values from shouldSkipForExtraction (URLs, emails, etc)
                            if (shouldSkipForExtraction(value)) continue;

                            // ============================================================
                            // Additional filters to avoid extracting TypeScript/JS code
                            // ============================================================

                            // Skip if contains code patterns (semicolons, function calls, operators)
                            if (/[;=()[\]{}]/.test(value)) continue;

                            // Skip if looks like code: starts with keywords or operators
                            if (/^\s*(const|let|var|return|case|default|if|else|switch|for|while|function|=>|\.|\?|:)/.test(value)) continue;

                            // Skip if ends with code patterns (likely from JSX expressions like "> step ?")
                            if (/[?:]\s*$/.test(value)) continue;

                            // Skip if it's just a variable/word followed by question mark (e.g., "step ?")
                            if (/^[a-zA-Z_]+\s*\?$/.test(value)) continue;

                            // Skip if contains TypeScript type annotations
                            if (/\s*:\s*[A-Za-z]+(<|>|\[|\])/.test(value)) continue;

                            // Skip if contains newlines (likely code, not text)
                            if (/[\r\n]/.test(value)) continue;

                            // Skip if it's a variable name pattern (camelCase with no spaces)
                            if (/^[a-z][a-zA-Z0-9]*$/.test(value) && !value.includes(' ')) continue;

                            // Skip if it looks like property access (object.property, obj.prop.nested)
                            // e.g., "m.change24h", "data.value", "user.profile.name"
                            if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/.test(value)) continue;

                            // Skip if looks like TypeScript/code fragments
                            if (/^(null|undefined|true|false|NaN|Infinity)$/.test(value)) continue;
                            // Skip if contains JS logical/comparison operators (anywhere in string)
                            if (/&&|\|\||===|!==|==|!=|>=|<=/.test(value)) continue;
                            // Skip if starts with a digit (likely code artifact like "0 && something")
                            if (/^\d+\s/.test(value)) continue;

                            // Skip strings that are just punctuation with text (likely code artifacts)
                            if (/^[\s\r\n]*[;,.:?!]+[\s\r\n]*$/.test(value)) continue;

                            // Must contain at least one letter and look like natural text
                            if (!/[a-zA-Z]{2,}/.test(value)) continue;

                            // Skip if it looks like a code comment or TODO
                            if (/^\s*(\/\/|\/\*|\*|TODO|FIXME|NOTE|HACK)/.test(value)) continue;

                            const key = generateTranslationKey(value);
                            if (key && key.length > 2) {
                                const lineNum = content.substring(0, match.index).split('\n').length;
                                fileTranslations.push(analyzeTranslation(value, 'jsx-text', lineNum));
                            }
                        }

                        // Translatable attributes - use separate patterns for quotes
                        const attrPatterns = [
                            /(title|placeholder|alt|aria-label|label|description)="([^"]+)"/g,
                            /(title|placeholder|alt|aria-label|label|description)='([^']+)'/g
                        ];
                        for (const attrRegex of attrPatterns) {
                            while ((match = attrRegex.exec(content)) !== null) {
                                const attrName = match[1];
                                const value = match[2];
                                if (value.length < 3) continue;
                                if (/^[a-z_]+$/i.test(value)) continue;
                                if (shouldSkipForExtraction(value)) continue;

                                // Skip code-like patterns in attributes too
                                if (/[;=()[\]{}]/.test(value)) continue;
                                if (/[\r\n]/.test(value)) continue;

                                const key = generateTranslationKey(value);
                                if (key && key.length > 2) {
                                    const lineNum = content.substring(0, match.index).split('\n').length;
                                    fileTranslations.push(analyzeTranslation(value, `attr:${attrName}`, lineNum));
                                }
                            }
                        }
                    }

                    if (fileTranslations.length > 0) {
                        // Calculate stats for this file
                        const newKeys = fileTranslations.filter(t => t.action === 'new').length;
                        const existingKeys = fileTranslations.filter(t => t.action === 'exists').length;
                        const reusedKeys = fileTranslations.filter(t => t.action === 'reuse_from_shared').length;

                        // Check if this is a server component
                        const isServer = isServerComponent(content);

                        // Build namespace declarations that will be needed
                        const namespacesNeeded = Array.from(fileNamespacesUsed.keys()).sort((a, b) => {
                            if (a === fileNamespace) return -1;
                            if (b === fileNamespace) return 1;
                            return a.localeCompare(b);
                        });

                        const declarationLines = namespacesNeeded.map(ns => {
                            const varName = getTranslatorVarName(ns, fileNamespace);
                            return getTranslationDeclaration(varName, ns, isServer);
                        });

                        // Find all exported functions/hooks that will need declarations
                        const functionPatterns = [
                            /export\s+function\s+(use\w+)\s*\(/g,
                            /export\s+const\s+(use\w+)\s*=/g
                        ];
                        const functionsFound = [];
                        for (const pattern of functionPatterns) {
                            let match;
                            while ((match = pattern.exec(content)) !== null) {
                                if (!functionsFound.includes(match[1])) {
                                    functionsFound.push(match[1]);
                                }
                            }
                        }

                        // Build declarations for each function
                        const declarations = functionsFound.length > 0
                            ? functionsFound.map(fn => `// In ${fn}():\n${declarationLines.join('\n')}`)
                            : declarationLines;

                        previewResults.push({
                            file: relPath,
                            namespace: fileNamespace,
                            namespacesUsed: namespacesNeeded,
                            functionsToUpdate: functionsFound,
                            declarations,
                            translations: fileTranslations,
                            stats: {
                                total: fileTranslations.length,
                                newKeys,
                                existingKeys,
                                reusedFromShared: reusedKeys
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Error scanning ${file}:`, e.message);
                }
            }

            // Calculate totals
            const totalFiles = previewResults.length;
            const totalTranslations = previewResults.reduce((sum, f) => sum + f.translations.length, 0);
            const totalNewKeys = previewResults.reduce((sum, f) => sum + f.stats.newKeys, 0);
            const totalExistingKeys = previewResults.reduce((sum, f) => sum + f.stats.existingKeys, 0);
            const totalReusedKeys = previewResults.reduce((sum, f) => sum + f.stats.reusedFromShared, 0);

            // Build namespace summary
            const namespaceSummary = [];
            for (const [ns, data] of globalNamespaceUsage) {
                namespaceSummary.push({
                    namespace: ns,
                    keyCount: data.keys.size,
                    fileCount: data.files.size,
                    keys: Array.from(data.keys).slice(0, 20), // Show first 20 keys
                    hasMore: data.keys.size > 20
                });
            }
            namespaceSummary.sort((a, b) => b.keyCount - a.keyCount);

            res.json({
                success: true,
                stats: {
                    filesScanned: files.length,
                    filesWithTranslations: totalFiles,
                    totalTranslations,
                    newKeys: totalNewKeys,
                    existingKeys: totalExistingKeys,
                    reusedFromShared: totalReusedKeys,
                    namespacesAffected: namespaceSummary.length
                },
                namespaceSummary,
                files: previewResults
            });

        } catch (error) {
            console.error('Error scanning translations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================
    // Apply translations - Step 2: Actually modify files
    // ============================================================
    router.post('/extract-translations', async (req, res) => {
        try {
            const { directory, file, limit, fileType = 'all' } = req.body;

            if (!directory && !file) {
                return res.status(400).json({ error: 'Directory or file is required' });
            }

            const target = file || directory;
            console.log(`Running translation extraction for ${file ? 'file' : 'directory'}: ${target}, fileType: ${fileType}`);

            // For columns.tsx and analytics.ts files, use simplified extraction
            if (fileType === 'columns' || fileType === 'analytics' || fileType === 'columns-analytics') {
                const frontendDir = path.join(__dirname, '../../../../frontend');
                const messagesDir = path.join(frontendDir, 'messages');
                const glob = require('glob');

                let files = [];

                if (file) {
                    // Single file mode
                    files = [file];
                } else {
                    // Directory mode
                    // Determine file patterns
                    let filePatterns;
                    if (fileType === 'columns') {
                        filePatterns = ['**/columns.tsx'];
                    } else if (fileType === 'analytics') {
                        filePatterns = ['**/analytics.ts'];
                    } else {
                        filePatterns = ['**/columns.tsx', '**/analytics.ts'];
                    }

                    const targetDir = path.join(frontendDir, directory);

                    for (const pattern of filePatterns) {
                        const matched = glob.sync(pattern, {
                            cwd: targetDir,
                            ignore: ['node_modules/**', '.next/**']
                        });
                        files.push(...matched.map(f => path.join(directory, f)));
                    }
                    files = [...new Set(files)].sort();

                    if (limit && limit < files.length) {
                        files = files.slice(0, parseInt(limit));
                    }
                }

                // Load all locale files
                const localeFiles = await fs.readdir(messagesDir);
                const jsonFiles = localeFiles.filter(f => f.endsWith('.json'));
                const localeData = {};

                for (const file of jsonFiles) {
                    const localePath = path.join(messagesDir, file);
                    const content = await fs.readFile(localePath, 'utf8');
                    localeData[file] = JSON.parse(content);
                }

                const results = {
                    filesProcessed: files.length,
                    filesModified: 0,
                    keysExtracted: 0,
                    sourceFilesUpdated: 0
                };

                const modifiedFiles = [];

                // Helper: Normalize value for comparison (for deduplication)
                const normalizeValue = (value) => {
                    if (typeof value !== 'string') return '';
                    return value.trim().toLowerCase().replace(/[\s\u00A0]+/g, ' ').replace(/['']/g, "'").replace(/[""]/g, '"');
                };

                // Helper: Get parent namespaces from a namespace
                // e.g., "ext_admin_affiliate" -> ["ext_admin", "ext", "common"]
                const getParentNamespaces = (namespace) => {
                    const parents = [];
                    const parts = namespace.split('_');
                    // Build parent namespaces from most specific to least specific
                    for (let i = parts.length - 1; i > 0; i--) {
                        parents.push(parts.slice(0, i).join('_'));
                    }
                    // Always check common as the most generic namespace
                    parents.push('common');
                    return parents;
                };

                // Helper: Find existing key-value pair in any namespace (checks shared namespaces)
                // Returns { namespace, key } if found, null otherwise
                const findExistingKey = (namespace, value) => {
                    const normalizedValue = normalizeValue(value);
                    const enData = localeData['en.json'];

                    // Check namespaces in order: target namespace first, then parents
                    const namespacesToCheck = [namespace, ...getParentNamespaces(namespace)];

                    for (const ns of namespacesToCheck) {
                        const nsData = enData[ns];
                        if (!nsData || typeof nsData !== 'object') continue;

                        for (const [existingKey, existingVal] of Object.entries(nsData)) {
                            if (typeof existingVal === 'string' && normalizeValue(existingVal) === normalizedValue) {
                                return { namespace: ns, key: existingKey };
                            }
                        }
                    }
                    return null;
                };

                // Helper: Get unique key, reusing existing if value matches
                // Returns { namespace, key } to track where the key should go
                const getUniqueKey = (namespace, baseKey, value) => {
                    // First check if value already exists in any namespace
                    const existing = findExistingKey(namespace, value);
                    if (existing) {
                        return existing; // Reuse existing key from its namespace
                    }

                    // Value doesn't exist - add to the target namespace
                    const ns = localeData['en.json'][namespace] || {};

                    // Check if baseKey is available
                    if (!ns[baseKey]) {
                        return { namespace, key: baseKey };
                    }

                    // Find next available suffix
                    for (let i = 1; i <= 100; i++) {
                        const suffixedKey = `${baseKey}_${i}`;
                        if (!ns[suffixedKey]) {
                            return { namespace, key: suffixedKey };
                        }
                    }
                    return { namespace, key: `${baseKey}_${Date.now()}` };
                };

                // Helper: Add translation to all locale files
                const addTranslation = (namespace, key, value) => {
                    let added = false;
                    for (const localeFile of jsonFiles) {
                        if (!localeData[localeFile][namespace]) {
                            localeData[localeFile][namespace] = {};
                        }
                        if (!localeData[localeFile][namespace][key]) {
                            localeData[localeFile][namespace][key] = value;
                            added = true;
                        }
                    }
                    return added;
                };

                // Helper: Get translator variable name for a namespace
                // Primary namespace uses 't', others use tNamespace format
                const getTranslatorVarName = (ns, primaryNamespace) => {
                    if (ns === primaryNamespace) {
                        return 't';
                    }
                    // Convert namespace to camelCase variable: common -> tCommon, ext_admin -> tExtAdmin
                    const parts = ns.split('_');
                    const camelCase = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                    return `t${camelCase}`;
                };

                for (const file of files) {
                    const filePath = path.join(targetDir, file);
                    const fileNamespace = getNamespaceFromFile(filePath, frontendDir);

                    try {
                        let content = await fs.readFile(filePath, 'utf8');
                        const originalContent = content;
                        const isAlreadyKey = (val) => /^[a-z][a-z0-9_]*$/.test(val);
                        const isAlreadyTCall = (val) => /^t\s*\(/.test(val);

                        // Track which namespaces and keys are used in this file
                        const usedNamespaces = new Map(); // namespace -> Set of keys
                        const extractedKeys = [];
                        // Store replacements to apply after we know all namespaces
                        const replacements = [];

                        // Check if this is a server component (no "use client" directive)
                        const isServer = isServerComponent(content);

                        // Check if file already has the appropriate translations import
                        const hasUseTranslationsImport = /import\s*{[^}]*useTranslations[^}]*}\s*from\s*['"]next-intl['"]/.test(content);
                        const hasGetTranslationsImport = /import\s*{[^}]*getTranslations[^}]*}\s*from\s*['"]next-intl\/server['"]/.test(content);
                        const hasTranslationsImport = isServer ? hasGetTranslationsImport : hasUseTranslationsImport;

                        // Check if file already has const t = useTranslations(...) or const t = await getTranslations(...)
                        const hasUseTranslationsCall = /const\s+t\s*=\s*useTranslations\s*\(/.test(content);
                        const hasGetTranslationsCall = /const\s+t\s*=\s*(?:await\s+)?getTranslations\s*\(/.test(content);
                        const hasTranslationsCall = isServer ? hasGetTranslationsCall : hasUseTranslationsCall;

                        // First pass: collect all translations and their namespaces
                        // Process title, description, label values
                        const patterns = [
                            { regex: /(title:\s*)"([^"]+)"/g, type: 'title' },
                            { regex: /(title:\s*)'([^']+)'/g, type: 'title' },
                            { regex: /(description:\s*)"([^"]+)"/g, type: 'description' },
                            { regex: /(description:\s*)'([^']+)'/g, type: 'description' },
                            { regex: /(label:\s*)"([^"]+)"/g, type: 'label' },
                            { regex: /(label:\s*)'([^']+)'/g, type: 'label' }
                        ];

                        for (const { regex } of patterns) {
                            let match;
                            while ((match = regex.exec(content)) !== null) {
                                const [fullMatch, prefix, value] = match;
                                if (isAlreadyKey(value) || value.length < 2) continue;
                                if (shouldSkipForExtraction(value)) continue;

                                // Parse text into parts (handles prefixes like "e.g.," and trailing numbers)
                                const { parts, hasMultipleParts } = parseTextIntoParts(value);

                                // Process each key part
                                const processedParts = parts.map(part => {
                                    if (part.type === 'literal') return part;

                                    const keyInfo = getUniqueKey(fileNamespace, part.key, part.value);

                                    if (!usedNamespaces.has(keyInfo.namespace)) {
                                        usedNamespaces.set(keyInfo.namespace, new Set());
                                    }
                                    usedNamespaces.get(keyInfo.namespace).add(keyInfo.key);
                                    extractedKeys.push(keyInfo);

                                    return { ...part, ...keyInfo };
                                });

                                // Store for later replacement
                                replacements.push({
                                    search: fullMatch,
                                    parts: processedParts,
                                    hasMultipleParts,
                                    originalValue: value,
                                    type: 'single',
                                    prefix,
                                    context: 'attribute' // Used in attribute context (title:, label:, etc.)
                                });
                            }
                        }

                        // Process array values: title: ["First", "Second"]
                        // Use separate patterns for double and single quotes to handle apostrophes correctly
                        const arrayPatterns = [
                            { regex: /(title:\s*\[)([^\]]+)(\])/g },
                            { regex: /(description:\s*\[)([^\]]+)(\])/g }
                        ];

                        for (const { regex } of arrayPatterns) {
                            let match;
                            while ((match = regex.exec(content)) !== null) {
                                const [fullMatch, before, arrayContent, after] = match;
                                const arrayReplacements = [];

                                // Find double-quoted strings in array (handles apostrophes inside)
                                const doubleQuotePattern = /"([^"]+)"/g;
                                let strMatch;
                                while ((strMatch = doubleQuotePattern.exec(arrayContent)) !== null) {
                                    const value = strMatch[1];
                                    if (isAlreadyKey(value) || value.length < 2) continue;
                                    if (shouldSkipForExtraction(value)) continue;

                                    // Parse text into parts
                                    const { parts, hasMultipleParts } = parseTextIntoParts(value);

                                    const processedParts = parts.map(part => {
                                        if (part.type === 'literal') return part;

                                        const keyInfo = getUniqueKey(fileNamespace, part.key, part.value);

                                        if (!usedNamespaces.has(keyInfo.namespace)) {
                                            usedNamespaces.set(keyInfo.namespace, new Set());
                                        }
                                        usedNamespaces.get(keyInfo.namespace).add(keyInfo.key);
                                        extractedKeys.push(keyInfo);

                                        return { ...part, ...keyInfo };
                                    });

                                    arrayReplacements.push({
                                        original: strMatch[0],
                                        parts: processedParts,
                                        hasMultipleParts,
                                        originalValue: value
                                    });
                                }

                                // Find single-quoted strings in array (no apostrophes allowed inside)
                                const singleQuotePattern = /'([^']+)'/g;
                                while ((strMatch = singleQuotePattern.exec(arrayContent)) !== null) {
                                    const value = strMatch[1];
                                    if (isAlreadyKey(value) || value.length < 2) continue;
                                    if (shouldSkipForExtraction(value)) continue;

                                    // Parse text into parts
                                    const { parts, hasMultipleParts } = parseTextIntoParts(value);

                                    const processedParts = parts.map(part => {
                                        if (part.type === 'literal') return part;

                                        const keyInfo = getUniqueKey(fileNamespace, part.key, part.value);

                                        if (!usedNamespaces.has(keyInfo.namespace)) {
                                            usedNamespaces.set(keyInfo.namespace, new Set());
                                        }
                                        usedNamespaces.get(keyInfo.namespace).add(keyInfo.key);
                                        extractedKeys.push(keyInfo);

                                        return { ...part, ...keyInfo };
                                    });

                                    arrayReplacements.push({
                                        original: strMatch[0],
                                        parts: processedParts,
                                        hasMultipleParts,
                                        originalValue: value
                                    });
                                }

                                if (arrayReplacements.length > 0) {
                                    replacements.push({
                                        search: fullMatch,
                                        type: 'array',
                                        before,
                                        after,
                                        arrayContent,
                                        arrayReplacements
                                    });
                                }
                            }
                        }

                        if (extractedKeys.length === 0) continue;

                        // Determine primary namespace (the file's own namespace or the most used one)
                        let primaryNamespace = fileNamespace;
                        if (!usedNamespaces.has(fileNamespace)) {
                            // File's namespace isn't used, pick the one with most keys
                            let maxKeys = 0;
                            for (const [ns, keys] of usedNamespaces) {
                                if (keys.size > maxKeys) {
                                    maxKeys = keys.size;
                                    primaryNamespace = ns;
                                }
                            }
                        }

                        // Helper to build code from parts for attribute context (title:, label:, etc.)
                        // Result: t("eg") + ", " + t("trade_crypto")
                        const buildAttributeCode = (parts, primaryNs) => {
                            return parts.map(part => {
                                if (part.type === 'literal') {
                                    return `"${part.value}"`;
                                }
                                const varName = getTranslatorVarName(part.namespace, primaryNs);
                                return `${varName}("${part.key}")`;
                            }).join(' + ');
                        };

                        // Apply replacements with correct translator function
                        for (const replacement of replacements) {
                            if (replacement.type === 'single') {
                                // Build code from parts: t("eg") + ", " + t("trade_crypto")
                                const codeFromParts = buildAttributeCode(replacement.parts, primaryNamespace);
                                const newValue = `${replacement.prefix}${codeFromParts}`;
                                content = content.replace(replacement.search, newValue);

                                // Add translations for each key part
                                for (const part of replacement.parts) {
                                    if (part.type === 'key') {
                                        if (addTranslation(part.namespace, part.key, part.value)) {
                                            results.keysExtracted++;
                                        }
                                    }
                                }
                            } else if (replacement.type === 'array') {
                                let newArrayContent = replacement.arrayContent;
                                for (const arrRepl of replacement.arrayReplacements) {
                                    // Build code from parts
                                    const codeFromParts = buildAttributeCode(arrRepl.parts, primaryNamespace);

                                    newArrayContent = newArrayContent.replace(
                                        arrRepl.original,
                                        codeFromParts
                                    );

                                    // Add translations for each key part
                                    for (const part of arrRepl.parts) {
                                        if (part.type === 'key') {
                                            if (addTranslation(part.namespace, part.key, part.value)) {
                                                results.keysExtracted++;
                                            }
                                        }
                                    }
                                }
                                content = content.replace(
                                    replacement.search,
                                    `${replacement.before}${newArrayContent}${replacement.after}`
                                );
                            }
                        }

                        // Add translations import if missing (use appropriate import based on component type)
                        if (!hasTranslationsImport) {
                            const importStatement = getTranslationImport(isServer);

                            // Find existing imports to append after them
                            const importMatch = content.match(/^(import\s+.+from\s+['"][^'"]+['"];?\s*\n?)+/m);
                            if (importMatch) {
                                const insertPos = importMatch.index + importMatch[0].length;
                                content = content.slice(0, insertPos) +
                                    importStatement + '\n' +
                                    content.slice(insertPos);
                            } else {
                                // No imports found - check for "use client" or "use server" directive
                                // These must stay at the very top of the file
                                const directiveMatch = content.match(/^(\s*["']use (client|server)["'];?\s*\n)/);
                                if (directiveMatch) {
                                    // Insert after the directive
                                    const insertPos = directiveMatch[0].length;
                                    content = content.slice(0, insertPos) +
                                        '\n' + importStatement + '\n' +
                                        content.slice(insertPos);
                                } else {
                                    // No directive, add at the beginning
                                    content = importStatement + '\n' + content;
                                }
                            }
                        }

                        // Add translation declarations to ALL exported functions that need them
                        // Build declarations for all used namespaces (use appropriate syntax based on component type)
                        const declarations = [];
                        const sortedNamespaces = Array.from(usedNamespaces.keys()).sort((a, b) => {
                            if (a === primaryNamespace) return -1;
                            if (b === primaryNamespace) return 1;
                            return a.localeCompare(b);
                        });

                        for (const ns of sortedNamespaces) {
                            const varName = getTranslatorVarName(ns, primaryNamespace);
                            declarations.push(getTranslationDeclaration(varName, ns, isServer));
                        }
                        const declarationBlock = `\n  ${declarations.join('\n  ')}`;

                        // Find ALL exported functions/hooks in the file
                        // Pattern matches: export function useFoo() {, export const useFoo = () => {, etc.
                        const functionPatterns = [
                            /export\s+function\s+(use\w+)\s*\([^)]*\)\s*\{/g,
                            /export\s+const\s+(use\w+)\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{/g,
                            /export\s+const\s+(use\w+)\s*=\s*function\s*\([^)]*\)\s*\{/g
                        ];

                        // Collect all function positions that need declarations
                        const functionsToUpdate = [];
                        for (const pattern of functionPatterns) {
                            let match;
                            while ((match = pattern.exec(content)) !== null) {
                                const funcName = match[1];
                                const insertPos = match.index + match[0].length;

                                // Check if this function already has useTranslations or getTranslations
                                // Look ahead for const t = useTranslations/getTranslations within the next ~200 chars
                                const lookAhead = content.slice(insertPos, insertPos + 200);
                                const hasT = /^\s*\n?\s*const\s+t\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)/.test(lookAhead);

                                if (!hasT) {
                                    functionsToUpdate.push({
                                        name: funcName,
                                        insertPos,
                                        matchEnd: match.index + match[0].length
                                    });
                                }
                            }
                        }

                        // Sort by position descending (to insert from end to start)
                        functionsToUpdate.sort((a, b) => b.insertPos - a.insertPos);

                        // Insert declarations into each function
                        for (const func of functionsToUpdate) {
                            content = content.slice(0, func.insertPos) +
                                declarationBlock +
                                content.slice(func.insertPos);
                        }

                        if (content !== originalContent) {
                            await fs.writeFile(filePath, content, 'utf8');
                            modifiedFiles.push(path.relative(frontendDir, filePath));
                            results.filesModified++;
                            results.sourceFilesUpdated++;
                        }
                    } catch (e) {
                        console.error(`Error processing ${file}:`, e.message);
                    }
                }

                // Save all locale files
                for (const [file, data] of Object.entries(localeData)) {
                    const localePath = path.join(messagesDir, file);
                    // Sort keys in each namespace
                    const sortedData = {};
                    for (const [ns, keys] of Object.entries(data)) {
                        sortedData[ns] = Object.keys(keys).sort().reduce((acc, key) => {
                            acc[key] = keys[key];
                            return acc;
                        }, {});
                    }
                    await fs.writeFile(localePath, JSON.stringify(sortedData, null, 2), 'utf8');
                }

                return res.json({
                    success: true,
                    message: 'Translation extraction completed',
                    stats: results,
                    modifiedFiles
                });
            }

            // For all other files, use the full extractor service
            const servicePath = require.resolve('../services/extract-translations.service');
            delete require.cache[servicePath];

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

    // Scan for bad keys in JSON files (keys that don't follow proper snake_case naming)
    router.get('/scan-bad-keys', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const enFilePath = path.join(messagesDir, 'en.json');

            const content = await fs.readFile(enFilePath, 'utf8');
            const data = JSON.parse(content);

            const badKeys = [];
            const goodKeys = [];

            // Helper to recursively check keys
            function checkKeys(obj, parentPath = '') {
                for (const [key, value] of Object.entries(obj)) {
                    const fullPath = parentPath ? `${parentPath}.${key}` : key;

                    // Check if key is valid (must start with lowercase letter, then lowercase letters, numbers, and underscores)
                    // Keys starting with underscore followed by number are NOT valid (e.g., _24h_volume)
                    const isValid = /^[a-z][a-z0-9_]*$/.test(key);

                    // Check for specific issues
                    const issues = [];
                    if (/[A-Z]/.test(key)) issues.push('contains_uppercase');
                    if (/\s/.test(key)) issues.push('contains_spaces');
                    if (/\.{2,}/.test(key)) issues.push('contains_consecutive_dots');
                    if (/^[0-9]/.test(key)) issues.push('starts_with_number');
                    if (/^_\d/.test(key)) issues.push('starts_with_underscore_number'); // NEW: _24h is bad
                    if (/^_/.test(key) && !/^_\d/.test(key)) issues.push('starts_with_underscore'); // _foo is also bad
                    if (/[^a-zA-Z0-9_]/.test(key)) issues.push('contains_special_chars');
                    if (key.length > 60) issues.push('too_long');
                    if (/\.\.\./.test(key)) issues.push('contains_ellipsis');

                    // Key is bad if it doesn't match valid pattern OR has any issues
                    const isBad = !isValid || issues.length > 0;

                    if (isBad) {
                        // Generate corrected key using the new correctBadKey function
                        const correctedKey = correctBadKey(key);

                        badKeys.push({
                            path: fullPath,
                            currentKey: key,
                            correctedKey,
                            issues,
                            value: typeof value === 'string' ? value : null,
                            hasChildren: typeof value === 'object' && value !== null
                        });
                    } else {
                        goodKeys.push(fullPath);
                    }

                    // Recurse into nested objects
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        checkKeys(value, fullPath);
                    }
                }
            }

            checkKeys(data);

            res.json({
                success: true,
                stats: {
                    totalKeys: goodKeys.length + badKeys.length,
                    goodKeys: goodKeys.length,
                    badKeys: badKeys.length
                },
                badKeys: badKeys.slice(0, 200), // Limit for performance
                hasMore: badKeys.length > 200
            });

        } catch (error) {
            console.error('Error scanning for bad keys:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Fix bad keys in JSON files and TSX files
    router.post('/fix-bad-keys', async (req, res) => {
        try {
            const { keys } = req.body; // Array of { path, currentKey, correctedKey }
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const frontendDir = path.join(__dirname, '../../../../frontend');

            if (!keys || !Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ error: 'Keys array is required' });
            }

            const results = {
                jsonFixed: 0,
                tsxFixed: 0,
                errors: []
            };

            // Get all locale files
            const localeFiles = await fs.readdir(messagesDir);
            const jsonFiles = localeFiles.filter(f => f.endsWith('.json'));

            // Create mapping of old keys to new keys
            const keyMappings = new Map();
            for (const item of keys) {
                keyMappings.set(item.path, {
                    currentKey: item.currentKey,
                    correctedKey: item.correctedKey
                });
            }

            // Fix JSON files
            for (const file of jsonFiles) {
                const filePath = path.join(messagesDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    let modified = false;

                    // Helper to fix keys recursively
                    function fixKeysInObject(obj, parentPath = '') {
                        const entries = Object.entries(obj);
                        for (const [key, value] of entries) {
                            const fullPath = parentPath ? `${parentPath}.${key}` : key;

                            if (keyMappings.has(fullPath)) {
                                const mapping = keyMappings.get(fullPath);
                                // Rename the key
                                delete obj[key];
                                obj[mapping.correctedKey] = value;
                                modified = true;
                            }

                            // Recurse into nested objects
                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                fixKeysInObject(value, fullPath);
                            }
                        }
                    }

                    fixKeysInObject(data);

                    if (modified) {
                        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
                        results.jsonFixed++;
                    }
                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }

            // Fix TSX files - find and replace t("old_key") with t("new_key")
            const glob = require('glob');
            const tsxFiles = glob.sync('{app,components}/**/*.{ts,tsx}', {
                cwd: frontendDir,
                ignore: ['node_modules/**', '.next/**']
            });

            for (const file of tsxFiles) {
                const filePath = path.join(frontendDir, file);
                try {
                    let content = await fs.readFile(filePath, 'utf8');
                    let modified = false;

                    for (const [fullPath, mapping] of keyMappings) {
                        // Get the key part (after namespace)
                        const keyParts = fullPath.split('.');
                        if (keyParts.length < 2) continue;

                        const namespace = keyParts[0];
                        const oldKeyPart = keyParts.slice(1).join('.');

                        // Check if file uses this namespace (either client or server component)
                        const usesNamespaceClient = content.includes(`useTranslations("${namespace}")`) ||
                            content.includes(`useTranslations('${namespace}')`);
                        const usesNamespaceServer = content.includes(`getTranslations("${namespace}")`) ||
                            content.includes(`getTranslations('${namespace}')`);
                        if (!usesNamespaceClient && !usesNamespaceServer) {
                            continue;
                        }

                        // Replace t("old_key") with t("new_key")
                        const patterns = [
                            new RegExp(`t\\("${escapeRegExp(oldKeyPart)}"\\)`, 'g'),
                            new RegExp(`t\\('${escapeRegExp(oldKeyPart)}'\\)`, 'g'),
                            new RegExp(`t\\(\`${escapeRegExp(oldKeyPart)}\`\\)`, 'g')
                        ];

                        const newKeyPart = keyParts[0] === mapping.correctedKey
                            ? mapping.correctedKey
                            : fullPath.replace(keyParts.slice(0, -1).join('.') + '.', '') === mapping.currentKey
                                ? mapping.correctedKey
                                : mapping.correctedKey;

                        // Construct new key part from the path
                        const newKeyPath = fullPath.replace(mapping.currentKey, mapping.correctedKey);
                        const newKeyPartForTsx = newKeyPath.split('.').slice(1).join('.');

                        for (const pattern of patterns) {
                            if (pattern.test(content)) {
                                content = content.replace(pattern, `t("${newKeyPartForTsx}")`);
                                modified = true;
                            }
                        }
                    }

                    if (modified) {
                        await fs.writeFile(filePath, content, 'utf8');
                        results.tsxFixed++;
                    }
                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }

            res.json({
                success: true,
                message: `Fixed ${results.jsonFixed} JSON files and ${results.tsxFixed} TSX files`,
                results
            });

        } catch (error) {
            console.error('Error fixing bad keys:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Helper function to escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ============================================================
    // DataTable Translations Extraction
    // Extract title/description from page.tsx, columns.tsx, analytics.ts
    // ============================================================

    /**
     * Get namespace from file path - matches extract-translations.service.js logic
     * Namespace hierarchy uses underscore format: ext_admin, dashboard_admin
     * Maximum depth of 2 segments
     */
    function getNamespaceFromFile(filePath, frontendDir) {
        const relativeToFrontend = path.relative(frontendDir, filePath).replace(/\\/g, '/');
        let rel = relativeToFrontend;

        // Handle app directory
        if (rel.startsWith('app/')) {
            rel = rel.slice(4);
        }

        // Remove [locale]/ prefix
        rel = rel.replace(/^\[locale\]\//, '');

        // Remove filename - handles both /filename.tsx and just filename.tsx at root
        rel = rel.replace(/\/?(page|layout|client|error|not-found|global-error|loading|columns|analytics)\.tsx?$/, '');
        rel = rel.replace(/\.tsx?$/, '');

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

    /**
     * Scan all admin pages to find DataTable title/description values
     * that need to be converted to translation keys
     */
    router.get('/scan-datatable-translations', async (req, res) => {
        try {
            const glob = require('glob');
            const frontendDir = path.join(__dirname, '../../../../frontend');
            const appDir = path.join(frontendDir, 'app');

            // Find all columns.tsx files in admin directories
            const columnsFiles = glob.sync('**/admin/**/columns.tsx', {
                cwd: appDir,
                ignore: ['node_modules/**', '.next/**']
            });

            // Find all analytics.ts files in admin directories
            const analyticsFiles = glob.sync('**/admin/**/analytics.ts', {
                cwd: appDir,
                ignore: ['node_modules/**', '.next/**']
            });

            console.log(`Found ${columnsFiles.length} columns files, ${analyticsFiles.length} analytics files`);

            const columnsTranslations = [];
            const analyticsTranslations = [];

            // Process all columns.tsx files
            for (const file of columnsFiles) {
                const filePath = path.join(appDir, file);
                const columnsRelPath = file.replace(/\\/g, '/');
                const namespace = getNamespaceFromFile(filePath, frontendDir);

                try {
                    const columnsContent = await fs.readFile(filePath, 'utf8');

                    // Helper to check if a value looks like a translation key (snake_case)
                    const isAlreadyKey = (val) => /^[a-z][a-z0-9_]*$/.test(val);

                    // Helper to validate extracted value doesn't look like broken syntax
                    // e.g., "user"s profile" suggests broken quote escaping
                    const isBrokenSyntax = (val) => {
                        // Check for patterns that suggest broken syntax
                        if (/^[a-z]+$/.test(val) && val.length < 10) {
                            // Very short lowercase-only string might be broken
                            // e.g., "user" from "user"s profile"
                            return true;
                        }
                        // Check if it starts/ends with common broken patterns
                        if (/^s\s/.test(val)) return true; // Starts with "s " (from broken 's)
                        return false;
                    };

                    // Extract all title: "Value" patterns (single string values)
                    const columnTitleRegex = /title:\s*["']([^"']+)["']/g;
                    let match;
                    while ((match = columnTitleRegex.exec(columnsContent)) !== null) {
                        const value = match[1];
                        if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                            columnsTranslations.push({
                                file: columnsRelPath,
                                type: 'column_title',
                                value: value,
                                key: generateTranslationKey(value),
                                namespace: namespace
                            });
                        }
                    }

                    // Extract all description: "Value" patterns (single string values)
                    const columnDescRegex = /description:\s*["']([^"']+)["']/g;
                    while ((match = columnDescRegex.exec(columnsContent)) !== null) {
                        const value = match[1];
                        if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                            columnsTranslations.push({
                                file: columnsRelPath,
                                type: 'column_description',
                                value: value,
                                key: generateTranslationKey(value),
                                namespace: namespace
                            });
                        }
                    }

                    // Extract array titles: title: ["First Name", "Last Name"]
                    const arrayTitleRegex = /title:\s*\[([^\]]+)\]/g;
                    while ((match = arrayTitleRegex.exec(columnsContent)) !== null) {
                        const arrayContent = match[1];
                        // Use separate patterns for double and single quoted strings
                        // Double quotes can contain apostrophes: "User's name"
                        const doubleQuoteRegex = /"([^"]+)"/g;
                        let stringMatch;
                        while ((stringMatch = doubleQuoteRegex.exec(arrayContent)) !== null) {
                            const value = stringMatch[1];
                            if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                                columnsTranslations.push({
                                    file: columnsRelPath,
                                    type: 'column_title',
                                    value: value,
                                    key: generateTranslationKey(value),
                                    namespace: namespace
                                });
                            }
                        }
                        // Single quotes (with escaped apostrophes)
                        const singleQuoteRegex = /'([^']+)'/g;
                        while ((stringMatch = singleQuoteRegex.exec(arrayContent)) !== null) {
                            const value = stringMatch[1];
                            if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                                columnsTranslations.push({
                                    file: columnsRelPath,
                                    type: 'column_title',
                                    value: value,
                                    key: generateTranslationKey(value),
                                    namespace: namespace
                                });
                            }
                        }
                    }

                    // Extract array descriptions: description: ["User's first name", "User's last name"]
                    const arrayDescRegex = /description:\s*\[([^\]]+)\]/g;
                    while ((match = arrayDescRegex.exec(columnsContent)) !== null) {
                        const arrayContent = match[1];
                        // Use separate patterns for double and single quoted strings
                        const doubleQuoteRegex = /"([^"]+)"/g;
                        let stringMatch;
                        while ((stringMatch = doubleQuoteRegex.exec(arrayContent)) !== null) {
                            const value = stringMatch[1];
                            if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                                columnsTranslations.push({
                                    file: columnsRelPath,
                                    type: 'column_description',
                                    value: value,
                                    key: generateTranslationKey(value),
                                    namespace: namespace
                                });
                            }
                        }
                        // Single quotes
                        const singleQuoteRegex = /'([^']+)'/g;
                        while ((stringMatch = singleQuoteRegex.exec(arrayContent)) !== null) {
                            const value = stringMatch[1];
                            if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                                columnsTranslations.push({
                                    file: columnsRelPath,
                                    type: 'column_description',
                                    value: value,
                                    key: generateTranslationKey(value),
                                    namespace: namespace
                                });
                            }
                        }
                    }

                    // Extract option labels: { value: "X", label: "Label" }
                    const labelRegex = /label:\s*["']([^"']+)["']/g;
                    while ((match = labelRegex.exec(columnsContent)) !== null) {
                        const value = match[1];
                        if (!isAlreadyKey(value) && !isBrokenSyntax(value)) {
                            columnsTranslations.push({
                                file: columnsRelPath,
                                type: 'column_label',
                                value: value,
                                key: generateTranslationKey(value),
                                namespace: namespace
                            });
                        }
                    }

                } catch (e) {
                    console.error(`Error reading columns file ${file}:`, e.message);
                }
            }

            // Process all analytics.ts files independently
            for (const file of analyticsFiles) {
                const filePath = path.join(appDir, file);
                const analyticsRelPath = file.replace(/\\/g, '/');
                const namespace = getNamespaceFromFile(filePath, frontendDir);

                try {
                    const analyticsContent = await fs.readFile(filePath, 'utf8');

                    // Helper to check if a value looks like a translation key (snake_case)
                    const isAlreadyKey = (val) => /^[a-z][a-z0-9_]*$/.test(val);

                    // Extract analytics titles
                    const analyticsTitleRegex = /title:\s*["']([^"']+)["']/g;

                    let match;
                    while ((match = analyticsTitleRegex.exec(analyticsContent)) !== null) {
                        const value = match[1];
                        if (!isAlreadyKey(value)) {
                            analyticsTranslations.push({
                                file: analyticsRelPath,
                                type: 'analytics_title',
                                value: value,
                                key: generateTranslationKey(value),
                                namespace: namespace
                            });
                        }
                    }

                    // Extract label values from analytics config
                    const labelsRegex = /labels:\s*\{([^}]+)\}/g;
                    while ((match = labelsRegex.exec(analyticsContent)) !== null) {
                        const labelsContent = match[1];
                        const labelRegex = /(\w+):\s*["']([^"']+)["']/g;
                        let labelMatch;
                        while ((labelMatch = labelRegex.exec(labelsContent)) !== null) {
                            const value = labelMatch[2];
                            if (!isAlreadyKey(value)) {
                                analyticsTranslations.push({
                                    file: analyticsRelPath,
                                    type: 'analytics_label',
                                    value: value,
                                    key: generateTranslationKey(value),
                                    namespace: namespace
                                });
                            }
                        }
                    }

                } catch (e) {
                    console.error(`Error reading analytics file ${file}:`, e.message);
                }
            }

            // Get unique values for adding to locale files (deduplicated by value)
            const getUniqueByValue = (arr) => {
                const seen = new Map();
                return arr.filter(item => {
                    if (seen.has(item.value)) {
                        return false;
                    }
                    seen.set(item.value, true);
                    return true;
                });
            };

            const uniqueColumnsTranslations = getUniqueByValue(columnsTranslations);
            const uniqueAnalyticsTranslations = getUniqueByValue(analyticsTranslations);

            // Count items that need source file update only (key already exists)
            const allUniqueTranslations = [...uniqueColumnsTranslations, ...uniqueAnalyticsTranslations];
            const sourceFileUpdatesOnly = allUniqueTranslations.filter(t => t.keyExists).length;
            const newKeysNeeded = allUniqueTranslations.filter(t => !t.keyExists).length;

            // Return ALL translations (not deduplicated) for source file updates
            // The same value like "User" may appear in multiple files and all need updating
            res.json({
                success: true,
                stats: {
                    columnsScanned: columnsFiles.length,
                    analyticsScanned: analyticsFiles.length,
                    columnTranslations: uniqueColumnsTranslations.length,
                    analyticsTranslations: uniqueAnalyticsTranslations.length,
                    totalTranslations: uniqueColumnsTranslations.length + uniqueAnalyticsTranslations.length,
                    totalSourceFileUpdates: columnsTranslations.length + analyticsTranslations.length,
                    sourceFileUpdatesOnly: sourceFileUpdatesOnly,
                    newKeysNeeded: newKeysNeeded
                },
                // Return ALL translations for source file updates (includes same value across multiple files)
                columnTranslations: columnsTranslations,
                analyticsTranslations: analyticsTranslations
            });

        } catch (error) {
            console.error('Error scanning DataTable translations:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * Apply DataTable translations - add keys to translation files
     * and update source files to use the keys
     */
    router.post('/apply-datatable-translations', async (req, res) => {
        try {
            const { translations, updateSourceFiles = false } = req.body;
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');
            const frontendDir = path.join(__dirname, '../../../../frontend');

            if (!translations || !Array.isArray(translations)) {
                return res.status(400).json({ error: 'Translations array is required' });
            }

            const results = {
                translationsAdded: 0,
                filesUpdated: 0,
                sourceFilesUpdated: 0,
                sourceFileReplacementsCount: 0,
                errors: []
            };

            // Get all locale files
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            // Add translations to all locale files
            for (const file of jsonFiles) {
                const filePath = path.join(messagesDir, file);
                const locale = file.replace('.json', '');

                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);

                    let modified = false;
                    const modifiedNamespaces = new Set();

                    for (const item of translations) {
                        const { key, value, namespace = 'common' } = item;

                        // Ensure namespace exists
                        if (!data[namespace]) {
                            data[namespace] = {};
                        }

                        // Only add if key doesn't exist in the namespace
                        if (!data[namespace][key]) {
                            data[namespace][key] = value;
                            modified = true;
                            modifiedNamespaces.add(namespace);
                            if (locale === 'en') {
                                results.translationsAdded++;
                            }
                        }
                    }

                    if (modified) {
                        // Sort keys alphabetically in each modified namespace
                        for (const namespace of modifiedNamespaces) {
                            data[namespace] = Object.keys(data[namespace])
                                .sort()
                                .reduce((acc, key) => {
                                    acc[key] = data[namespace][key];
                                    return acc;
                                }, {});
                        }

                        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
                        results.filesUpdated++;
                    }

                } catch (error) {
                    results.errors.push({ file, error: error.message });
                }
            }

            // Optionally update source files to use translation keys with t() calls
            if (updateSourceFiles) {
                const appDir = path.join(frontendDir, 'app');

                // Group translations by file
                const translationsByFile = new Map();
                for (const item of translations) {
                    if (!translationsByFile.has(item.file)) {
                        translationsByFile.set(item.file, []);
                    }
                    translationsByFile.get(item.file).push(item);
                }

                for (const [file, items] of translationsByFile) {
                    const filePath = path.join(appDir, file);

                    try {
                        let content = await fs.readFile(filePath, 'utf8');
                        let modified = false;
                        let fileReplacementsCount = 0;

                        // Get the namespace for this file (should be same for all items)
                        const namespace = items[0]?.namespace || 'common';

                        // Check if file already has useTranslations import
                        const hasUseTranslationsImport = /import\s*{[^}]*useTranslations[^}]*}\s*from\s*['"]next-intl['"]/.test(content);

                        // Check if file already has a t = useTranslations call
                        const hasUseTranslationsCall = /const\s+t\s*=\s*useTranslations\(/.test(content);

                        // For columns.tsx files that use hooks (useColumns, useFormConfig), add useTranslations
                        const isColumnsFile = file.endsWith('columns.tsx');
                        const isAnalyticsFile = file.endsWith('analytics.ts');

                        // Determine if this file needs t() calls or just snake_case keys
                        // For hook-based files (columns with useColumns), we use t() calls
                        // For static analytics.ts files, we just use snake_case keys (translated at runtime by DataTable)
                        const hasHookPattern = /export\s+function\s+use(Columns|FormConfig|Analytics)\s*\(/.test(content);

                        if (isColumnsFile && hasHookPattern) {
                            // This is a hook-based columns file - use t() calls

                            // Add useTranslations import if needed
                            if (!hasUseTranslationsImport) {
                                // Find the last import statement
                                const lastImportMatch = content.match(/^import\s+.+from\s+['"][^'"]+['"];?\s*$/gm);
                                if (lastImportMatch) {
                                    const lastImport = lastImportMatch[lastImportMatch.length - 1];
                                    const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
                                    content = content.slice(0, lastImportIndex) +
                                        '\nimport { useTranslations } from "next-intl";' +
                                        content.slice(lastImportIndex);
                                    modified = true;
                                }
                            }

                            // Add useTranslations call inside each hook if not present
                            if (!hasUseTranslationsCall) {
                                // Add to useColumns hook
                                const useColumnsMatch = content.match(/(export\s+function\s+useColumns\s*\(\s*\)\s*\{)/);
                                if (useColumnsMatch) {
                                    content = content.replace(
                                        useColumnsMatch[1],
                                        `${useColumnsMatch[1]}\n  const t = useTranslations("${namespace}");`
                                    );
                                    modified = true;
                                }

                                // Add to useFormConfig hook
                                const useFormConfigMatch = content.match(/(export\s+function\s+useFormConfig\s*\(\s*\)\s*\{)/);
                                if (useFormConfigMatch) {
                                    content = content.replace(
                                        useFormConfigMatch[1],
                                        `${useFormConfigMatch[1]}\n  const t = useTranslations("${namespace}");`
                                    );
                                    modified = true;
                                }
                            }

                            // Replace string values with t() calls
                            for (const item of items) {
                                const { type, value, key } = item;
                                const propName = type.replace('column_', '').replace('form_', '').replace('group_', '');

                                // Pattern for double-quoted strings
                                const doubleQuotePattern = new RegExp(`(${propName}:\\s*)"${escapeRegExp(value)}"`, 'g');
                                const singleQuotePattern = new RegExp(`(${propName}:\\s*)'${escapeRegExp(value).replace(/'/g, "\\\\'")}'`, 'g');

                                if (content.match(doubleQuotePattern)) {
                                    content = content.replace(doubleQuotePattern, `$1t("${key}")`);
                                    modified = true;
                                    fileReplacementsCount++;
                                }
                                if (content.match(singleQuotePattern)) {
                                    content = content.replace(singleQuotePattern, `$1t("${key}")`);
                                    modified = true;
                                    fileReplacementsCount++;
                                }

                                // Handle arrays like title: ["First Name", "Last Name"]
                                const arrayPattern = new RegExp(`(${propName}:\\s*\\[)([^\\]]+)(\\])`, 'g');
                                content = content.replace(arrayPattern, (match, before, arrayContent, after) => {
                                    let newContent = arrayContent;
                                    const originalContent = arrayContent;

                                    const dqPattern = new RegExp(`"${escapeRegExp(value)}"`, 'g');
                                    newContent = newContent.replace(dqPattern, `t("${key}")`);

                                    const sqPattern = new RegExp(`'${escapeRegExp(value).replace(/'/g, "\\\\'")}'`, 'g');
                                    newContent = newContent.replace(sqPattern, `t("${key}")`);

                                    if (newContent !== originalContent) {
                                        modified = true;
                                        fileReplacementsCount++;
                                    }
                                    return before + newContent + after;
                                });
                            }
                        } else {
                            // For analytics files or non-hook files, just replace with snake_case keys
                            // The DataTable component handles translation at runtime
                            for (const item of items) {
                                const { type, value, key } = item;
                                const propName = type.includes('title') ? 'title' : 'label';

                                const doubleQuotePattern = new RegExp(`(${propName}:\\s*)"${escapeRegExp(value)}"`, 'g');
                                const singleQuotePattern = new RegExp(`(${propName}:\\s*)'${escapeRegExp(value).replace(/'/g, "\\\\'")}'`, 'g');

                                if (content.match(doubleQuotePattern)) {
                                    content = content.replace(doubleQuotePattern, `$1"${key}"`);
                                    modified = true;
                                    fileReplacementsCount++;
                                }
                                if (content.match(singleQuotePattern)) {
                                    content = content.replace(singleQuotePattern, `$1'${key}'`);
                                    modified = true;
                                    fileReplacementsCount++;
                                }
                            }
                        }

                        if (modified) {
                            await fs.writeFile(filePath, content, 'utf8');
                            results.sourceFilesUpdated++;
                            results.sourceFileReplacementsCount += fileReplacementsCount;
                        }

                    } catch (error) {
                        results.errors.push({ file, error: error.message });
                    }
                }
            }

            res.json({
                success: true,
                message: `Added ${results.translationsAdded} translations to ${results.filesUpdated} locale files. Updated ${results.sourceFilesUpdated} source files with ${results.sourceFileReplacementsCount} replacements.`,
                results
            });

        } catch (error) {
            console.error('Error applying DataTable translations:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================
    // Analyze sync - preview what will be synced (Step 1)
    // ============================================================
    router.get('/analyze-sync', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');

            // Read all locale files
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            // Read English (source) file
            const enPath = path.join(messagesDir, 'en.json');
            const enContent = await fs.readFile(enPath, 'utf8');
            const enData = JSON.parse(enContent);

            // Flatten English keys for comparison
            function flattenKeys(obj, prefix = '') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        Object.assign(result, flattenKeys(value, fullKey));
                    } else {
                        result[fullKey] = value;
                    }
                }
                return result;
            }

            const enFlat = flattenKeys(enData);
            const totalEnglishKeys = Object.keys(enFlat).length;
            const namespaces = new Set(Object.keys(enFlat).map(k => k.split('.')[0]));

            const locales = {};
            const missing = {};
            let totalMissing = 0;

            // Process each locale file (except en.json)
            for (const file of jsonFiles) {
                if (file === 'en.json') continue;

                const localePath = path.join(messagesDir, file);
                const localeCode = file.replace('.json', '');

                try {
                    const localeContent = await fs.readFile(localePath, 'utf8');
                    const localeData = JSON.parse(localeContent);
                    const localeFlat = flattenKeys(localeData);

                    const missingKeys = {};
                    let localesMissing = 0;

                    // Find missing keys
                    for (const [key, value] of Object.entries(enFlat)) {
                        if (!(key in localeFlat)) {
                            const [namespace] = key.split('.');
                            if (!missingKeys[namespace]) {
                                missingKeys[namespace] = {};
                            }
                            missingKeys[namespace][key] = value;
                            localesMissing++;
                        }
                    }

                    locales[localeCode] = {
                        total: totalEnglishKeys,
                        existing: Object.keys(localeFlat).length,
                        missing: localesMissing
                    };

                    if (localesMissing > 0) {
                        missing[localeCode] = missingKeys;
                        totalMissing += localesMissing;
                    }
                } catch (error) {
                    console.error(`Error processing ${file}:`, error.message);
                    locales[localeCode] = { error: error.message };
                }
            }

            res.json({
                success: true,
                stats: {
                    localeCount: Object.keys(locales).length,
                    totalEnglishKeys,
                    namespaceCount: namespaces.size,
                    totalMissing
                },
                locales,
                missing
            });

        } catch (error) {
            console.error('Error analyzing sync:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Sync all translations - add missing keys from English to all locales
    router.post('/sync-translations', async (req, res) => {
        try {
            const messagesDir = path.join(__dirname, '../../../../frontend/messages');

            // Read all locale files
            const files = await fs.readdir(messagesDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            // Read English (source) file
            const enPath = path.join(messagesDir, 'en.json');
            const enContent = await fs.readFile(enPath, 'utf8');
            const enData = JSON.parse(enContent);

            // Flatten English keys for comparison
            function flattenKeys(obj, prefix = '') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        Object.assign(result, flattenKeys(value, fullKey));
                    } else {
                        result[fullKey] = value;
                    }
                }
                return result;
            }

            // Set a nested key value
            function setNestedValue(obj, path, value) {
                const parts = path.split('.');
                let current = obj;
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!(part in current)) {
                        current[part] = {};
                    }
                    current = current[part];
                }
                current[parts[parts.length - 1]] = value;
            }

            const enFlat = flattenKeys(enData);
            const totalKeys = Object.keys(enFlat).length;

            const results = {};
            let totalKeysAdded = 0;
            let localesUpdated = 0;

            // Process each locale file (except en.json)
            for (const file of jsonFiles) {
                if (file === 'en.json') continue;

                const localePath = path.join(messagesDir, file);
                const localeCode = file.replace('.json', '');

                try {
                    const localeContent = await fs.readFile(localePath, 'utf8');
                    const localeData = JSON.parse(localeContent);
                    const localeFlat = flattenKeys(localeData);

                    let keysAdded = 0;

                    // Find missing keys
                    for (const [key, value] of Object.entries(enFlat)) {
                        if (!(key in localeFlat)) {
                            // Add the key with English value as placeholder
                            setNestedValue(localeData, key, value);
                            keysAdded++;
                        }
                    }

                    if (keysAdded > 0) {
                        // Write updated locale file
                        await fs.writeFile(localePath, JSON.stringify(localeData, null, 2), 'utf8');
                        results[localeCode] = keysAdded;
                        totalKeysAdded += keysAdded;
                        localesUpdated++;
                    }
                } catch (error) {
                    console.error(`Error processing ${file}:`, error.message);
                    results[localeCode] = { error: error.message };
                }
            }

            res.json({
                success: true,
                message: `Synced translations: added ${totalKeysAdded} missing keys across ${localesUpdated} locales`,
                stats: {
                    totalKeys,
                    keysAdded: totalKeysAdded,
                    localesUpdated
                },
                results
            });

        } catch (error) {
            console.error('Error syncing translations:', error);
            res.status(500).json({ error: error.message });
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
                },
                {
                    id: 'scan-bad-keys',
                    name: 'Scan Bad Keys',
                    description: 'Scan for keys that don\'t follow proper snake_case naming convention',
                    command: 'api',
                    category: 'maintenance'
                },
                {
                    id: 'scan-datatable-translations',
                    name: 'Scan DataTable Translations',
                    description: 'Scan all admin pages to find DataTable title/description values for translation',
                    command: 'api',
                    category: 'extraction',
                    icon: 'table'
                },
                {
                    id: 'apply-datatable-translations',
                    name: 'Apply DataTable Translations',
                    description: 'Add scanned DataTable translations to locale files and optionally update source files',
                    command: 'api',
                    category: 'extraction',
                    icon: 'translate'
                }
            ]
        });
    });

    // ========================================================================
    // NAMESPACE OPTIMIZATION ROUTES
    // (Must be before the /:tool wildcard route)
    // ========================================================================

    // Cache for analysis results (to avoid re-analyzing for apply)
    let cachedAnalysis = null;

    /**
     * Analyze namespaces for optimization opportunities
     */
    router.get('/analyze-namespaces', async (req, res) => {
        try {
            const { NamespaceOptimizer } = require('../services/namespace-optimizer.service');
            const optimizer = new NamespaceOptimizer(path.join(__dirname, '../../../..'));

            const results = await optimizer.analyze();
            cachedAnalysis = results; // Cache for apply

            res.json(results);
        } catch (error) {
            console.error('Namespace analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Apply selected namespace optimizations
     */
    router.post('/apply-namespace-optimizations', async (req, res) => {
        try {
            const { optimizationIds } = req.body;

            if (!optimizationIds || !Array.isArray(optimizationIds) || optimizationIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No optimization IDs provided'
                });
            }

            if (!cachedAnalysis) {
                return res.status(400).json({
                    success: false,
                    error: 'Please run analysis first'
                });
            }

            const { NamespaceOptimizer } = require('../services/namespace-optimizer.service');
            const optimizer = new NamespaceOptimizer(path.join(__dirname, '../../../..'));

            const results = await optimizer.applyOptimizations(optimizationIds, cachedAnalysis);

            // Clear cache after successful apply
            cachedAnalysis = null;

            res.json(results);
        } catch (error) {
            console.error('Namespace optimization error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Fix useTranslations() calls in source files
     */
    router.post('/fix-usetranslations', async (req, res) => {
        try {
            const { NamespaceOptimizer } = require('../services/namespace-optimizer.service');
            const optimizer = new NamespaceOptimizer(path.join(__dirname, '../../../..'));

            const results = await optimizer.fixUseTranslations();

            res.json(results);
        } catch (error) {
            console.error('Fix useTranslations error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Fix wrong namespace usage - remove namespace prefixes from t() calls
     * Fixes patterns like t('ext_copy-trading.days_active') → t('days_active')
     */
    router.post('/fix-namespace-prefixes', async (req, res) => {
        try {
            const { NamespaceOptimizer } = require('../services/namespace-optimizer.service');
            const optimizer = new NamespaceOptimizer(path.join(__dirname, '../../../..'));

            const results = await optimizer.fixNamespacePrefixes();

            res.json(results);
        } catch (error) {
            console.error('Fix namespace prefixes error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Run a tool (catch-all for legacy tools - must be AFTER specific routes)
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