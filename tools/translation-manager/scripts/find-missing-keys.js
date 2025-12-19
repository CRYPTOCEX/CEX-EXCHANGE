/**
 * Find Missing Translation Keys Script
 *
 * This script:
 * 1. Scans all source files for t() calls
 * 2. Checks if each key exists in its namespace
 * 3. Outputs a JSON file with all missing keys and their file paths
 * 4. Groups by namespace for easy processing
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('fast-glob');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'frontend', 'messages');
const OUTPUT_FILE = path.join(__dirname, '../data/missing-keys.json');

async function loadMessages() {
    const enPath = path.join(MESSAGES_DIR, 'en.json');
    const content = await fs.readFile(enPath, 'utf8');
    return JSON.parse(content);
}

function buildKeyMap(messages) {
    const keyInNamespace = new Map();

    for (const [ns, nsData] of Object.entries(messages)) {
        if (typeof nsData !== 'object' || nsData === null) continue;
        keyInNamespace.set(ns, new Set(Object.keys(nsData)));
    }

    return keyInNamespace;
}

async function analyzeFile(filePath, keyInNamespace) {
    let content;
    try {
        content = await fs.readFile(filePath, 'utf8');
    } catch (e) {
        return [];
    }

    if (!content.includes('useTranslations')) {
        return [];
    }

    // Find all useTranslations declarations
    const declRegex = /const\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/g;
    const varToNamespace = new Map();
    let declMatch;

    while ((declMatch = declRegex.exec(content)) !== null) {
        varToNamespace.set(declMatch[1], declMatch[2]);
    }

    if (varToNamespace.size === 0) {
        return [];
    }

    // Find all t() calls
    const callRegex = /\b(t[A-Z]\w*|t)\s*\(\s*(["'])([^"']+)\2/g;
    const missingKeys = [];
    let callMatch;

    while ((callMatch = callRegex.exec(content)) !== null) {
        const varName = callMatch[1];
        const key = callMatch[3];
        const namespace = varToNamespace.get(varName);

        if (!namespace) continue;

        // Check if key exists in namespace
        const keysInNs = keyInNamespace.get(namespace);
        if (!keysInNs || !keysInNs.has(key)) {
            // Get line number
            const lineNumber = content.substring(0, callMatch.index).split('\n').length;

            // Get surrounding context (5 lines before and after)
            const lines = content.split('\n');
            const startLine = Math.max(0, lineNumber - 6);
            const endLine = Math.min(lines.length, lineNumber + 5);
            const context = lines.slice(startLine, endLine).join('\n');

            missingKeys.push({
                key,
                namespace,
                varName,
                lineNumber,
                context: context.substring(0, 500) // Limit context size
            });
        }
    }

    return missingKeys;
}

async function main() {
    console.log('Loading messages...');
    const messages = await loadMessages();
    const keyInNamespace = buildKeyMap(messages);

    console.log('Scanning source files...');
    const files = await glob([
        'frontend/app/**/*.tsx',
        'frontend/app/**/*.ts',
        'frontend/components/**/*.tsx',
        'frontend/components/**/*.ts',
    ], {
        ignore: ['**/node_modules/**'],
        cwd: PROJECT_ROOT
    });

    console.log(`Found ${files.length} files to analyze...`);

    const allMissingKeys = [];
    const byNamespace = {};
    const byFile = {};

    for (const file of files) {
        const filePath = path.join(PROJECT_ROOT, file);
        const missing = await analyzeFile(filePath, keyInNamespace);

        if (missing.length > 0) {
            byFile[file] = missing;

            for (const mk of missing) {
                allMissingKeys.push({
                    ...mk,
                    file
                });

                if (!byNamespace[mk.namespace]) {
                    byNamespace[mk.namespace] = [];
                }
                byNamespace[mk.namespace].push({
                    ...mk,
                    file
                });
            }
        }
    }

    // Deduplicate keys per namespace
    const uniqueByNamespace = {};
    for (const [ns, keys] of Object.entries(byNamespace)) {
        const uniqueKeys = new Map();
        for (const k of keys) {
            if (!uniqueKeys.has(k.key)) {
                uniqueKeys.set(k.key, {
                    key: k.key,
                    namespace: ns,
                    files: []
                });
            }
            uniqueKeys.get(k.key).files.push({
                file: k.file,
                lineNumber: k.lineNumber,
                context: k.context
            });
        }
        uniqueByNamespace[ns] = Array.from(uniqueKeys.values());
    }

    const result = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalMissingKeys: allMissingKeys.length,
            uniqueKeys: Object.values(uniqueByNamespace).reduce((acc, keys) => acc + keys.length, 0),
            filesWithIssues: Object.keys(byFile).length,
            namespacesAffected: Object.keys(byNamespace).length
        },
        byNamespace: uniqueByNamespace,
        byFile
    };

    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    // Write output
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');

    console.log('\n=== Summary ===');
    console.log(`Total missing key usages: ${result.summary.totalMissingKeys}`);
    console.log(`Unique missing keys: ${result.summary.uniqueKeys}`);
    console.log(`Files with issues: ${result.summary.filesWithIssues}`);
    console.log(`Namespaces affected: ${result.summary.namespacesAffected}`);
    console.log(`\nOutput written to: ${OUTPUT_FILE}`);

    // Print namespace breakdown
    console.log('\n=== By Namespace ===');
    for (const [ns, keys] of Object.entries(uniqueByNamespace).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`  ${ns}: ${keys.length} missing keys`);
    }

    return result;
}

main().catch(console.error);
