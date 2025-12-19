/**
 * Generate Missing Translations Script
 *
 * This script reads the missing-keys.json and generates human-readable
 * translations by analyzing the context of each key usage.
 *
 * It outputs a file that can be reviewed and then imported.
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const INPUT_FILE = path.join(DATA_DIR, 'missing-keys.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'suggested-translations.json');

/**
 * Convert key to a readable value with smart capitalization
 */
function keyToReadableValue(key) {
    return key
        // Replace underscores with spaces
        .replace(/_/g, ' ')
        // Capitalize first letter of each word
        .replace(/\b\w/g, c => c.toUpperCase())
        // Fix common abbreviations
        .replace(/\bQr\b/gi, 'QR')
        .replace(/\bId\b/g, 'ID')
        .replace(/\bUrl\b/gi, 'URL')
        .replace(/\bApi\b/gi, 'API')
        .replace(/\bUi\b/gi, 'UI')
        .replace(/\bKyc\b/gi, 'KYC')
        .replace(/\bNft\b/gi, 'NFT')
        .replace(/\bP2p\b/gi, 'P2P')
        .replace(/\bIco\b/gi, 'ICO')
        .replace(/\bAi\b/gi, 'AI')
        .replace(/\bVs\b/gi, 'vs')
        .replace(/\bOps\b/gi, 'Oops')
        // Handle "N " patterns (like "N 50" -> "50")
        .replace(/\bN\s+(\d)/g, '$1')
        // Fix common phrases
        .replace(/Dont\b/gi, "Don't")
        .replace(/Cant\b/gi, "Can't")
        .replace(/Wont\b/gi, "Won't")
        .replace(/Isnt\b/gi, "Isn't")
        .replace(/Arent\b/gi, "Aren't")
        .replace(/Havent\b/gi, "Haven't")
        .replace(/Hasnt\b/gi, "Hasn't")
        .replace(/Didnt\b/gi, "Didn't")
        .replace(/Doesnt\b/gi, "Doesn't")
        .replace(/Couldnt\b/gi, "Couldn't")
        .replace(/Shouldnt\b/gi, "Shouldn't")
        .replace(/Wouldnt\b/gi, "Wouldn't")
        .replace(/Youre\b/gi, "You're")
        .replace(/Theyre\b/gi, "They're")
        .replace(/Weve\b/gi, "We've")
        .replace(/Youve\b/gi, "You've")
        .replace(/Theyve\b/gi, "They've")
        .replace(/Its\b/g, "It's") // Be careful - "Its" might be possessive
        .replace(/Lets\b/gi, "Let's")
        // Handle ellipsis patterns
        .replace(/Ellipsis\b/gi, '...')
        // Handle 1 suffixes (like "amount_1" -> "Amount")
        .replace(/\s+1$/g, '')
        .trim();
}

/**
 * Analyze context to improve translation
 */
function analyzeContext(key, context, namespace) {
    let suggestion = keyToReadableValue(key);
    const lowerContext = context.toLowerCase();
    const lowerKey = key.toLowerCase();

    // Detect if it's a button/action
    if (lowerContext.includes('button') || lowerContext.includes('onclick') || lowerContext.includes('<button')) {
        // Likely an action - keep it short and imperative
        suggestion = suggestion.replace(/^The\s+/i, '');
    }

    // Detect if it's an error message
    if (lowerContext.includes('error') || lowerContext.includes('failed') || lowerKey.includes('error') || lowerKey.includes('failed')) {
        // Error messages should be more descriptive
        if (!suggestion.includes('.')) {
            suggestion = suggestion + '.';
        }
    }

    // Detect if it's a label/title
    if (lowerContext.includes('label') || lowerContext.includes('title') || lowerContext.includes('heading')) {
        // Labels are usually short, no period
        suggestion = suggestion.replace(/\.$/, '');
    }

    // Detect if it's a placeholder
    if (lowerContext.includes('placeholder')) {
        // Placeholders are usually instructions
        if (!suggestion.toLowerCase().startsWith('enter') && !suggestion.toLowerCase().startsWith('select') && !suggestion.toLowerCase().startsWith('search')) {
            if (lowerKey.includes('search')) {
                suggestion = 'Search ' + suggestion.toLowerCase();
            }
        }
    }

    // Detect if it's a description
    if (lowerContext.includes('description') || lowerKey.includes('description')) {
        // Descriptions can be longer
    }

    // Detect questions
    if (lowerKey.includes('_do_') || lowerKey.includes('_is_') || lowerKey.includes('_are_') ||
        lowerKey.includes('_can_') || lowerKey.includes('_how_') || lowerKey.includes('_what_') ||
        lowerKey.includes('_why_') || lowerKey.includes('_when_') || lowerKey.includes('_where_')) {
        if (!suggestion.endsWith('?')) {
            suggestion = suggestion + '?';
        }
    }

    // Clean up double spaces
    suggestion = suggestion.replace(/\s+/g, ' ').trim();

    return suggestion;
}

