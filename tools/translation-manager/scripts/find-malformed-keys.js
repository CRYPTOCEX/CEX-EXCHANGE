/**
 * Find malformed translation keys
 * - Keys with empty values
 * - Keys that look like sentences (value stored in key)
 */

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(process.cwd(), 'frontend', 'messages');
const enPath = path.join(messagesDir, 'en.json');
const messages = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const malformed = [];

for (const [ns, nsData] of Object.entries(messages)) {
    if (typeof nsData !== 'object' || nsData === null) continue;
    for (const [key, value] of Object.entries(nsData)) {
        // Check for empty values
        if (value === '') {
            malformed.push({ namespace: ns, key, value, issue: 'empty_value' });
        }
        // Check for keys that look like sentences (likely misplaced values)
        else if (key.includes(' ') && key.length > 40) {
            malformed.push({ namespace: ns, key, value, issue: 'sentence_key' });
        }
        // Check for keys containing variables like {amount}
        else if (key.includes('{') && key.includes('}')) {
            malformed.push({ namespace: ns, key, value, issue: 'variable_in_key' });
        }
    }
}

console.log('Found', malformed.length, 'malformed keys:\n');
malformed.forEach((m, i) => {
    console.log(`${i + 1}. [${m.issue}] ${m.namespace}.${m.key}`);
    if (m.value) console.log(`   Value: "${m.value}"`);
    console.log('');
});

// Output as JSON for further processing
fs.writeFileSync(
    path.join(process.cwd(), 'tools', 'translation-manager', 'scripts', 'malformed-keys.json'),
    JSON.stringify(malformed, null, 2)
);
console.log('\nSaved to malformed-keys.json');
