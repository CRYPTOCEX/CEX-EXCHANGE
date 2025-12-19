/**
 * Import Translations Script
 *
 * This script reads the suggested-translations.json file
 * and imports all approved translations into the locale files.
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'frontend', 'messages');
const DATA_DIR = path.join(__dirname, '../data');
const INPUT_FILE = path.join(DATA_DIR, 'suggested-translations.json');

async function loadAllLocales() {
    const files = await fs.readdir(MESSAGES_DIR);
    const locales = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    const messages = {};

    for (const locale of locales) {
        const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
        const content = await fs.readFile(filePath, 'utf8');
        messages[locale] = JSON.parse(content);
    }

    return { locales, messages };
}

async function saveAllLocales(locales, messages) {
    for (const locale of locales) {
        const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

        // Sort namespaces and keys
        const sortedMessages = {};
        for (const ns of Object.keys(messages[locale]).sort()) {
            const nsData = messages[locale][ns];
            if (typeof nsData === 'object' && nsData !== null) {
                sortedMessages[ns] = {};
                for (const key of Object.keys(nsData).sort()) {
                    sortedMessages[ns][key] = nsData[key];
                }
            }
        }

        await fs.writeFile(filePath, JSON.stringify(sortedMessages, null, 2), 'utf8');
    }
}

async function main() {
    // Check for --all flag to approve all
    const approveAll = process.argv.includes('--all');
    const dryRun = process.argv.includes('--dry-run');

    console.log('Loading suggested translations...');

    let suggestions;
    try {
        const content = await fs.readFile(INPUT_FILE, 'utf8');
        suggestions = JSON.parse(content);
    } catch (e) {
        console.error('Error loading suggested-translations.json. Run generate-missing-translations.js first.');
        console.error(e.message);
        process.exit(1);
    }

    console.log('Loading locale files...');
    const { locales, messages } = await loadAllLocales();
    console.log(`Found ${locales.length} locales: ${locales.join(', ')}`);

    let addedCount = 0;
    let skippedCount = 0;
    const addedKeys = [];

    for (const [namespace, keys] of Object.entries(suggestions.byNamespace)) {
        for (const keyData of keys) {
            // Check if approved (or --all flag)
            if (!approveAll && !keyData.approved) {
                skippedCount++;
                continue;
            }

            // Skip if no suggestion
            if (!keyData.suggested || keyData.suggested.trim() === '') {
                console.log(`  Skipping ${namespace}.${keyData.key} - no suggestion`);
                skippedCount++;
                continue;
            }

            // Add to all locales
            for (const locale of locales) {
                if (!messages[locale][namespace]) {
                    messages[locale][namespace] = {};
                }

                // Only add if not already exists
                if (!messages[locale][namespace][keyData.key]) {
                    if (locale === 'en') {
                        messages[locale][namespace][keyData.key] = keyData.suggested;
                    } else {
                        // For non-English, use placeholder
                        messages[locale][namespace][keyData.key] = `[${keyData.key}]`;
                    }
                }
            }

            addedKeys.push(`${namespace}.${keyData.key}`);
            addedCount++;
        }
    }

    if (dryRun) {
        console.log('\n=== DRY RUN - No files modified ===');
        console.log(`Would add ${addedCount} keys`);
        console.log(`Would skip ${skippedCount} keys (not approved)`);
        if (addedCount > 0) {
            console.log('\nKeys that would be added:');
            for (const key of addedKeys.slice(0, 20)) {
                console.log(`  - ${key}`);
            }
            if (addedKeys.length > 20) {
                console.log(`  ... and ${addedKeys.length - 20} more`);
            }
        }
        return;
    }

    if (addedCount === 0) {
        console.log('\n=== No Approved Keys ===');
        console.log('No keys were approved for import.');
        console.log('Either:');
        console.log('  1. Edit suggested-translations.json and set "approved": true for keys to import');
        console.log('  2. Run with --all flag to import all suggestions: node import-translations.js --all');
        console.log('  3. Run with --dry-run to see what would be imported: node import-translations.js --all --dry-run');
        return;
    }

    console.log('\nSaving locale files...');
    await saveAllLocales(locales, messages);

    // Update the suggestions file to mark imported keys
    for (const [namespace, keys] of Object.entries(suggestions.byNamespace)) {
        for (const keyData of keys) {
            if (addedKeys.includes(`${namespace}.${keyData.key}`)) {
                keyData.imported = true;
                keyData.importedAt = new Date().toISOString();
            }
        }
    }
    suggestions.summary.lastImport = new Date().toISOString();
    suggestions.summary.importedCount = (suggestions.summary.importedCount || 0) + addedCount;

    await fs.writeFile(INPUT_FILE, JSON.stringify(suggestions, null, 2), 'utf8');

    console.log('\n=== Import Complete ===');
    console.log(`Added: ${addedCount} keys`);
    console.log(`Skipped: ${skippedCount} keys (not approved)`);
    console.log(`Locales updated: ${locales.length}`);

    if (addedCount > 0 && addedCount <= 50) {
        console.log('\nAdded keys:');
        for (const key of addedKeys) {
            console.log(`  - ${key}`);
        }
    }
}

main().catch(console.error);