/**
 * Categorize the key based on its name and context
 */
function categorizeKey(key, context) {
    const lowerKey = key.toLowerCase();
    const lowerContext = context.toLowerCase();

    if (lowerKey.includes('error') || lowerKey.includes('failed') || lowerKey.includes('invalid')) {
        return 'error';
    }
    if (lowerKey.includes('success') || lowerKey.includes('completed') || lowerKey.includes('created')) {
        return 'success';
    }
    if (lowerKey.includes('loading') || lowerKey.includes('processing') || lowerKey.includes('wait')) {
        return 'loading';
    }
    if (lowerKey.includes('confirm') || lowerKey.includes('delete') || lowerKey.includes('remove') || lowerKey.includes('cancel')) {
        return 'action';
    }
    if (lowerKey.includes('title') || lowerKey.includes('heading') || lowerKey.includes('header')) {
        return 'title';
    }
    if (lowerKey.includes('description') || lowerKey.includes('desc') || lowerKey.includes('info')) {
        return 'description';
    }
    if (lowerKey.includes('placeholder') || lowerKey.includes('search') || lowerKey.includes('enter')) {
        return 'placeholder';
    }
    if (lowerKey.includes('button') || lowerContext.includes('button') || lowerContext.includes('onclick')) {
        return 'button';
    }
    if (lowerKey.includes('label') || lowerKey.includes('field')) {
        return 'label';
    }

    return 'general';
}

async function main() {
    console.log('Loading missing keys...');

    let missingData;
    try {
        const content = await fs.readFile(INPUT_FILE, 'utf8');
        missingData = JSON.parse(content);
    } catch (e) {
        console.error('Error loading missing-keys.json. Run find-missing-keys.js first.');
        console.error(e.message);
        process.exit(1);
    }

    console.log(`Processing ${missingData.summary.uniqueKeys} unique missing keys...`);

    const suggestions = {
        generatedAt: new Date().toISOString(),
        summary: {
            ...missingData.summary,
            status: 'pending_review'
        },
        instructions: [
            "Review each suggested translation below.",
            "Edit the 'suggested' value if needed.",
            "Set 'approved' to true for keys you want to add.",
            "Run import-translations.js to add approved keys to locale files."
        ],
        byNamespace: {}
    };

    for (const [namespace, keys] of Object.entries(missingData.byNamespace)) {
        suggestions.byNamespace[namespace] = keys.map(keyData => {
            const context = keyData.files[0]?.context || '';
            const category = categorizeKey(keyData.key, context);
            const suggested = analyzeContext(keyData.key, context, namespace);

            return {
                key: keyData.key,
                suggested,
                category,
                approved: false,
                usageCount: keyData.files.length,
                files: keyData.files.map(f => `${f.file}:${f.lineNumber}`).slice(0, 3),
                context: context.substring(0, 200)
            };
        });
    }

    // Write output
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(suggestions, null, 2), 'utf8');

    console.log('\n=== Generation Complete ===');
    console.log(`Output written to: ${OUTPUT_FILE}`);
    console.log('\nNext steps:');
    console.log('1. Review the suggested-translations.json file');
    console.log('2. Edit suggestions as needed');
    console.log('3. Set "approved": true for keys to import');
    console.log('4. Run: node scripts/import-translations.js');

    // Print sample
    console.log('\n=== Sample Suggestions ===');
    let count = 0;
    for (const [ns, keys] of Object.entries(suggestions.byNamespace)) {
        if (count >= 10) break;
        for (const k of keys.slice(0, 2)) {
            console.log(`\n[${ns}] ${k.key}`);
            console.log(`  Suggested: "${k.suggested}"`);
            console.log(`  Category: ${k.category}`);
            console.log(`  Files: ${k.files.join(', ')}`);
            count++;
            if (count >= 10) break;
        }
    }
}

main().catch(console.error);
