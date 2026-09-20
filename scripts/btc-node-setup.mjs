#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import readline from 'readline';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let rl = null;

function question(query) {
  if (!rl) rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, resolve));
}

function generateStrongPassword(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Rewrite keys in a .env, resolving them the way the backend will read it.
 *
 * TWO RULES, AND MISSING EITHER WRITES A FILE THAT LIES. dotenv accepts
 * `export KEY=v`, spaces around `=` and inline comments, so a narrow `^KEY=`
 * match walks past a line it will later honour and appends a second definition.
 * And where a key is defined twice dotenv takes the LAST — so editing the first
 * match updates the line that loses. Every definition is therefore rewritten:
 * the last one in place, keeping its position in a curated file, and the
 * earlier duplicates removed. The result is then re-parsed with dotenv itself,
 * and nothing is written unless it reads back as intended.
 */
export function applyEnvUpdates(envContent, updates) {
  const newline = envContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = envContent.split(/\r?\n/);

  for (const [key, value] of Object.entries(updates)) {
    const isDefinition = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=`);
    const hits = [];
    lines.forEach((line, i) => {
      if (isDefinition.test(line)) hits.push(i);
    });
    if (hits.length === 0) {
      lines.push(`${key}="${value}"`);
      continue;
    }
    lines[hits[hits.length - 1]] = `${key}="${value}"`;
    // Bottom-up, so the remaining indices stay valid.
    for (const i of hits.slice(0, -1).reverse()) lines.splice(i, 1);
  }

  const next = lines.join(newline);
  const readBack = dotenv.parse(next);
  for (const [key, value] of Object.entries(updates)) {
    if (readBack[key] !== String(value)) {
      throw new Error(
        `${key} would still resolve to ${JSON.stringify(readBack[key])} instead of ${JSON.stringify(String(value))} — refusing to write the file. Set ${key} by hand and re-run.`
      );
    }
  }
  return next;
}

function updateEnvFile(envPath, updates) {
  fs.writeFileSync(envPath, applyEnvUpdates(fs.readFileSync(envPath, "utf8"), updates));
}

/**
 * BTC_NETWORK as the backend reads it → what Bitcoin Core needs for that chain.
 * "testnet" is an alias of testnet4 on this platform (address generation and
 * the mempool.space endpoint both treat it so), hence the same row twice.
 */
export const BTC_NETWORKS = {
  mainnet: { chainFlag: null, section: null, rpcPort: 8332 },
  testnet: { chainFlag: 'testnet4=1', section: 'testnet4', rpcPort: 48332 },
  testnet4: { chainFlag: 'testnet4=1', section: 'testnet4', rpcPort: 48332 },
  testnet3: { chainFlag: 'testnet=1', section: 'test', rpcPort: 18332 },
  signet: { chainFlag: 'signet=1', section: 'signet', rpcPort: 38332 },
};

/**
 * The BTC_NETWORK a .env declares (unset → mainnet), read through the same
 * dotenv grammar the backend loads it with — `export`, spaces around `=`,
 * inline comments and duplicate keys all resolve identically. Throws on a
 * value the backend would not accept either.
 */
export function resolveBtcNetwork(envContent) {
  const value = (dotenv.parse(envContent).BTC_NETWORK || '').trim() || 'mainnet';
  if (!BTC_NETWORKS[value]) {
    throw new Error(`BTC_NETWORK="${value}" is not a supported value (${Object.keys(BTC_NETWORKS).join(', ')})`);
  }
  return value;
}

/**
 * bitcoin.conf for one network. Bitcoin Core reads rpcport= (like port, bind,
 * rpcbind, addnode, connect and wallet) from the top section for MAINNET ONLY:
 * on any other chain a top-level rpcport is ignored and the node listens on
 * that chain's default — the backend then knocks on 8332 and gets
 * ECONNREFUSED while bitcoin-cli, which reads this file, works fine. So off
 * mainnet the port lives in the chain's own [section], at the end of the file
 * because everything after a section header belongs to it. Credentials,
 * prune and ZMQ are read from the top section on every chain.
 */
export function renderBitcoinConf(rpcUser, rpcPassword, network = 'mainnet') {
  const net = BTC_NETWORKS[network];
  if (!net) throw new Error(`Unknown BTC_NETWORK "${network}"`);
  const chainBlock = net.chainFlag ? `# Chain (BTC_NETWORK=${network} in .env)\n${net.chainFlag}\n\n` : '';
  const topLevelRpcPort = net.section ? '' : `rpcport=${net.rpcPort}\n`;
  const sectionBlock = net.section
    ? `\n# Off mainnet, rpcport only takes effect from the chain's own section.\n[${net.section}]\nrpcport=${net.rpcPort}\n`
    : '';
  return `# Bitcoin Core Configuration for Ecosystem Integration

${chainBlock}# Pruned mode - keeps only last 10 GB of blocks
prune=10000

# RPC Server Settings
server=1
rpcuser=${rpcUser}
rpcpassword=${rpcPassword}
rpcallowip=127.0.0.1
${topLevelRpcPort}
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
${sectionBlock}`;
}

function updateBitcoinConf(confPath, rpcUser, rpcPassword, network) {
  fs.writeFileSync(confPath, renderBitcoinConf(rpcUser, rpcPassword, network));
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

  // The chain is whatever the backend is configured for: the node must run
  // it, and the RPC port written to both files must be the one it listens on.
  let network;
  try {
    network = resolveBtcNetwork(fs.readFileSync(envPath, 'utf8'));
  } catch (error) {
    console.error(`\n❌ Error: ${error.message} — fix BTC_NETWORK in ${envPath} first`);
    process.exit(1);
  }
  const rpcPort = BTC_NETWORKS[network].rpcPort;

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
  console.log(`  Network:      ${network} (RPC port ${rpcPort}, from BTC_NETWORK in .env)`);

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
    updateBitcoinConf(bitcoinConfPath, rpcUser, rpcPassword, network);
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
      BTC_NODE_PORT: String(rpcPort),
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

  rl?.close();
}

// Only the CLI entry runs the interactive flow; importing the module (to reuse
// the network table or check the rendered config) must not touch stdin.
const samePath = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
if (process.argv[1] && samePath(path.resolve(process.argv[1]), __filename)) {
  main().catch(error => {
    console.error(`\n❌ Setup failed: ${error.message}`);
    rl?.close();
    process.exit(1);
  });
}