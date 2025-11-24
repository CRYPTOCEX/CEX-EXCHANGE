#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function generateStrongPassword(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

function updateEnvFile(envPath, updates) {
  let envContent = fs.readFileSync(envPath, 'utf8');

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  }

  fs.writeFileSync(envPath, envContent);
}

function updateBitcoinConf(confPath, rpcUser, rpcPassword) {
  const config = `# Bitcoin Core Configuration for Ecosystem Integration

# Pruned mode - keeps only last 10 GB of blocks
prune=10000

# RPC Server Settings
server=1
rpcuser=${rpcUser}
rpcpassword=${rpcPassword}
rpcallowip=127.0.0.1
rpcport=8332

# Performance
maxmempool=300
dbcache=450

# ZMQ notifications for real-time transaction updates (optional)
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
zmqpubhashtx=tcp://127.0.0.1:28334
zmqpubhashblock=tcp://127.0.0.1:28335

# Logging
debug=rpc
debug=walletdb
`;

  fs.writeFileSync(confPath, config);
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Bitcoin Core Node Setup for Ecosystem Platform      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Default paths
  const defaultBitcoinDir = 'C:\\xampp\\htdocs\\bitcoin';
  const defaultEnvPath = path.join(__dirname, '..', '.env');

  // Ask for Bitcoin data directory
  const bitcoinDirInput = await question(
    `Bitcoin Core data directory [${defaultBitcoinDir}]: `
  );
  const bitcoinDir = bitcoinDirInput.trim() || defaultBitcoinDir;

  // Ask for .env file path
  const envPathInput = await question(
    `Path to .env file [${defaultEnvPath}]: `
  );
  const envPath = envPathInput.trim() || defaultEnvPath;

  // Validate paths
  if (!fs.existsSync(envPath)) {
    console.error(`\n❌ Error: .env file not found at ${envPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(bitcoinDir)) {
    console.log(`\n⚠️  Warning: Bitcoin directory not found at ${bitcoinDir}`);
    const createDir = await question('Create directory? (y/n): ');
    if (createDir.toLowerCase() === 'y') {
      fs.mkdirSync(bitcoinDir, { recursive: true });
      console.log('✓ Directory created');
    } else {
      console.error('Setup cancelled.');
      process.exit(1);
    }
  }

  // Generate credentials
  console.log('\n📝 Generating RPC credentials...\n');
  const rpcUser = 'bicrypto_rpc';
  const rpcPassword = generateStrongPassword(32);

  console.log('Generated credentials:');
  console.log(`  RPC User:     ${rpcUser}`);
  console.log(`  RPC Password: ${rpcPassword}`);

  // Confirm
  const confirm = await question('\nProceed with setup? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Setup cancelled.');
    process.exit(0);
  }

  console.log('\n⚙️  Configuring...\n');

  // Update bitcoin.conf
  const bitcoinConfPath = path.join(bitcoinDir, 'bitcoin.conf');
  try {
    updateBitcoinConf(bitcoinConfPath, rpcUser, rpcPassword);
    console.log(`✓ Updated ${bitcoinConfPath}`);
  } catch (error) {
    console.error(`❌ Failed to update bitcoin.conf: ${error.message}`);
    process.exit(1);
  }

  // Update .env
  try {
    updateEnvFile(envPath, {
      BTC_NODE: 'node',
      BTC_NODE_HOST: '127.0.0.1',
      BTC_NODE_PORT: '8332',
      BTC_NODE_USER: rpcUser,
      BTC_NODE_PASSWORD: rpcPassword
    });
    console.log(`✓ Updated ${envPath}`);
  } catch (error) {
    console.error(`❌ Failed to update .env: ${error.message}`);
    process.exit(1);
  }

  // Create credentials backup file
  const backupPath = path.join(__dirname, 'btc-node-credentials.txt');
  const backupContent = `Bitcoin Core RPC Credentials
Generated: ${new Date().toISOString()}

RPC User: ${rpcUser}
RPC Password: ${rpcPassword}

Bitcoin Data Directory: ${bitcoinDir}
Configuration File: ${bitcoinConfPath}

IMPORTANT: Keep these credentials secure and do not commit to version control!
`;

  fs.writeFileSync(backupPath, backupContent);
  console.log(`✓ Credentials backed up to ${backupPath}`);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    Setup Complete! ✓                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:\n');
  console.log('1. Restart Bitcoin Core for configuration to take effect');
  console.log('2. Wait for blockchain sync to complete');
  console.log('3. Restart your backend server:');
  console.log('   cd backend && pnpm restart\n');
  console.log('4. Monitor logs for [BTC_SCANNER] messages\n');
  console.log('⚠️  IMPORTANT: Keep the credentials file secure!\n');

  rl.close();
}

main().catch(error => {
  console.error(`\n❌ Setup failed: ${error.message}`);
  rl.close();
  process.exit(1);
});