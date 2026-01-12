/**
 * VAPID Keys Generator
 *
 * Generates VAPID keys for Web Push notifications and updates .env file
 *
 * Usage: node scripts/generate-vapid-keys.js [email]
 *
 * Example:
 *   node scripts/generate-vapid-keys.js admin@example.com
 *   node scripts/generate-vapid-keys.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Try to import web-push
let webpush;
try {
  webpush = require('web-push');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: web-push package not found.');
  console.log('\nPlease install it first:');
  console.log('\x1b[36m%s\x1b[0m', '  npm install web-push');
  console.log('  or');
  console.log('\x1b[36m%s\x1b[0m', '  pnpm add web-push');
  process.exit(1);
}

const ENV_PATH = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '..', '.env.example');

/**
 * Generate VAPID keys
 */
function generateKeys() {
  const keys = webpush.generateVAPIDKeys();
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

/**
 * Read .env file content
 */
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Update or add a variable in .env content
 */
function updateEnvVariable(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}="${value}"`;

  if (regex.test(content)) {
    // Update existing variable
    return content.replace(regex, newLine);
  } else {
    // Variable not found, try to add it in the Notifications section
    const notificationSectionRegex = /# Web Push \(VAPID\).*\n/;
    if (notificationSectionRegex.test(content)) {
      // Add after the Web Push comment section
      return content.replace(
        /(# Web Push \(VAPID\).*\n(?:.*\n)*?)(VAPID_)/,
        `$1${newLine}\n$2`
      );
    }
    // Just append to end
    return content + `\n${newLine}`;
  }
}

/**
 * Update .env file with VAPID keys
 */
function updateEnvFile(publicKey, privateKey, subject) {
  let content = readEnvFile(ENV_PATH);

  if (!content) {
    // Try to copy from .env.example
    const exampleContent = readEnvFile(ENV_EXAMPLE_PATH);
    if (exampleContent) {
      content = exampleContent;
      console.log('\x1b[33m%s\x1b[0m', '⚠️  .env file not found, creating from .env.example');
    } else {
      console.error('\x1b[31m%s\x1b[0m', '❌ Error: Neither .env nor .env.example found');
      return false;
    }
  }

  // Update the variables
  content = updateEnvVariable(content, 'VAPID_PUBLIC_KEY', publicKey);
  content = updateEnvVariable(content, 'VAPID_PRIVATE_KEY', privateKey);
  content = updateEnvVariable(content, 'VAPID_SUBJECT', subject);

  // Write back to file
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
  return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Format subject (add mailto: if it's an email)
 */
function formatSubject(subject) {
  if (isValidEmail(subject)) {
    return `mailto:${subject}`;
  }
  if (isValidUrl(subject)) {
    return subject;
  }
  if (subject.startsWith('mailto:') && isValidEmail(subject.replace('mailto:', ''))) {
    return subject;
  }
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log('\n\x1b[36m%s\x1b[0m', '🔑 VAPID Keys Generator for Web Push Notifications');
  console.log('='.repeat(50));

  // Check for existing keys
  const envContent = readEnvFile(ENV_PATH);
  if (envContent) {
    const existingPublicKey = envContent.match(/VAPID_PUBLIC_KEY="([^"]+)"/)?.[1];
    const existingPrivateKey = envContent.match(/VAPID_PRIVATE_KEY="([^"]+)"/)?.[1];

    if (existingPublicKey && existingPrivateKey && existingPublicKey.length > 10) {
      console.log('\n\x1b[33m%s\x1b[0m', '⚠️  VAPID keys already exist in .env');
      console.log('\nExisting Public Key:', existingPublicKey.substring(0, 30) + '...');

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question('\nDo you want to regenerate them? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('\n\x1b[32m%s\x1b[0m', '✅ Keeping existing keys.');
        process.exit(0);
      }
    }
  }

  // Get subject from command line or prompt
  let subject = process.argv[2];

  if (!subject) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n\x1b[33m%s\x1b[0m', 'VAPID_SUBJECT is required by push services to identify you.');
    console.log('It should be your email or website URL.');
    console.log('\nExamples:');
    console.log('  - admin@yourdomain.com');
    console.log('  - https://yourdomain.com');

    subject = await new Promise((resolve) => {
      rl.question('\nEnter your email or website URL: ', resolve);
    });
    rl.close();
  }

  // Validate and format subject
  const formattedSubject = formatSubject(subject.trim());

  if (!formattedSubject) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ Error: Invalid subject. Please provide a valid email or URL.');
    console.log('Examples:');
    console.log('  - admin@example.com');
    console.log('  - https://example.com');
    process.exit(1);
  }

  // Generate keys
  console.log('\n\x1b[36m%s\x1b[0m', '🔄 Generating VAPID keys...');
  const keys = generateKeys();

  // Update .env file
  console.log('\x1b[36m%s\x1b[0m', '📝 Updating .env file...');
  const success = updateEnvFile(keys.publicKey, keys.privateKey, formattedSubject);

  if (!success) {
    process.exit(1);
  }

  // Display results
  console.log('\n\x1b[32m%s\x1b[0m', '✅ VAPID keys generated and saved to .env');
  console.log('\n' + '='.repeat(50));
  console.log('\x1b[36m%s\x1b[0m', 'Your VAPID Keys:');
  console.log('='.repeat(50));
  console.log('\n\x1b[33mPublic Key:\x1b[0m');
  console.log(keys.publicKey);
  console.log('\n\x1b[33mPrivate Key:\x1b[0m');
  console.log(keys.privateKey);
  console.log('\n\x1b[33mSubject:\x1b[0m');
  console.log(formattedSubject);
  console.log('\n' + '='.repeat(50));

  console.log('\n\x1b[32m%s\x1b[0m', '🎉 Web Push is ready!');
  console.log('\nNext steps:');
  console.log('  1. Restart your backend server');
  console.log('  2. Users can now subscribe to push notifications in their browser');
  console.log('\n\x1b[33m%s\x1b[0m', '⚠️  Keep your PRIVATE KEY secret! Never expose it in frontend code.');
  console.log('');
}

// Run
main().catch((error) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error:', error.message);
  process.exit(1);
});
