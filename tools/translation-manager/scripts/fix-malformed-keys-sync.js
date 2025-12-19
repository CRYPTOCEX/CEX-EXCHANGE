/**
 * Sync corrected malformed keys across all locale files
 */

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(process.cwd(), 'frontend', 'messages');

// Key mappings: old key -> new key (with namespace)
const keyMappings = {
    'dashboard_admin': {
        'Basic personal details provided by the applicant': 'basic_personal_details_provided_by_applicant',
        'Files and images submitted with the application': 'files_and_images_submitted_with_application'
    },
    'ext_nft': {
        'New bid placed: {amount} {currency}': 'new_bid_placed'
    },
    'ext_staking': {
        'These validators participate_stakers proportionally': 'these_validators_participate_stakers_proportionally',
        'This is clearly displayed on the pool details page': 'this_is_clearly_displayed_on_pool_details_page'
    }
};

// Get all locale files
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} locale files\n`);

let totalUpdates = 0;

for (const file of files) {
    const filePath = path.join(messagesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileUpdates = 0;

    for (const [namespace, mappings] of Object.entries(keyMappings)) {
        if (!content[namespace]) continue;

        for (const [oldKey, newKey] of Object.entries(mappings)) {
            if (content[namespace][oldKey] !== undefined) {
                // Get the existing value
                const value = content[namespace][oldKey];

                // Delete old key
                delete content[namespace][oldKey];

                // Add new key with the value
                content[namespace][newKey] = value;

                fileUpdates++;
            }
        }
    }

    if (fileUpdates > 0) {
        // Sort keys alphabetically within each namespace
        const sortedContent = {};
        for (const ns of Object.keys(content).sort()) {
            sortedContent[ns] = {};
            for (const key of Object.keys(content[ns]).sort()) {
                sortedContent[ns][key] = content[ns][key];
            }
        }

        fs.writeFileSync(filePath, JSON.stringify(sortedContent, null, 2), 'utf8');
        console.log(`  ${file}: ${fileUpdates} keys updated`);
        totalUpdates += fileUpdates;
    }
}

console.log(`\nTotal updates: ${totalUpdates} keys across ${files.length} files`);
