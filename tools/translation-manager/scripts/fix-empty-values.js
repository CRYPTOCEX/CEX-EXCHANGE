/**
 * Fix empty translation values by copying from English
 * This handles keys that were renamed and had empty values in other locales
 */

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(process.cwd(), 'frontend', 'messages');

// Keys that need fixing with their correct English values
const keysToFix = {
    'dashboard_admin': {
        'basic_personal_details_provided_by_applicant': 'Basic personal details provided by the applicant',
        'files_and_images_submitted_with_application': 'Files and images submitted with the application'
    },
    'ext_nft': {
        'new_bid_placed': 'New bid placed'
    },
    'ext_staking': {
        'these_validators_participate_stakers_proportionally': 'These validators participate in network consensus and distribute rewards to stakers proportionally',
        'this_is_clearly_displayed_on_pool_details_page': 'This is clearly displayed on the pool details page'
    }
};

// Get all locale files except en.json
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

console.log(`Fixing empty values in ${files.length} locale files\n`);

let totalFixes = 0;

for (const file of files) {
    const filePath = path.join(messagesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileFixes = 0;

    for (const [namespace, keys] of Object.entries(keysToFix)) {
        if (!content[namespace]) continue;

        for (const [key, englishValue] of Object.entries(keys)) {
            // Check if the key exists but has empty value
            if (content[namespace][key] === '' || content[namespace][key] === undefined) {
                content[namespace][key] = englishValue;
                fileFixes++;
            }
        }
    }

    if (fileFixes > 0) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`  ${file}: ${fileFixes} empty values fixed`);
        totalFixes += fileFixes;
    }
}

console.log(`\nTotal fixes: ${totalFixes} values across ${files.length} files`);
