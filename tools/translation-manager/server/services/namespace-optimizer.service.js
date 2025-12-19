/**
 * Namespace Optimizer Service
 *
 * A COMPLETE translation fixer that:
 * 1. Analyzes ALL source files and ALL message files
 * 2. Finds ALL issues (broken calls, missing keys, duplicates, wrong namespaces)
 * 3. Plans ALL fixes before making any changes
 * 4. Applies ALL fixes atomically (JSON + source files together)
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');

class NamespaceOptimizer {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.messagesDir = path.join(projectRoot, 'frontend', 'messages');
        this.frontendDir = path.join(projectRoot, 'frontend');
        this.messages = {};
        this.locales = [];
    }

    /**
     * Load all locale files
     * IMPORTANT: English is always used as the source of truth for analysis.
     * Changes are then synced to other locales.
     */
    async loadMessages() {
        const files = await fs.readdir(this.messagesDir);
        this.locales = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

        // Ensure English is always first (source of truth)
        const enIndex = this.locales.indexOf('en');
        if (enIndex === -1) {
            throw new Error('English locale (en.json) not found in messages directory');
        }
        if (enIndex !== 0) {
            // Move English to the front
            this.locales.splice(enIndex, 1);
            this.locales.unshift('en');
        }

        for (const locale of this.locales) {
            const filePath = path.join(this.messagesDir, `${locale}.json`);
            const content = await fs.readFile(filePath, 'utf8');
            this.messages[locale] = JSON.parse(content);
        }

        return this.locales;
    }

    /**
     * Normalize a value for comparison
     */
    normalizeValue(value) {
        return value
            .trim()
            .toLowerCase()
            .replace(/[\s\u00A0]+/g, ' ')
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"');
    }

    /**
     * Get namespace hierarchy for consolidation
     */
    findCommonParent(namespaces) {
        if (namespaces.length === 0) return 'common';
        if (namespaces.length === 1) return namespaces[0];

        const roots = new Set(namespaces.map(ns => ns.split('_')[0]));

        if (roots.size === 1) {
            const root = Array.from(roots)[0];
            const parts = namespaces.map(ns => ns.split('_'));
            const minDepth = Math.min(...parts.map(p => p.length));

            for (let depth = minDepth; depth > 0; depth--) {
                const prefixes = new Set(parts.map(p => p.slice(0, depth).join('_')));
                if (prefixes.size === 1) {
                    return Array.from(prefixes)[0];
                }
            }
            return root;
        }

        return 'common';
    }

    /**
     * Build comprehensive maps of all translations
     * Uses English (locales[0]) as the source of truth
     */
    buildTranslationMaps() {
        // English is always locales[0] - see loadMessages()
        const primaryLocale = this.locales[0]; // 'en'
        const messages = this.messages[primaryLocale];

        // Map: namespace -> Set of keys
        const keyInNamespace = new Map();
        // Map: key -> Set of namespaces containing it
        const keyToNamespaces = new Map();
        // Map: key -> value (from primary locale)
        const keyToValue = new Map();

        for (const [ns, nsData] of Object.entries(messages)) {
            if (typeof nsData !== 'object' || nsData === null) continue;

            keyInNamespace.set(ns, new Set(Object.keys(nsData)));

            for (const [key, value] of Object.entries(nsData)) {
                if (typeof value !== 'string') continue;

                if (!keyToNamespaces.has(key)) {
                    keyToNamespaces.set(key, new Set());
                }
                keyToNamespaces.get(key).add(ns);
                keyToValue.set(`${ns}.${key}`, value);
            }
        }

        return { keyInNamespace, keyToNamespaces, keyToValue };
    }

    /**
     * COMPLETE ANALYSIS - Analyze everything and find all issues
     * Uses English as the source of truth for all analysis
     */
    async analyze() {
        await this.loadMessages();

        // English is always locales[0] - see loadMessages()
        const primaryLocale = this.locales[0]; // 'en'
        const messages = this.messages[primaryLocale];
        const namespaces = Object.keys(messages);

        const { keyInNamespace, keyToNamespaces, keyToValue } = this.buildTranslationMaps();

        // ===== PART 1: Find duplicate values across namespaces =====
        const valueToLocations = new Map();
        let totalKeys = 0;

        for (const ns of namespaces) {
            const nsData = messages[ns];
            if (typeof nsData !== 'object' || nsData === null) continue;

            for (const [key, value] of Object.entries(nsData)) {
                if (typeof value !== 'string') continue;
                totalKeys++;

                const normalizedValue = this.normalizeValue(value);
                if (!valueToLocations.has(normalizedValue)) {
                    valueToLocations.set(normalizedValue, []);
                }
                valueToLocations.get(normalizedValue).push({
                    namespace: ns,
                    key,
                    originalValue: value
                });
            }
        }

        // Find duplicates
        const optimizations = [];
        let duplicateValueCount = 0;
        let potentialSavings = 0;

        for (const [normalizedValue, locations] of valueToLocations) {
            const uniqueNamespaces = [...new Set(locations.map(l => l.namespace))];
            if (uniqueNamespaces.length <= 1) continue;

            duplicateValueCount++;
            potentialSavings += locations.length - 1;

            const targetNamespace = this.findCommonParent(uniqueNamespaces);

            let suggestedAction = 'deduplicate';
            if (targetNamespace === 'common') {
                suggestedAction = 'move_to_common';
            } else if (targetNamespace !== uniqueNamespaces[0]) {
                suggestedAction = 'move_to_parent';
            }

            const keyCounts = {};
            for (const loc of locations) {
                keyCounts[loc.key] = (keyCounts[loc.key] || 0) + 1;
            }
            const sortedKeys = Object.entries(keyCounts)
                .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length);
            const targetKey = sortedKeys[0][0];

            optimizations.push({
                id: `opt_${Buffer.from(normalizedValue).toString('base64').substring(0, 20)}`,
                value: locations[0].originalValue,
                normalizedValue,
                locations,
                targetNamespace,
                targetKey,
                suggestedAction,
                savings: locations.length - 1
            });
        }

        optimizations.sort((a, b) => b.savings - a.savings);

        // ===== PART 2: Find ALL broken t() calls in source files =====
        const files = await glob([
            'frontend/app/**/*.tsx',
            'frontend/app/**/*.ts',
            'frontend/components/**/*.tsx',
            'frontend/components/**/*.ts',
        ], {
            ignore: ['**/node_modules/**'],
            cwd: this.projectRoot
        });

        const brokenCalls = [];
        const fileIssues = new Map(); // file -> list of issues

        for (const file of files) {
            const filePath = path.join(this.projectRoot, file);
            const issues = await this.analyzeSourceFile(filePath, keyInNamespace, keyToNamespaces);

            if (issues.length > 0) {
                fileIssues.set(file, issues);
                brokenCalls.push(...issues.map(i => ({ ...i, file })));
            }
        }

        // ===== PART 3: Build namespace stats =====
        const namespaceStats = namespaces.map(ns => {
            const nsData = messages[ns];
            const keyCount = typeof nsData === 'object' ? Object.keys(nsData).length : 0;

            let duplicates = 0;
            if (typeof nsData === 'object') {
                for (const [key, value] of Object.entries(nsData)) {
                    if (typeof value !== 'string') continue;
                    const normalized = this.normalizeValue(value);
                    const locations = valueToLocations.get(normalized);
                    if (locations && locations.length > 1) {
                        duplicates++;
                    }
                }
            }

            return { name: ns, keyCount, duplicates };
        }).sort((a, b) => b.keyCount - a.keyCount);

        // Count broken calls by type
        const issuesByType = {
            wrong_namespace: brokenCalls.filter(c => c.type === 'wrong_namespace').length,
            missing_key: brokenCalls.filter(c => c.type === 'missing_key').length,
            undeclared_variable: brokenCalls.filter(c => c.type === 'undeclared_variable').length
        };

        return {
            success: true,
            stats: {
                namespaceCount: namespaces.length,
                totalKeys,
                duplicateValueCount,
                potentialSavings,
                brokenCallsCount: brokenCalls.length,
                filesWithIssues: fileIssues.size,
                issuesByType
            },
            namespaces: namespaceStats,
            optimizations,
            brokenCalls,
            fileIssues: Object.fromEntries(fileIssues)
        };
    }

    /**
     * Analyze a single source file for broken t() calls
     * Works with multi-function files by tracking each function's scope
     */
    async analyzeSourceFile(filePath, keyInNamespace, keyToNamespaces) {
        let content;
        try {
            content = await fs.readFile(filePath, 'utf8');
        } catch (e) {
            return [];
        }

        // Check for either client (useTranslations) or server (getTranslations) components
        if (!content.includes('useTranslations') && !content.includes('getTranslations')) {
            return [];
        }

        const issues = [];

        // Find all translation declarations with their positions (both client and server)
        const clientDeclRegex = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
        const serverDeclRegex = /const\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
        const declarations = [];
        let declMatch;

        while ((declMatch = clientDeclRegex.exec(content)) !== null) {
            declarations.push({
                varName: declMatch[1],
                namespace: declMatch[2],
                index: declMatch.index,
                endIndex: declMatch.index + declMatch[0].length
            });
        }

        while ((declMatch = serverDeclRegex.exec(content)) !== null) {
            declarations.push({
                varName: declMatch[1],
                namespace: declMatch[2],
                index: declMatch.index,
                endIndex: declMatch.index + declMatch[0].length
            });
        }

        if (declarations.length === 0) {
            return [];
        }

        // Find all function boundaries to determine scope
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{?|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*\{/g;
        const functions = [];
        let funcMatch;

        while ((funcMatch = functionRegex.exec(content)) !== null) {
            const name = funcMatch[1] || funcMatch[2] || funcMatch[3];
            functions.push({
                name,
                startIndex: funcMatch.index,
                // We'll find the end by brace matching later if needed
            });
        }

        // For each function, find its declarations
        // Simple approach: each declaration belongs to the function that starts before it
        // and no other function starts between them
        const getDeclsForPosition = (position) => {
            // Find which function this position is in
            let currentFunc = null;
            for (const func of functions) {
                if (func.startIndex < position) {
                    currentFunc = func;
                } else {
                    break;
                }
            }

            // Get declarations that belong to this function
            const funcDecls = declarations.filter(d => {
                if (!currentFunc) return true; // Top level
                // Declaration is after function start
                if (d.index < currentFunc.startIndex) return false;
                // Check no other function between this function and the declaration
                const funcsBetween = functions.filter(f =>
                    f.startIndex > currentFunc.startIndex && f.startIndex < d.index
                );
                return funcsBetween.length === 0;
            });

            return funcDecls;
        };

        // Build varName -> namespace map for the whole file (for simple cases)
        const globalVarToNs = new Map();
        for (const decl of declarations) {
            globalVarToNs.set(decl.varName, decl.namespace);
        }

        // Helper to get the correct namespace for a variable at a given position
        // This handles scoped variable shadowing
        const getNamespaceForVarAtPosition = (varName, position) => {
            // Find the most recent declaration of this variable before the position
            // that is in the same or parent scope
            let bestDecl = null;
            for (const decl of declarations) {
                if (decl.varName !== varName) continue;
                if (decl.index > position) continue; // Declaration must be before usage

                // Check if this declaration is in scope for the position
                // Simple heuristic: find which function contains the call
                let callFunction = null;
                for (const func of functions) {
                    if (func.startIndex < position) {
                        callFunction = func;
                    }
                }

                // Find which function contains the declaration
                let declFunction = null;
                for (const func of functions) {
                    if (func.startIndex < decl.index) {
                        declFunction = func;
                    }
                }

                // Declaration is in scope if:
                // 1. Both are at top level (no function), or
                // 2. Declaration is at top level (can be used anywhere), or
                // 3. Declaration is in the same function as the call
                const declAtTopLevel = !declFunction || declarations.some(d =>
                    d.index < decl.index && !functions.some(f => f.startIndex < d.index && f.startIndex < decl.index)
                );

                // Simpler approach: the closest declaration before position wins
                // This works for most cases where variables shadow each other in nested scopes
                if (!bestDecl || decl.index > bestDecl.index) {
                    bestDecl = decl;
                }
            }

            return bestDecl ? bestDecl.namespace : null;
        };

        // Find all t() calls
        const callRegex = /\b(t[A-Z]\w*|t)\s*\(\s*["']([^"']+)["']/g;
        let callMatch;

        while ((callMatch = callRegex.exec(content)) !== null) {
            const varName = callMatch[1];
            let key = callMatch[2];
            const callIndex = callMatch.index;

            // Check if key contains namespace prefix (e.g., "ext_copy-trading.days_active")
            // This is WRONG usage - the namespace should only be in useTranslations(), not in t() calls
            let keyHasNamespacePrefix = false;
            let extractedKey = key;
            let prefixedNamespace = null;

            if (key.includes('.')) {
                const dotIndex = key.indexOf('.');
                const possibleNamespace = key.substring(0, dotIndex);
                const possibleKey = key.substring(dotIndex + 1);

                // Check if this looks like a namespace.key pattern
                if (possibleNamespace && possibleKey && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(possibleNamespace)) {
                    // Check if this namespace actually exists in our translation files
                    if (keyInNamespace.has(possibleNamespace)) {
                        keyHasNamespacePrefix = true;
                        extractedKey = possibleKey;
                        prefixedNamespace = possibleNamespace;
                    }
                }
            }

            // If key has namespace prefix, this is always wrong - report it FIRST
            if (keyHasNamespacePrefix) {
                // Check if the key exists in the prefixed namespace
                const keysInPrefixedNs = keyInNamespace.get(prefixedNamespace);
                if (keysInPrefixedNs && keysInPrefixedNs.has(extractedKey)) {
                    // Key exists - wrong usage: namespace should not be in t() call
                    const namespace = getNamespaceForVarAtPosition(varName, callIndex);
                    issues.push({
                        type: 'wrong_namespace',
                        varName,
                        key: extractedKey,
                        originalKey: key,
                        hasNamespacePrefix: true,
                        currentNamespace: namespace,
                        correctNamespace: prefixedNamespace,
                        availableNamespaces: [prefixedNamespace],
                        index: callIndex,
                        suggestion: `Remove namespace prefix - use t("${extractedKey}") without "${prefixedNamespace}."`
                    });
                } else {
                    // Key doesn't exist even with prefix
                    issues.push({
                        type: 'missing_key',
                        varName,
                        key: extractedKey,
                        originalKey: key,
                        hasNamespacePrefix: true,
                        namespace: prefixedNamespace,
                        index: callIndex
                    });
                }
                continue;
            }

            // Get the namespace this variable points to (considering scope)
            const namespace = getNamespaceForVarAtPosition(varName, callIndex);

            if (!namespace) {
                // Variable not declared - this is an issue
                const searchKey = key;
                const namespacesWithKey = keyToNamespaces.get(searchKey);
                if (namespacesWithKey && namespacesWithKey.size > 0) {
                    issues.push({
                        type: 'undeclared_variable',
                        varName,
                        key: searchKey,
                        originalKey: key,
                        hasNamespacePrefix: false,
                        index: callIndex,
                        availableNamespaces: Array.from(namespacesWithKey),
                        suggestedNamespace: this.pickBestNamespace(namespacesWithKey, globalVarToNs)
                    });
                }
                continue;
            }

            // Check if key exists in the namespace
            const keysInNs = keyInNamespace.get(namespace);
            if (!keysInNs || !keysInNs.has(key)) {
                // Key doesn't exist in this namespace - broken call
                const namespacesWithKey = keyToNamespaces.get(key);

                if (!namespacesWithKey || namespacesWithKey.size === 0) {
                    // Key doesn't exist anywhere
                    issues.push({
                        type: 'missing_key',
                        varName,
                        key,
                        namespace,
                        index: callIndex
                    });
                } else {
                    // Key exists in different namespace(s)
                    const targetNs = this.pickBestNamespace(namespacesWithKey, globalVarToNs);
                    issues.push({
                        type: 'wrong_namespace',
                        varName,
                        key,
                        currentNamespace: namespace,
                        correctNamespace: targetNs,
                        availableNamespaces: Array.from(namespacesWithKey),
                        index: callIndex
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Pick the best namespace for a key
     */
    pickBestNamespace(namespacesWithKey, existingVarToNs) {
        const nsArray = Array.from(namespacesWithKey);
        const existingNamespaces = new Set(existingVarToNs.values());

        // First: prefer namespace already declared in file
        for (const ns of nsArray) {
            if (existingNamespaces.has(ns)) {
                return ns;
            }
        }

        // Priority order
        if (namespacesWithKey.has('common')) return 'common';
        if (namespacesWithKey.has('ext')) return 'ext';
        if (namespacesWithKey.has('dashboard')) return 'dashboard';

        // Prefer parent namespaces
        const sorted = nsArray.sort((a, b) => a.split('_').length - b.split('_').length);
        return sorted[0];
    }

    /**
     * Get translator variable name from namespace
     */
    getTranslatorVarName(namespace) {
        if (namespace === 'common') return 'tCommon';
        if (namespace === 'ext') return 'tExt';
        if (namespace === 'dashboard') return 'tDashboard';

        const parts = namespace.split(/[-_]/);
        const camelCase = parts.map((p, i) =>
            i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
        ).join('');
        return 't' + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }

    /**
     * Apply selected optimizations (JSON + source code updates)
     *
     * This function:
     * 1. Updates JSON translation files (moves/deletes keys)
     * 2. Updates source code references to use the new namespace/key
     */
    async applyOptimizations(optimizationIds, analysisResults) {
        if (!analysisResults || !analysisResults.optimizations) {
            throw new Error('Analysis results required');
        }

        await this.loadMessages();

        const selectedOpts = analysisResults.optimizations.filter(
            opt => optimizationIds.includes(opt.id)
        );

        if (selectedOpts.length === 0) {
            throw new Error('No valid optimizations selected');
        }

        let keysMoved = 0;
        let keysDeleted = 0;
        const changes = [];

        // Track key migrations for source code updates
        // Map: "oldNamespace.oldKey" -> { targetNamespace, targetKey }
        const keyMigrations = new Map();

        for (const opt of selectedOpts) {
            const { targetNamespace, targetKey, value, locations } = opt;

            // Add key to target namespace in all locales
            for (const locale of this.locales) {
                if (!this.messages[locale][targetNamespace]) {
                    this.messages[locale][targetNamespace] = {};
                }

                if (!this.messages[locale][targetNamespace][targetKey]) {
                    let translatedValue = value;
                    for (const loc of locations) {
                        if (this.messages[locale][loc.namespace]?.[loc.key]) {
                            translatedValue = this.messages[locale][loc.namespace][loc.key];
                            break;
                        }
                    }
                    this.messages[locale][targetNamespace][targetKey] = translatedValue;
                    if (locale === this.locales[0]) {
                        keysMoved++;
                        changes.push(`Added: ${targetNamespace}.${targetKey}`);
                    }
                }
            }

            // Remove from original locations and track migrations
            for (const loc of locations) {
                if (loc.namespace === targetNamespace && loc.key === targetKey) continue;

                // Track this migration for source code updates
                keyMigrations.set(`${loc.namespace}.${loc.key}`, {
                    targetNamespace,
                    targetKey,
                    oldNamespace: loc.namespace,
                    oldKey: loc.key
                });

                for (const locale of this.locales) {
                    if (this.messages[locale][loc.namespace]?.[loc.key]) {
                        delete this.messages[locale][loc.namespace][loc.key];
                        if (locale === this.locales[0]) {
                            keysDeleted++;
                            changes.push(`Removed: ${loc.namespace}.${loc.key}`);
                        }
                    }
                }
            }
        }

        // Save all locale files
        for (const locale of this.locales) {
            const filePath = path.join(this.messagesDir, `${locale}.json`);
            const sortedMessages = {};
            for (const ns of Object.keys(this.messages[locale]).sort()) {
                const nsData = this.messages[locale][ns];
                if (typeof nsData === 'object' && nsData !== null) {
                    sortedMessages[ns] = {};
                    for (const key of Object.keys(nsData).sort()) {
                        sortedMessages[ns][key] = nsData[key];
                    }
                }
            }
            await fs.writeFile(filePath, JSON.stringify(sortedMessages, null, 2), 'utf8');
        }

        // Now update source code references
        let sourceFilesUpdated = 0;
        let sourceCallsFixed = 0;
        const sourceFileChanges = [];

        if (keyMigrations.size > 0) {
            const sourceResult = await this.updateSourceCodeReferences(keyMigrations);
            sourceFilesUpdated = sourceResult.filesUpdated;
            sourceCallsFixed = sourceResult.callsFixed;
            sourceFileChanges.push(...sourceResult.changes);
        }

        return {
            success: true,
            stats: {
                keysMoved,
                keysDeleted,
                localesUpdated: this.locales.length,
                sourceFilesUpdated,
                sourceCallsFixed
            },
            changes: [...changes, ...sourceFileChanges]
        };
    }

    /**
     * Update source code references after key migrations
     * @param {Map} keyMigrations - Map of "oldNamespace.oldKey" -> { targetNamespace, targetKey }
     */
    async updateSourceCodeReferences(keyMigrations) {
        const files = await glob([
            'frontend/app/**/*.tsx',
            'frontend/app/**/*.ts',
            'frontend/components/**/*.tsx',
            'frontend/components/**/*.ts',
        ], {
            ignore: ['**/node_modules/**'],
            cwd: this.projectRoot
        });

        let filesUpdated = 0;
        let callsFixed = 0;
        const changes = [];

        for (const file of files) {
            const filePath = path.join(this.projectRoot, file);
            let content;
            try {
                content = await fs.readFile(filePath, 'utf8');
            } catch (e) {
                continue;
            }

            const originalContent = content;
            let fileCallsFixed = 0;

            // For each migration, find and replace the old calls
            for (const [oldFullKey, migration] of keyMigrations) {
                const { targetNamespace, targetKey, oldNamespace, oldKey } = migration;

                // Get the old and new variable names
                const oldVarName = this.getTranslatorVarName(oldNamespace);
                const newVarName = this.getTranslatorVarName(targetNamespace);

                // Pattern to match: oldVarName("oldKey") or oldVarName('oldKey')
                const callPattern = new RegExp(
                    `\\b${this.escapeRegExp(oldVarName)}\\s*\\(\\s*["']${this.escapeRegExp(oldKey)}["']\\s*\\)`,
                    'g'
                );

                const matches = content.match(callPattern);
                if (matches && matches.length > 0) {
                    // Replace with new variable and key
                    content = content.replace(callPattern, `${newVarName}("${targetKey}")`);
                    fileCallsFixed += matches.length;
                }
            }

            if (content !== originalContent) {
                // Check if we need to add new translator declarations
                content = await this.ensureTranslatorDeclarations(content, keyMigrations);

                await fs.writeFile(filePath, content, 'utf8');
                filesUpdated++;
                callsFixed += fileCallsFixed;
                changes.push(`Updated ${file}: ${fileCallsFixed} call(s) fixed`);
            }
        }

        return { filesUpdated, callsFixed, changes };
    }

    /**
     * Ensure translator declarations exist for the target namespaces used in the file
     */
    async ensureTranslatorDeclarations(content, keyMigrations) {
        // Get unique target namespaces that were migrated to
        const targetNamespaces = new Set();
        for (const migration of keyMigrations.values()) {
            targetNamespaces.add(migration.targetNamespace);
        }

        // Check if this is a server component
        const trimmed = content.trim();
        const isServerComponent = !trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'");

        for (const ns of targetNamespaces) {
            const varName = this.getTranslatorVarName(ns);

            // Check if this variable is used in the content
            const usagePattern = new RegExp(`\\b${this.escapeRegExp(varName)}\\s*\\(`, 'g');
            if (!usagePattern.test(content)) {
                continue; // This namespace isn't used in this file
            }

            // Check if declaration already exists
            const clientDeclPattern = new RegExp(`const\\s+${this.escapeRegExp(varName)}\\s*=\\s*useTranslations\\s*\\(`);
            const serverDeclPattern = new RegExp(`const\\s+${this.escapeRegExp(varName)}\\s*=\\s*(?:await\\s+)?getTranslations\\s*\\(`);

            if (clientDeclPattern.test(content) || serverDeclPattern.test(content)) {
                continue; // Declaration already exists
            }

            // Need to add declaration - find where to insert it
            // Look for existing useTranslations/getTranslations declarations
            const existingDeclPattern = isServerComponent
                ? /const\s+\w+\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["'][^"']+["']\s*\)\s*;?/g
                : /const\s+\w+\s*=\s*useTranslations\s*\(\s*["'][^"']+["']\s*\)\s*;?/g;

            const matches = [...content.matchAll(existingDeclPattern)];
            if (matches.length > 0) {
                // Insert after the last existing declaration
                const lastMatch = matches[matches.length - 1];
                const insertPos = lastMatch.index + lastMatch[0].length;

                const newDecl = isServerComponent
                    ? `\n  const ${varName} = await getTranslations("${ns}");`
                    : `\n  const ${varName} = useTranslations("${ns}");`;

                content = content.slice(0, insertPos) + newDecl + content.slice(insertPos);
            }
        }

        return content;
    }

    /**
     * Escape special regex characters in a string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Fix broken t() calls in source files
     * This method ONLY fixes calls where the key exists in a DIFFERENT namespace.
     * Missing keys are NOT auto-added - use the separate scripts:
     *   - scripts/find-missing-keys.js - to find all missing keys
     *   - scripts/generate-missing-translations.js - to generate suggested translations
     *   - scripts/import-translations.js - to import approved translations
     */
    async fixUseTranslations() {
        await this.loadMessages();

        const { keyInNamespace, keyToNamespaces } = this.buildTranslationMaps();

        const files = await glob([
            'frontend/app/**/*.tsx',
            'frontend/app/**/*.ts',
            'frontend/components/**/*.tsx',
            'frontend/components/**/*.ts',
        ], {
            ignore: ['**/node_modules/**'],
            cwd: this.projectRoot
        });

        let fixedFiles = 0;
        let totalFixedCalls = 0;
        let skippedMissingKeys = 0;
        const updatedFiles = [];
        const skippedReasons = {};

        for (const file of files) {
            const result = await this.fixSourceFile(
                path.join(this.projectRoot, file),
                keyInNamespace,
                keyToNamespaces
            );

            if (result.updated) {
                updatedFiles.push(file);
                fixedFiles++;
                totalFixedCalls += result.fixedCalls || 0;
            } else if (result.reason) {
                skippedReasons[result.reason] = (skippedReasons[result.reason] || 0) + 1;
            }
            skippedMissingKeys += result.skippedMissingKeys || 0;
        }

        return {
            success: true,
            stats: {
                fixedFiles,
                totalFixedCalls,
                skippedMissingKeys,
                skipped: files.length - fixedFiles,
                skippedReasons
            },
            updatedFiles,
            message: skippedMissingKeys > 0
                ? `${skippedMissingKeys} calls with missing keys were skipped. Run the translation scripts to add them properly.`
                : null
        };
    }

    /**
     * Find function boundaries in content
     * Returns array of { name, startIndex, endIndex, bodyStart }
     * Handles JSX/TSX content with embedded expressions, comments, and strings
     */
    findFunctionBoundaries(content) {
        const functions = [];
        // Match function declarations, arrow functions, and HOC-wrapped components
        // Pattern 1: function name(...) {
        // Pattern 2: const name = (...) => {
        // Pattern 3: const name = function(...) {
        // Pattern 4: const name = memo((...) => { (and forwardRef, etc.)
        const funcRegex = /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{|(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=>{]+)?\s*=>\s*\{|(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)\s*\{|(?:export\s+)?const\s+(\w+)\s*=\s*(?:memo|forwardRef|React\.memo|React\.forwardRef)\s*\(\s*(?:\([^)]*\)\s*(?::\s*[^=>{]+)?\s*=>\s*\{|function\s*\([^)]*\)\s*\{)/g;

        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const name = match[1] || match[2] || match[3] || match[4];
            const startIndex = match.index;
            const bodyStart = content.indexOf('{', startIndex + match[0].length - 1);

            if (bodyStart === -1) continue;

            // Find matching closing brace, accounting for strings, template literals, and comments
            let braceCount = 1;
            let endIndex = bodyStart + 1;
            let inString = false;
            let stringChar = '';
            let inLineComment = false;
            let inBlockComment = false;

            while (braceCount > 0 && endIndex < content.length) {
                const char = content[endIndex];
                const prevChar = endIndex > 0 ? content[endIndex - 1] : '';
                const nextChar = endIndex < content.length - 1 ? content[endIndex + 1] : '';

                // Handle line comment end
                if (inLineComment) {
                    if (char === '\n' || char === '\r') {
                        inLineComment = false;
                    }
                    endIndex++;
                    continue;
                }

                // Handle block comment end
                if (inBlockComment) {
                    if (char === '*' && nextChar === '/') {
                        inBlockComment = false;
                        endIndex += 2;
                        continue;
                    }
                    endIndex++;
                    continue;
                }

                // Not in any comment
                if (!inString) {
                    // Check for comment start
                    if (char === '/' && nextChar === '/') {
                        inLineComment = true;
                        endIndex += 2;
                        continue;
                    }
                    if (char === '/' && nextChar === '*') {
                        inBlockComment = true;
                        endIndex += 2;
                        continue;
                    }

                    // Handle string boundaries
                    // For single quotes, only treat as string start if preceded by JS expression characters
                    // This avoids treating apostrophes in JSX text (like "you're") as string delimiters
                    const isJsExpressionContext = /[=(:,\[{!&|+\-*\s]/.test(prevChar) || prevChar === '';
                    if (char === '"' || char === '`') {
                        // Double quotes and backticks are always string delimiters
                        if (prevChar !== '\\') {
                            inString = true;
                            stringChar = char;
                        }
                    } else if (char === "'" && prevChar !== '\\' && isJsExpressionContext) {
                        // Single quotes only in JS expression context
                        inString = true;
                        stringChar = char;
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                } else {
                    // Inside a string - check for end
                    if (char === stringChar && prevChar !== '\\') {
                        inString = false;
                        stringChar = '';
                    }
                }
                endIndex++;
            }

            functions.push({ name, startIndex, endIndex, bodyStart });
        }

        // Sort by startIndex
        functions.sort((a, b) => a.startIndex - b.startIndex);

        return functions;
    }

    /**
     * Find which function contains a given position
     */
    getFunctionAtPosition(functions, position) {
        for (const func of functions) {
            if (position >= func.bodyStart && position < func.endIndex) {
                return func;
            }
        }
        return null; // Top level
    }

    /**
     * Fix a single source file - comprehensive per-function approach
     *
     * For each function/component:
     * 1. Find all translation calls (t(), tCommon(), etc.)
     * 2. Determine which namespaces are needed based on the keys used
     * 3. Check existing declarations
     * 4. Add missing declarations
     * 5. Remove unused declarations
     * 6. Fix variable names in calls to match the correct namespace
     */
    async fixSourceFile(filePath, keyInNamespace, keyToNamespaces) {
        let content;
        try {
            content = await fs.readFile(filePath, 'utf8');
        } catch (e) {
            return { updated: false, reason: 'read-error', skippedMissingKeys: 0 };
        }

        const originalContent = content;

        // Check if file has any translation calls (t(), tCommon(), etc.)
        // Note: File might use t() calls without having useTranslations declared (undeclared variable issue)
        const hasTranslationCalls = /\b(t[A-Z]\w*|t)\s*\(\s*["'][^"']+["']/.test(content);
        const hasTranslationImports = content.includes('useTranslations') || content.includes('getTranslations');

        if (!hasTranslationCalls && !hasTranslationImports) {
            return { updated: false, reason: 'no-translations', skippedMissingKeys: 0 };
        }

        // Detect if this is a server component (no "use client" directive)
        const trimmed = content.trim();
        const isServerComponent = !trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'");

        // Find all function boundaries
        const functions = this.findFunctionBoundaries(content);

        // Find all existing declarations (both client useTranslations and server getTranslations)
        // Client: const t = useTranslations("namespace")
        // Server: const t = await getTranslations("namespace")
        const clientDeclRegex = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
        const serverDeclRegex = /const\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
        const declarations = [];
        let declMatch;

        while ((declMatch = clientDeclRegex.exec(content)) !== null) {
            const func = this.getFunctionAtPosition(functions, declMatch.index);
            declarations.push({
                varName: declMatch[1],
                namespace: declMatch[2],
                index: declMatch.index,
                fullMatch: declMatch[0],
                endIndex: declMatch.index + declMatch[0].length,
                functionName: func ? func.name : null,
                isServer: false
            });
        }

        while ((declMatch = serverDeclRegex.exec(content)) !== null) {
            const func = this.getFunctionAtPosition(functions, declMatch.index);
            declarations.push({
                varName: declMatch[1],
                namespace: declMatch[2],
                index: declMatch.index,
                fullMatch: declMatch[0],
                endIndex: declMatch.index + declMatch[0].length,
                functionName: func ? func.name : null,
                isServer: true
            });
        }

        // Find all translation calls
        const callRegex = /\b(t[A-Z]\w*|t)\s*\(\s*(["'])([^"']+)\2/g;
        const calls = [];
        let callMatch;

        while ((callMatch = callRegex.exec(content)) !== null) {
            const func = this.getFunctionAtPosition(functions, callMatch.index);
            calls.push({
                varName: callMatch[1],
                quote: callMatch[2],
                key: callMatch[3],
                index: callMatch.index,
                fullMatch: callMatch[0],
                functionName: func ? func.name : null
            });
        }

        if (calls.length === 0) {
            return { updated: false, reason: 'no-calls', skippedMissingKeys: 0 };
        }

        // Build a map of function -> calls in that function
        const callsByFunction = new Map();
        for (const call of calls) {
            const funcKey = call.functionName || '__top_level__';
            if (!callsByFunction.has(funcKey)) {
                callsByFunction.set(funcKey, []);
            }
            callsByFunction.get(funcKey).push(call);
        }

        // Build a map of function -> declarations in that function
        const declsByFunction = new Map();
        for (const decl of declarations) {
            const funcKey = decl.functionName || '__top_level__';
            if (!declsByFunction.has(funcKey)) {
                declsByFunction.set(funcKey, []);
            }
            declsByFunction.get(funcKey).push(decl);
        }

        // Process each function to determine needed namespaces
        const functionAnalysis = new Map(); // funcKey -> { neededNamespaces, existingDecls, callFixes }
        let skippedMissingKeys = 0;

        for (const [funcKey, funcCalls] of callsByFunction) {
            const allDecls = declsByFunction.get(funcKey) || [];
            const neededNamespaces = new Map(); // namespace -> { varName, keys }
            const callFixes = [];

            // Find the earliest call position in this function
            const earliestCallIndex = Math.min(...funcCalls.map(c => c.index));

            // Only consider declarations that come BEFORE the earliest call
            // Declarations after calls are in nested scopes and don't apply
            const existingDecls = allDecls.filter(d => d.index < earliestCallIndex);

            // Build map of existing var -> namespace for this function
            const existingVarToNs = new Map();
            const existingNsToVar = new Map();
            for (const decl of existingDecls) {
                existingVarToNs.set(decl.varName, decl.namespace);
                existingNsToVar.set(decl.namespace, decl.varName);
            }

            // Analyze each call to determine the correct namespace
            for (const call of funcCalls) {
                const namespacesWithKey = keyToNamespaces.get(call.key);

                if (!namespacesWithKey || namespacesWithKey.size === 0) {
                    // Key doesn't exist anywhere - skip
                    skippedMissingKeys++;
                    continue;
                }

                // Find the correct namespace for this key
                const correctNs = this.pickBestNamespace(namespacesWithKey, existingNsToVar);

                // Use existing variable name if namespace is already declared, otherwise generate one
                let correctVar;
                if (existingNsToVar.has(correctNs)) {
                    correctVar = existingNsToVar.get(correctNs);
                } else {
                    correctVar = this.getTranslatorVarName(correctNs);
                }

                // Track that this namespace is needed with the correct variable name
                if (!neededNamespaces.has(correctNs)) {
                    neededNamespaces.set(correctNs, { varName: correctVar, keys: new Set() });
                }
                neededNamespaces.get(correctNs).keys.add(call.key);

                // Check if the call variable matches the correct variable
                if (call.varName !== correctVar) {
                    callFixes.push({
                        index: call.index,
                        oldText: call.fullMatch,
                        newText: `${correctVar}(${call.quote}${call.key}${call.quote}`,
                        key: call.key,
                        fromVar: call.varName,
                        toVar: correctVar
                    });
                }
            }

            // Determine which declarations to add and remove
            const declsToAdd = [];
            const declsToRemove = [];

            // Find namespaces we need but don't have
            for (const [ns, info] of neededNamespaces) {
                if (!existingNsToVar.has(ns)) {
                    declsToAdd.push({ namespace: ns, varName: info.varName });
                }
            }

            // Find declarations that are no longer needed
            for (const decl of existingDecls) {
                if (!neededNamespaces.has(decl.namespace)) {
                    declsToRemove.push(decl);
                }
            }

            functionAnalysis.set(funcKey, {
                neededNamespaces,
                existingDecls,
                callFixes,
                declsToAdd,
                declsToRemove
            });
        }

        // Check if there's anything to do
        let hasChanges = false;
        for (const analysis of functionAnalysis.values()) {
            if (analysis.callFixes.length > 0 || analysis.declsToAdd.length > 0 || analysis.declsToRemove.length > 0) {
                hasChanges = true;
                break;
            }
        }

        if (!hasChanges) {
            return { updated: false, reason: 'all-correct', skippedMissingKeys };
        }

        // Collect all changes to apply
        const allFixes = [];
        const allInsertions = [];
        const allRemovals = [];

        for (const [funcKey, analysis] of functionAnalysis) {
            // Add call fixes
            allFixes.push(...analysis.callFixes);

            // Add declaration insertions
            if (analysis.declsToAdd.length > 0) {
                const func = funcKey === '__top_level__' ? null : functions.find(f => f.name === funcKey);

                // Find insertion point - after last existing declaration, or at function start
                let insertAfter;
                let indentation;

                if (analysis.existingDecls.length > 0) {
                    // Find the last declaration in this function
                    const lastDecl = analysis.existingDecls.reduce((a, b) => a.index > b.index ? a : b);
                    insertAfter = lastDecl.endIndex;
                    const lineStart = content.lastIndexOf('\n', lastDecl.index) + 1;
                    indentation = content.slice(lineStart, lastDecl.index).match(/^\s*/)?.[0] || '  ';
                } else if (func) {
                    // No existing declarations - insert after function opening brace
                    insertAfter = func.bodyStart + 1;
                    const nextNewline = content.indexOf('\n', func.bodyStart);
                    if (nextNewline !== -1) {
                        const nextLineStart = nextNewline + 1;
                        const nextLineMatch = content.slice(nextLineStart, nextLineStart + 50).match(/^(\s*)/);
                        indentation = nextLineMatch ? nextLineMatch[1] : '  ';
                    } else {
                        indentation = '  ';
                    }
                } else {
                    // Top level - skip
                    continue;
                }

                // Generate declarations with correct syntax based on component type
                const newDecls = analysis.declsToAdd
                    .sort((a, b) => a.namespace.localeCompare(b.namespace))
                    .map(d => {
                        if (isServerComponent) {
                            return `\n${indentation}const ${d.varName} = await getTranslations("${d.namespace}");`;
                        }
                        return `\n${indentation}const ${d.varName} = useTranslations("${d.namespace}");`;
                    })
                    .join('');

                allInsertions.push({
                    index: insertAfter,
                    text: newDecls,
                    functionName: funcKey
                });
            }

            // Add declaration removals
            for (const decl of analysis.declsToRemove) {
                // Find the full line to remove (including newline)
                const lineStart = content.lastIndexOf('\n', decl.index);
                const lineEnd = content.indexOf('\n', decl.endIndex);

                allRemovals.push({
                    start: lineStart !== -1 ? lineStart : decl.index,
                    end: lineEnd !== -1 ? lineEnd : decl.endIndex,
                    decl
                });
            }
        }

        // Sort all operations by index descending to apply from end to start
        // This preserves indices as we make changes

        // First, apply removals (from end to start)
        allRemovals.sort((a, b) => b.start - a.start);
        for (const removal of allRemovals) {
            content = content.slice(0, removal.start) + content.slice(removal.end);

            // Adjust indices for operations that come before this removal
            const removedLength = removal.end - removal.start;
            for (const insertion of allInsertions) {
                if (insertion.index > removal.start) {
                    insertion.index -= removedLength;
                }
            }
            for (const fix of allFixes) {
                if (fix.index > removal.start) {
                    fix.index -= removedLength;
                }
            }
        }

        // Then, apply insertions (from end to start)
        allInsertions.sort((a, b) => b.index - a.index);
        for (const insertion of allInsertions) {
            content = content.slice(0, insertion.index) + insertion.text + content.slice(insertion.index);

            // Adjust fix indices for fixes AFTER this insertion
            const addedLength = insertion.text.length;
            for (const fix of allFixes) {
                if (fix.index > insertion.index) {
                    fix.index += addedLength;
                }
            }
        }

        // Finally, apply call fixes (from end to start)
        allFixes.sort((a, b) => b.index - a.index);
        for (const fix of allFixes) {
            const actualText = content.slice(fix.index, fix.index + fix.oldText.length);
            if (actualText !== fix.oldText) {
                console.warn(`[NamespaceOptimizer] Index mismatch at ${fix.index}: expected "${fix.oldText}" but found "${actualText}"`);
                continue;
            }
            content = content.slice(0, fix.index) + fix.newText + content.slice(fix.index + fix.oldText.length);
        }

        if (content === originalContent) {
            return { updated: false, reason: 'no-change', skippedMissingKeys };
        }

        await fs.writeFile(filePath, content, 'utf8');

        // Collect stats
        const addedNamespaces = new Set();
        const removedNamespaces = new Set();
        for (const analysis of functionAnalysis.values()) {
            for (const d of analysis.declsToAdd) addedNamespaces.add(d.namespace);
            for (const d of analysis.declsToRemove) removedNamespaces.add(d.namespace);
        }

        return {
            updated: true,
            fixedCalls: allFixes.length,
            addedNamespaces: Array.from(addedNamespaces),
            removedNamespaces: Array.from(removedNamespaces),
            addedDeclarations: allInsertions.length,
            removedDeclarations: allRemovals.length,
            skippedMissingKeys
        };
    }

    /**
     * Fix wrong namespace usage - remove namespace prefixes from t() calls
     * Examples:
     *   t('ext_copy-trading.days_active') → t('days_active')
     *   t('common.save') → tCommon('save')
     */
    async fixNamespacePrefixes() {
        await this.loadMessages();

        const { keyInNamespace } = this.buildTranslationMaps();

        const files = await glob([
            'frontend/app/**/*.tsx',
            'frontend/app/**/*.ts',
            'frontend/components/**/*.tsx',
            'frontend/components/**/*.ts',
        ], {
            ignore: ['**/node_modules/**', '**/.next/**'],
            cwd: this.projectRoot
        });

        let fixedFiles = 0;
        let totalFixedCalls = 0;
        const updatedFiles = [];
        const errors = [];

        for (const file of files) {
            const filePath = path.join(this.projectRoot, file);

            try {
                let content = await fs.readFile(filePath, 'utf8');
                const originalContent = content;

                // Check for translation usage
                if (!content.includes('useTranslations') && !content.includes('getTranslations')) {
                    continue;
                }

                // Find all useTranslations/getTranslations declarations
                const clientDeclRegex = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
                const serverDeclRegex = /const\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
                const declarations = new Map(); // varName -> namespace

                let declMatch;
                while ((declMatch = clientDeclRegex.exec(content)) !== null) {
                    declarations.set(declMatch[1], declMatch[2]);
                }
                clientDeclRegex.lastIndex = 0;

                while ((declMatch = serverDeclRegex.exec(content)) !== null) {
                    declarations.set(declMatch[1], declMatch[2]);
                }

                if (declarations.size === 0) continue;

                // Find all t() calls with namespace prefixes
                const callRegex = /\b(t[A-Z]\w*|t)\s*\(\s*["']([^"']+)["']\s*\)/g;
                const fixes = [];
                let callMatch;

                while ((callMatch = callRegex.exec(content)) !== null) {
                    const varName = callMatch[1];
                    const fullKey = callMatch[2];
                    const callIndex = callMatch.index;

                    // Check if key contains a dot (potential namespace prefix)
                    if (!fullKey.includes('.')) continue;

                    const dotIndex = fullKey.indexOf('.');
                    const possibleNamespace = fullKey.substring(0, dotIndex);
                    const keyWithoutPrefix = fullKey.substring(dotIndex + 1);

                    // Validate the namespace pattern
                    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(possibleNamespace)) continue;

                    // Check if this is a valid namespace
                    if (!keyInNamespace.has(possibleNamespace)) continue;

                    // Check if the key exists in the prefixed namespace
                    const keysInPrefixedNs = keyInNamespace.get(possibleNamespace);
                    if (!keysInPrefixedNs || !keysInPrefixedNs.has(keyWithoutPrefix)) continue;

                    // This key has a namespace prefix and the key exists - it's wrong usage!
                    // Now determine which variable to use

                    // Check if this variable is declared
                    const declaredNamespace = declarations.has(varName) ? declarations.get(varName) : null;

                    if (declaredNamespace && possibleNamespace === declaredNamespace) {
                        // Same namespace - just remove the prefix, keep same variable
                        fixes.push({
                            index: callIndex,
                            oldText: callMatch[0],
                            newText: `${varName}("${keyWithoutPrefix}")`,
                            type: 'remove_prefix'
                        });
                    } else {
                        // Different namespace or undeclared variable
                        // Find if there's already a variable declared for this namespace
                        let correctVarName = null;
                        for (const [declVarName, declNs] of declarations) {
                            if (declNs === possibleNamespace) {
                                correctVarName = declVarName;
                                break;
                            }
                        }

                        // If no existing variable for this namespace, generate one
                        if (!correctVarName) {
                            correctVarName = this.getTranslatorVarName(possibleNamespace);
                        }

                        fixes.push({
                            index: callIndex,
                            oldText: callMatch[0],
                            newText: `${correctVarName}("${keyWithoutPrefix}")`,
                            type: 'change_variable',
                            needsDeclaration: !declarations.has(correctVarName),
                            namespace: possibleNamespace,
                            varName: correctVarName
                        });
                    }
                }

                // Check if we need to add any declarations
                const neededDeclarations = new Map(); // namespace -> varName
                for (const fix of fixes) {
                    if (fix.needsDeclaration) {
                        neededDeclarations.set(fix.namespace, fix.varName);
                    }
                }

                // Add missing declarations
                if (neededDeclarations.size > 0) {
                    // Check if this is a server component
                    const trimmed = content.trim();
                    const isServerComponent = !trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'");

                    // Find where to insert - after existing TOP-LEVEL declarations only
                    // We need to exclude declarations inside nested functions
                    const existingDeclPattern = isServerComponent
                        ? /const\s+\w+\s*=\s*(?:await\s+)?getTranslations\s*\(\s*["'][^"']+["']\s*\)\s*;?/g
                        : /const\s+\w+\s*=\s*useTranslations\s*\(\s*["'][^"']+["']\s*\)\s*;?/g;

                    const allMatches = [...content.matchAll(existingDeclPattern)];

                    // Filter to only top-level declarations (those that are part of the component's main body)
                    // Find the main component/function
                    const componentMatch = content.match(/export\s+default\s+function\s+\w+[^{]*\{|function\s+\w+[^{]*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/);
                    let topLevelMatches = allMatches;

                    if (componentMatch && allMatches.length > 0) {
                        const componentStart = componentMatch.index;
                        // Only use declarations that come after component start but before any nested functions
                        topLevelMatches = allMatches.filter(match => {
                            if (match.index < componentStart) return false;

                            // Check if this declaration is inside a nested function
                            // by counting opening braces between component start and this position
                            const textBefore = content.substring(componentStart, match.index);
                            const openBraces = (textBefore.match(/\{/g) || []).length;
                            const closeBraces = (textBefore.match(/\}/g) || []).length;

                            // If we're at depth 1, we're at component level
                            // If depth > 1, we're inside a nested function
                            return (openBraces - closeBraces) === 1;
                        });
                    }

                    if (topLevelMatches.length > 0) {
                        const lastMatch = topLevelMatches[topLevelMatches.length - 1];
                        const insertPos = lastMatch.index + lastMatch[0].length;

                        let newDecls = '';
                        for (const [namespace, varName] of neededDeclarations) {
                            newDecls += isServerComponent
                                ? `\n  const ${varName} = await getTranslations("${namespace}");`
                                : `\n  const ${varName} = useTranslations("${namespace}");`;
                        }

                        content = content.slice(0, insertPos) + newDecls + content.slice(insertPos);

                        // Adjust fix indices
                        const addedLength = newDecls.length;
                        for (const fix of fixes) {
                            if (fix.index > insertPos) {
                                fix.index += addedLength;
                            }
                        }
                    }
                }

                // Apply fixes from end to start to preserve indices
                fixes.sort((a, b) => b.index - a.index);
                for (const fix of fixes) {
                    content = content.slice(0, fix.index) + fix.newText + content.slice(fix.index + fix.oldText.length);
                }

                if (content !== originalContent) {
                    await fs.writeFile(filePath, content, 'utf8');
                    updatedFiles.push(file);
                    fixedFiles++;
                    totalFixedCalls += fixes.length;
                }
            } catch (error) {
                errors.push({ file, error: error.message });
            }
        }

        return {
            success: true,
            fixedFiles,
            totalFixedCalls,
            updatedFiles,
            errors
        };
    }
}

module.exports = { NamespaceOptimizer };
