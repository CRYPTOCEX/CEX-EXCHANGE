import { logError } from "@b/utils/logger";

interface BTCNodeConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class BitcoinNodeService {
  private static instance: BitcoinNodeService;
  private config: BTCNodeConfig;
  private rpcUrl: string;
  private walletName: string = "ecosystem_wallets";

  private constructor() {
    this.config = {
      host: process.env.BTC_NODE_HOST || "127.0.0.1",
      port: parseInt(process.env.BTC_NODE_PORT || "8332"),
      username: process.env.BTC_NODE_USER || "",
      password: process.env.BTC_NODE_PASSWORD || "",
    };
    this.rpcUrl = `http://${this.config.host}:${this.config.port}`;
  }

  public static async getInstance(): Promise<BitcoinNodeService> {
    if (!BitcoinNodeService.instance) {
      BitcoinNodeService.instance = new BitcoinNodeService();
      await BitcoinNodeService.instance.initialize();
    }
    return BitcoinNodeService.instance;
  }

  private async initialize(): Promise<void> {
    console.log(`[BTC_NODE] Initializing Bitcoin Core RPC connection`);
    try {
      // Test connection
      const info = await this.rpcCall("getblockchaininfo", []);
      console.log(`[BTC_NODE] Connected to Bitcoin Core - Blocks: ${info.blocks}, Chain: ${info.chain}`);

      // Create or load wallet
      await this.ensureWalletExists();
    } catch (error) {
      console.error(`[BTC_NODE] Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  private async ensureWalletExists(): Promise<void> {
    try {
      // Try to load wallet
      await this.rpcCall("loadwallet", [this.walletName]);
      console.log(`[BTC_NODE] Loaded existing wallet: ${this.walletName}`);
    } catch (error) {
      if (error.message.includes("not found") || error.message.includes("does not exist")) {
        // Create new wallet
        try {
          await this.rpcCall("createwallet", [
            this.walletName,
            false, // disable_private_keys (we only watch addresses)
            false, // blank
            "", // passphrase
            false, // avoid_reuse
            true, // descriptors
            false, // load_on_startup
          ]);
          console.log(`[BTC_NODE] Created new watch-only wallet: ${this.walletName}`);
        } catch (createError) {
          console.error(`[BTC_NODE] Failed to create wallet: ${createError.message}`);
        }
      } else if (error.message.includes("already loaded")) {
        console.log(`[BTC_NODE] Wallet already loaded: ${this.walletName}`);
      } else {
        throw error;
      }
    }
  }

  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");

    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          jsonrpc: "1.0",
          id: Date.now(),
          method,
          params,
        }),
      });

      const data: any = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC call failed");
      }

      return data.result;
    } catch (error) {
      logError("btc_node_rpc_call", error, __filename);
      throw error;
    }
  }

  private async walletRpcCall(method: string, params: any[] = []): Promise<any> {
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
    const walletUrl = `${this.rpcUrl}/wallet/${this.walletName}`;

    try {
      const response = await fetch(walletUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          jsonrpc: "1.0",
          id: Date.now(),
          method,
          params,
        }),
      });

      const data: any = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Wallet RPC call failed");
      }

      return data.result;
    } catch (error) {
      logError("btc_node_wallet_rpc_call", error, __filename);
      throw error;
    }
  }

  /**
   * Import address for watching (doesn't require private key)
   */
  public async importAddress(address: string, label: string = ""): Promise<void> {
    try {
      console.log(`[BTC_NODE] Importing address ${address} with label "${label}"`);
      await this.walletRpcCall("importaddress", [address, label, false]); // false = don't rescan
      console.log(`[BTC_NODE] Successfully imported address ${address}`);
    } catch (error) {
      if (error.message.includes("already have this key")) {
        console.log(`[BTC_NODE] Address ${address} already imported`);
      } else {
        console.error(`[BTC_NODE] Failed to import address ${address}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Get transactions for a specific address
   */
  public async getAddressTransactions(address: string): Promise<any[]> {
    try {
      console.log(`[BTC_NODE] Fetching transactions for address ${address}`);

      // List transactions from wallet
      const transactions = await this.walletRpcCall("listtransactions", ["*", 100, 0, true]);

      // Filter transactions for this address
      const addressTxs = transactions.filter((tx: any) => tx.address === address);

      console.log(`[BTC_NODE] Found ${addressTxs.length} transactions for address ${address}`);

      return addressTxs;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to get transactions for ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction details including inputs and outputs
   */
  public async getTransaction(txid: string): Promise<any> {
    try {
      console.log(`[BTC_NODE] Fetching transaction details for ${txid}`);

      const tx = await this.walletRpcCall("gettransaction", [txid, true]);

      // Get decoded transaction with inputs/outputs
      const decoded = tx.decoded || tx.hex;

      console.log(`[BTC_NODE] Retrieved transaction ${txid}: confirmations=${tx.confirmations}`);

      return {
        txid: tx.txid,
        confirmations: tx.confirmations,
        blockheight: tx.blockheight,
        blocktime: tx.blocktime,
        time: tx.time,
        amount: Math.abs(tx.amount), // Convert to positive
        fee: tx.fee ? Math.abs(tx.fee) : 0,
        hex: tx.hex,
        decoded: decoded,
      };
    } catch (error) {
      console.error(`[BTC_NODE] Failed to get transaction ${txid}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get raw transaction with full details
   */
  public async getRawTransaction(txid: string, verbose: boolean = true): Promise<any> {
    try {
      const tx = await this.rpcCall("getrawtransaction", [txid, verbose]);
      return tx;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to get raw transaction ${txid}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get balance for an address
   */
  public async getAddressBalance(address: string): Promise<number> {
    try {
      // Get unspent outputs for this address
      const unspent = await this.walletRpcCall("listunspent", [0, 9999999, [address]]);
      const balance = unspent.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);

      console.log(`[BTC_NODE] Balance for ${address}: ${balance} BTC`);
      return balance;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to get balance for ${address}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get blockchain info
   */
  public async getBlockchainInfo(): Promise<any> {
    return await this.rpcCall("getblockchaininfo", []);
  }

  /**
   * Scan blockchain for transactions to watched addresses
   * Use this to rescan for old transactions after importing addresses
   */
  public async rescanBlockchain(startHeight?: number): Promise<void> {
    try {
      console.log(`[BTC_NODE] Starting blockchain rescan${startHeight ? ` from height ${startHeight}` : ""}`);
      await this.rpcCall("rescanblockchain", startHeight ? [startHeight] : []);
      console.log(`[BTC_NODE] Rescan completed`);
    } catch (error) {
      console.error(`[BTC_NODE] Rescan failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if node is fully synced
   */
  public async isSynced(): Promise<boolean> {
    try {
      const info = await this.getBlockchainInfo();
      return info.blocks >= info.headers - 1; // Allow 1 block difference
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sync progress
   */
  public async getSyncProgress(): Promise<{ blocks: number; headers: number; progress: number }> {
    try {
      const info = await this.getBlockchainInfo();
      return {
        blocks: info.blocks,
        headers: info.headers,
        progress: (info.blocks / info.headers) * 100,
      };
    } catch (error) {
      return { blocks: 0, headers: 0, progress: 0 };
    }
  }

  /**
   * List unspent outputs for an address
   */
  public async listUnspent(address: string, minconf: number = 1): Promise<any[]> {
    try {
      // Get all UTXOs, then filter by address
      const utxos = await this.walletRpcCall("listunspent", [minconf, 9999999, [address]]);
      return utxos;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to list unspent for ${address}: ${error.message}`);
      return [];
    }
  }

  /**
   * Broadcast a raw transaction
   */
  public async sendRawTransaction(hexString: string): Promise<string> {
    try {
      const txid = await this.rpcCall("sendrawtransaction", [hexString]);
      console.log(`[BTC_NODE] Transaction broadcasted: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to broadcast transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimate smart fee
   */
  public async estimateSmartFee(confTarget: number): Promise<{ feerate?: number; errors?: string[] }> {
    try {
      const result = await this.rpcCall("estimatesmartfee", [confTarget]);
      return result;
    } catch (error) {
      console.error(`[BTC_NODE] Failed to estimate fee: ${error.message}`);
      return {};
    }
  }
}

export default BitcoinNodeService;