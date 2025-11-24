import { logError } from "@b/utils/logger";

interface UTXONodeConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  chain: string;
  walletName: string;
}

/**
 * Generic UTXO Node Service
 * Works with Bitcoin, Litecoin, Dogecoin, Dash (all Bitcoin forks)
 */
export class GenericUTXONodeService {
  private config: UTXONodeConfig;
  private rpcUrl: string;

  constructor(chain: 'BTC' | 'LTC' | 'DOGE' | 'DASH') {
    const chainLower = chain.toLowerCase();

    this.config = {
      host: process.env[`${chain}_NODE_HOST`] || "127.0.0.1",
      port: parseInt(process.env[`${chain}_NODE_PORT`] || this.getDefaultPort(chain)),
      username: process.env[`${chain}_NODE_USER`] || "",
      password: process.env[`${chain}_NODE_PASSWORD`] || "",
      chain: chain,
      walletName: `ecosystem_${chainLower}_wallets`,
    };

    this.rpcUrl = `http://${this.config.host}:${this.config.port}`;
  }

  private getDefaultPort(chain: string): string {
    const defaultPorts: Record<string, string> = {
      BTC: "8332",
      LTC: "9332",
      DOGE: "22555",
      DASH: "9998",
    };
    return defaultPorts[chain] || "8332";
  }

  public async initialize(): Promise<void> {
    console.log(`[${this.config.chain}_NODE] Initializing ${this.config.chain} Core RPC connection`);
    try {
      const info = await this.rpcCall("getblockchaininfo", []);
      console.log(`[${this.config.chain}_NODE] Connected - Blocks: ${info.blocks}, Chain: ${info.chain}`);

      await this.ensureWalletExists();
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  private async ensureWalletExists(): Promise<void> {
    try {
      await this.rpcCall("loadwallet", [this.config.walletName]);
      console.log(`[${this.config.chain}_NODE] Loaded existing wallet: ${this.config.walletName}`);
    } catch (error) {
      if (error.message.includes("not found") || error.message.includes("does not exist")) {
        try {
          // Create watch-only wallet with descriptors (if supported)
          await this.rpcCall("createwallet", [
            this.config.walletName,
            false, // disable_private_keys
            false, // blank
            "",    // passphrase
            false, // avoid_reuse
            true,  // descriptors (may fail on older versions)
            false, // load_on_startup
          ]);
          console.log(`[${this.config.chain}_NODE] Created new watch-only wallet: ${this.config.walletName}`);
        } catch (createError) {
          if (createError.message.includes("descriptors")) {
            // Fallback: create without descriptors (older versions)
            await this.rpcCall("createwallet", [
              this.config.walletName,
              false,
              false,
              "",
              false,
            ]);
            console.log(`[${this.config.chain}_NODE] Created wallet (legacy mode): ${this.config.walletName}`);
          } else {
            console.error(`[${this.config.chain}_NODE] Failed to create wallet: ${createError.message}`);
          }
        }
      } else if (error.message.includes("already loaded")) {
        console.log(`[${this.config.chain}_NODE] Wallet already loaded: ${this.config.walletName}`);
      } else {
        throw error;
      }
    }
  }

  protected async rpcCall(method: string, params: any[] = []): Promise<any> {
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
      logError(`${this.config.chain.toLowerCase()}_node_rpc_call`, error, __filename);
      throw error;
    }
  }

  private async walletRpcCall(method: string, params: any[] = []): Promise<any> {
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
    const walletUrl = `${this.rpcUrl}/wallet/${this.config.walletName}`;

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
      logError(`${this.config.chain.toLowerCase()}_node_wallet_rpc_call`, error, __filename);
      throw error;
    }
  }

  // ============ Wallet Operations ============

  public async importAddress(address: string, label: string = ""): Promise<void> {
    try {
      console.log(`[${this.config.chain}_NODE] Importing address ${address}`);
      await this.walletRpcCall("importaddress", [address, label, false]);
      console.log(`[${this.config.chain}_NODE] Successfully imported address ${address}`);
    } catch (error) {
      if (error.message.includes("already have this key")) {
        console.log(`[${this.config.chain}_NODE] Address ${address} already imported`);
      } else {
        throw error;
      }
    }
  }

