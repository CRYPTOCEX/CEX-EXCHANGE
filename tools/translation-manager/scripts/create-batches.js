/**
 * Create Translation Batches
 *
 * Splits missing keys into batch files of 10 keys each
 * for processing by task agents.
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const BATCHES_DIR = path.join(DATA_DIR, 'batches');
const MISSING_KEYS_FILE = path.join(DATA_DIR, 'missing-keys.json');

const BATCH_SIZE = 10;

async function main() {
    console.log('Loading missing keys...');

    let missingData;
    try {
        const content = await fs.readFile(MISSING_KEYS_FILE, 'utf8');
        missingData = JSON.parse(content);
    } catch (e) {
        console.error('Error loading missing-keys.json. Run find-missing-keys.js first.');
        process.exit(1);
    }

    // Create batches directory
    await fs.mkdir(BATCHES_DIR, { recursive: true });

    // Clean existing batch files
    try {
        const existingFiles = await fs.readdir(BATCHES_DIR);
        for (const file of existingFiles) {
            if (file.startsWith('batch_') && file.endsWith('.json')) {
                await fs.unlink(path.join(BATCHES_DIR, file));
            }
        }
    } catch (e) {}

    // Collect all keys with full context
    const allKeys = [];

    for (const [namespace, keys] of Object.entries(missingData.byNamespace)) {
        for (const keyData of keys) {
            allKeys.push({
                namespace,
                key: keyData.key,
                files: keyData.files.slice(0, 3), // Max 3 file references
                context: keyData.files[0]?.context || ''
            });
        }
    }

    console.log(`Total keys to process: ${allKeys.length}`);

    // Split into batches
    const batches = [];
    for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
        batches.push(allKeys.slice(i, i + BATCH_SIZE));
    }

    console.log(`Creating ${batches.length} batch files...`);

    // Write batch files
    for (let i = 0; i < batches.length; i++) {
        const batchNum = String(i + 1).padStart(3, '0');
        const batchFile = path.join(BATCHES_DIR, `batch_${batchNum}.json`);

        await fs.writeFile(batchFile, JSON.stringify({
            batchNumber: i + 1,
            totalBatches: batches.length,
            status: 'pending',
            keys: batches[i]
        }, null, 2), 'utf8');
    }

    // Create index file
    await fs.writeFile(path.join(BATCHES_DIR, 'index.json'), JSON.stringify({
        createdAt: new Date().toISOString(),
        totalKeys: allKeys.length,
        totalBatches: batches.length,
        batchSize: BATCH_SIZE,
        batches: batches.map((_, i) => ({
            file: `batch_${String(i + 1).padStart(3, '0')}.json`,
            status: 'pending'
        }))
    }, null, 2), 'utf8');

    console.log(`\n=== Batches Created ===`);
    console.log(`Total batches: ${batches.length}`);
    console.log(`Keys per batch: ${BATCH_SIZE}`);
    console.log(`Output: ${BATCHES_DIR}`);
}

main().catch(console.error);
