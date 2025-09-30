# Bitcoin Core Node Setup Script

## Quick Setup

Run the automated setup script:

```bash
pnpm btc-node:setup
```

## What it does:

1. ✅ Generates a secure 32-character RPC password
2. ✅ Creates/updates `bitcoin.conf` with optimal settings
3. ✅ Updates `.env` with:
   - `BTC_NODE="node"`
   - RPC credentials
   - Host and port configuration
4. ✅ Saves credentials backup to `scripts/btc-node-credentials.txt`

## Interactive Setup

The script will ask you:

1. **Bitcoin Core data directory** (default: `C:\xampp\htdocs\bitcoin`)
2. **Path to .env file** (default: auto-detected)
3. **Confirmation to proceed**

Example output:

```
╔═══════════════════════════════════════════════════════════╗
║     Bitcoin Core Node Setup for Ecosystem Platform      ║
╚═══════════════════════════════════════════════════════════╝

Bitcoin Core data directory [C:\xampp\htdocs\bitcoin]:
Path to .env file [C:\xampp\htdocs\v5\.env]:

📝 Generating RPC credentials...

Generated credentials:
  RPC User:     bicrypto_rpc
  RPC Password: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6

Proceed with setup? (y/n): y

⚙️  Configuring...

✓ Updated C:\xampp\htdocs\bitcoin\bitcoin.conf
✓ Updated C:\xampp\htdocs\v5\.env
✓ Credentials backed up to scripts/btc-node-credentials.txt

╔═══════════════════════════════════════════════════════════╗
║                    Setup Complete! ✓                     ║
╚═══════════════════════════════════════════════════════════╝

Next steps:

1. Restart Bitcoin Core for configuration to take effect
2. Wait for blockchain sync to complete
3. Restart your backend server:
   cd backend && pnpm restart

4. Monitor logs for [BTC_SCANNER] messages

⚠️  IMPORTANT: Keep the credentials file secure!
```

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Edit `bitcoin.conf`

```ini
server=1
rpcuser=bicrypto_rpc
rpcpassword=YOUR_SECURE_PASSWORD
rpcallowip=127.0.0.1
rpcport=8332
prune=10000
```

### 2. Edit `.env`

```ini
BTC_NODE="node"
BTC_NODE_HOST="127.0.0.1"
BTC_NODE_PORT="8332"
BTC_NODE_USER="bicrypto_rpc"
BTC_NODE_PASSWORD="YOUR_SECURE_PASSWORD"
```

### 3. Restart Services

```bash
# Restart Bitcoin Core
# Then restart backend:
cd backend && pnpm restart
```

## Verification

Check if setup is working:

```bash
# Test RPC connection
curl --user bicrypto_rpc:YOUR_PASSWORD http://127.0.0.1:8332/ -d '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}'

# Check backend logs for scanner
# Look for: [BTC_SCANNER] Starting Bitcoin deposit scanner...
```

## Troubleshooting

### Permission denied on bitcoin.conf
- Run as Administrator on Windows
- Check file permissions on Linux

### .env not found
- Ensure you're running from project root
- Specify full path when prompted

### RPC connection failed
- Verify Bitcoin Core is running
- Check credentials match in both files
- Ensure port 8332 is not blocked

## Security Notes

⚠️ **Important:**
- The generated password is 32 characters and cryptographically secure
- Credentials are backed up to `scripts/btc-node-credentials.txt`
- **DO NOT** commit credentials file to git (it's in .gitignore)
- Keep RPC access restricted to localhost only

## Rollback

To switch back to BlockCypher:

1. Edit `.env`:
   ```ini
   BTC_NODE="blockcypher"
   ```

2. Restart backend:
   ```bash
   cd backend && pnpm restart
   ```

The platform will automatically use BlockCypher when `BTC_NODE != "node"`.

---

**Script Location:** `scripts/btc-node-setup.mjs`
**Run Command:** `pnpm btc-node:setup`
**Credentials Backup:** `scripts/btc-node-credentials.txt`