  public async getAddressTransactions(address: string): Promise<any[]> {
    try {
      const transactions = await this.walletRpcCall("listtransactions", ["*", 100, 0, true]);
      const addressTxs = transactions.filter((tx: any) => tx.address === address);
      return addressTxs;
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to get transactions for ${address}: ${error.message}`);
      throw error;
    }
  }

  public async getAddressBalance(address: string): Promise<number> {
    try {
      const unspent = await this.walletRpcCall("listunspent", [0, 9999999, [address]]);
      const balance = unspent.reduce((sum: number, utxo: any) => sum + utxo.amount, 0);
      return balance;
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to get balance for ${address}: ${error.message}`);
      return 0;
    }
  }

  public async listUnspent(address: string, minconf: number = 1): Promise<any[]> {
    try {
      const utxos = await this.walletRpcCall("listunspent", [minconf, 9999999, [address]]);
      return utxos;
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to list unspent for ${address}: ${error.message}`);
      return [];
    }
  }

  // ============ Blockchain Operations ============

  public async getBlockchainInfo(): Promise<any> {
    return await this.rpcCall("getblockchaininfo", []);
  }

  public async getRawTransaction(txid: string, verbose: boolean = true): Promise<any> {
    try {
      return await this.rpcCall("getrawtransaction", [txid, verbose]);
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to get raw transaction ${txid}: ${error.message}`);
      throw error;
    }
  }

  public async decodeRawTransaction(txHex: string): Promise<any> {
    try {
      return await this.rpcCall("decoderawtransaction", [txHex]);
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to decode raw transaction: ${error.message}`);
      throw error;
    }
  }

  public async sendRawTransaction(hexString: string): Promise<string> {
    try {
      const txid = await this.rpcCall("sendrawtransaction", [hexString]);
      console.log(`[${this.config.chain}_NODE] Transaction broadcasted: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to broadcast transaction: ${error.message}`);
      throw error;
    }
  }

  // ============ Fee Estimation ============

  public async estimateSmartFee(confTarget: number): Promise<{ feerate?: number; errors?: string[] }> {
    try {
      return await this.rpcCall("estimatesmartfee", [confTarget]);
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to estimate fee: ${error.message}`);
      return {};
    }
  }

  // ============ Mempool Operations ============

  public async getMempoolInfo(): Promise<any> {
    try {
      return await this.rpcCall("getmempoolinfo", []);
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to get mempool info: ${error.message}`);
      return null;
    }
  }

  public async getRawMempool(verbose: boolean = false): Promise<any> {
    try {
      return await this.rpcCall("getrawmempool", [verbose]);
    } catch (error) {
      return verbose ? {} : [];
    }
  }

  public async getMempoolEntry(txid: string): Promise<any> {
    try {
      return await this.rpcCall("getmempoolentry", [txid]);
    } catch (error) {
      return null;
    }
  }

  // ============ RBF Operations ============

  public async bumpFee(txid: string, options?: { confTarget?: number; feeRate?: number }): Promise<{ txid: string; origfee: number; fee: number; errors?: string[] }> {
    try {
      console.log(`[${this.config.chain}_NODE] Bumping fee for transaction ${txid}`);

      const bumpOptions: any = {};
      if (options?.confTarget) {
        bumpOptions.conf_target = options.confTarget;
      }
      if (options?.feeRate) {
        bumpOptions.fee_rate = options.feeRate;
      }

      const result = await this.walletRpcCall("bumpfee", [txid, bumpOptions]);

      console.log(`[${this.config.chain}_NODE] Fee bumped successfully:`, {
        newTxid: result.txid,
        originalFee: result.origfee,
        newFee: result.fee,
      });

      return result;
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to bump fee for ${txid}: ${error.message}`);
      throw error;
    }
  }

  public async isRBFSignaled(txid: string): Promise<boolean> {
    try {
      const tx = await this.getRawTransaction(txid, true);
      if (!tx) return false;

      for (const input of tx.vin) {
        if (input.sequence < 0xfffffffe) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  public async abandonTransaction(txid: string): Promise<void> {
    try {
      console.log(`[${this.config.chain}_NODE] Abandoning transaction ${txid}`);
      await this.walletRpcCall("abandontransaction", [txid]);
      console.log(`[${this.config.chain}_NODE] Transaction ${txid} abandoned successfully`);
    } catch (error) {
      console.error(`[${this.config.chain}_NODE] Failed to abandon transaction ${txid}: ${error.message}`);
      throw error;
    }
  }

  // ============ Status Checks ============

  public async isSynced(): Promise<boolean> {
    try {
      const info = await this.getBlockchainInfo();
      return info.blocks >= info.headers - 1;
    } catch (error) {
      return false;
    }
  }

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

  public async getTransactionStatus(txid: string): Promise<{
    confirmed: boolean;
    confirmations: number;
    inMempool: boolean;
    mempoolInfo?: any;
  }> {
    try {
      const tx = await this.getRawTransaction(txid, true);

      if (tx && tx.confirmations > 0) {
        return {
          confirmed: true,
          confirmations: tx.confirmations,
          inMempool: false,
        };
      }

      const mempoolEntry = await this.getMempoolEntry(txid);

      if (mempoolEntry) {
        return {
          confirmed: false,
          confirmations: 0,
          inMempool: true,
          mempoolInfo: mempoolEntry,
        };
      }

      return {
        confirmed: false,
        confirmations: 0,
        inMempool: false,
      };
    } catch (error) {
      return {
        confirmed: false,
        confirmations: 0,
        inMempool: false,
      };
    }
  }

  // ============ Utility ============

  public getChain(): string {
    return this.config.chain;
  }

  public getConfig(): UTXONodeConfig {
    return { ...this.config };
  }
}

export default GenericUTXONodeService;