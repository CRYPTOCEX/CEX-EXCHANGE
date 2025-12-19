/**
 * Import Single Batch
 *
 * Imports reviewed translations from a single batch file
 * into the English locale file only.
 *
 * Usage: node import-batch.js batch_001.json
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../..');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'frontend', 'messages');
const BATCHES_DIR = path.join(__dirname, '../data/batches');

async function main() {
    const batchFile = process.argv[2];

    if (!batchFile) {
        console.error('Usage: node import-batch.js batch_001.json');
        process.exit(1);
    }

    const batchPath = path.join(BATCHES_DIR, batchFile);

    // Load batch
    let batch;
    try {
        const content = await fs.readFile(batchPath, 'utf8');
        batch = JSON.parse(content);
    } catch (e) {
        console.error(`Error loading batch file: ${batchFile}`);
        console.error(e.message);
        process.exit(1);
    }

    if (batch.status === 'imported') {
        console.log(`Batch ${batchFile} already imported. Skipping.`);
        return;
    }

    if (batch.status !== 'reviewed') {
        console.error(`Batch ${batchFile} not reviewed yet. Status: ${batch.status}`);
        process.exit(1);
    }

    // Load English locale file
    const enPath = path.join(MESSAGES_DIR, 'en.json');
    let enMessages;
    try {
        const content = await fs.readFile(enPath, 'utf8');
        enMessages = JSON.parse(content);
    } catch (e) {
        console.error('Error loading en.json');
        process.exit(1);
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const keyData of batch.keys) {
        const { namespace, key, translation } = keyData;

        if (!translation || translation.trim() === '') {
            console.log(`  Skipping ${namespace}.${key} - no translation`);
            skippedCount++;
            continue;
        }

        // Ensure namespace exists
        if (!enMessages[namespace]) {
            enMessages[namespace] = {};
        }

        // Only add if not already exists
        if (!enMessages[namespace][key]) {
            enMessages[namespace][key] = translation;
            addedCount++;
            console.log(`  Added: ${namespace}.${key} = "${translation}"`);
        } else {
            console.log(`  Exists: ${namespace}.${key}`);
            skippedCount++;
        }
    }

    // Sort and save
    const sortedMessages = {};
    for (const ns of Object.keys(enMessages).sort()) {
        const nsData = enMessages[ns];
        if (typeof nsData === 'object' && nsData !== null) {
            sortedMessages[ns] = {};
            for (const k of Object.keys(nsData).sort()) {
                sortedMessages[ns][k] = nsData[k];
            }
        }
    }

    await fs.writeFile(enPath, JSON.stringify(sortedMessages, null, 2), 'utf8');

    // Mark batch as imported
    batch.status = 'imported';
    batch.importedAt = new Date().toISOString();
    batch.stats = { added: addedCount, skipped: skippedCount };

    await fs.writeFile(batchPath, JSON.stringify(batch, null, 2), 'utf8');

    // Update index
    try {
        const indexPath = path.join(BATCHES_DIR, 'index.json');
        const indexContent = await fs.readFile(indexPath, 'utf8');
        const index = JSON.parse(indexContent);

        const batchEntry = index.batches.find(b => b.file === batchFile);
        if (batchEntry) {
            batchEntry.status = 'imported';
        }

        await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (e) {}

    console.log(`\n=== Batch ${batchFile} Imported ===`);
    console.log(`Added: ${addedCount} keys`);
    console.log(`Skipped: ${skippedCount} keys`);
}

main().catch(console.error);
