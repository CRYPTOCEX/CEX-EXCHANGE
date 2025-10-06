import * as zmq from 'zeromq';
import { logError } from '@b/utils/logger';
import { BitcoinNodeService } from './btc-node';
import { models } from '@b/db';

// Extension module - using safe import
let storeAndBroadcastTransaction: any;
try {
  const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
  storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
} catch (e) {
  // Extension not available
}

interface ZMQConfig {
  rawTxEndpoint: string;
  rawBlockEndpoint: string;
  hashTxEndpoint: string;
  hashBlockEndpoint: string;
}

export class BitcoinZMQService {
  private static instance: BitcoinZMQService;
  private config: ZMQConfig;
  private nodeService: BitcoinNodeService | null = null;

  // ZMQ sockets
  private rawTxSocket: zmq.Subscriber | null = null;
  private rawBlockSocket: zmq.Subscriber | null = null;
  private hashTxSocket: zmq.Subscriber | null = null;
  private hashBlockSocket: zmq.Subscriber | null = null;

  // Tracking
  private watchedAddresses: Set<string> = new Set();
  private addressToWalletId: Map<string, string> = new Map();
  private processedTxIds: Set<string> = new Set();
  private isRunning: boolean = false;
  private mempoolTxs: Map<string, { time: number; fee: number; addresses: string[] }> = new Map();

  private constructor() {
    this.config = {
      rawTxEndpoint: process.env.BTC_ZMQ_RAWTX || 'tcp://127.0.0.1:28333',
      rawBlockEndpoint: process.env.BTC_ZMQ_RAWBLOCK || 'tcp://127.0.0.1:28332',
      hashTxEndpoint: process.env.BTC_ZMQ_HASHTX || 'tcp://127.0.0.1:28334',
      hashBlockEndpoint: process.env.BTC_ZMQ_HASHBLOCK || 'tcp://127.0.0.1:28335',
    };
  }

  public static async getInstance(): Promise<BitcoinZMQService> {
    if (!BitcoinZMQService.instance) {
      BitcoinZMQService.instance = new BitcoinZMQService();
      await BitcoinZMQService.instance.initialize();
    }
    return BitcoinZMQService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      console.log('[BTC_ZMQ] Initializing Bitcoin ZMQ service...');

      // Get node service instance
      this.nodeService = await BitcoinNodeService.getInstance();

      // Start ZMQ listeners
      await this.startListeners();

      console.log('[BTC_ZMQ] Bitcoin ZMQ service initialized successfully');
    } catch (error) {
      console.error(`[BTC_ZMQ] Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  private async startListeners(): Promise<void> {
    try {
      // Raw Transaction Listener (for instant deposit detection)
      this.rawTxSocket = new zmq.Subscriber();
      this.rawTxSocket.connect(this.config.rawTxEndpoint);
      this.rawTxSocket.subscribe('rawtx');
      console.log(`[BTC_ZMQ] Connected to rawtx: ${this.config.rawTxEndpoint}`);

      // Raw Block Listener (for confirmations)
      this.rawBlockSocket = new zmq.Subscriber();
      this.rawBlockSocket.connect(this.config.rawBlockEndpoint);
      this.rawBlockSocket.subscribe('rawblock');
      console.log(`[BTC_ZMQ] Connected to rawblock: ${this.config.rawBlockEndpoint}`);

      // Hash Transaction Listener (lightweight)
      this.hashTxSocket = new zmq.Subscriber();
      this.hashTxSocket.connect(this.config.hashTxEndpoint);
      this.hashTxSocket.subscribe('hashtx');
      console.log(`[BTC_ZMQ] Connected to hashtx: ${this.config.hashTxEndpoint}`);

      this.isRunning = true;

      // Start processing loops
      this.processRawTransactions();
      this.processRawBlocks();
      this.processHashTransactions();

      console.log('[BTC_ZMQ] All ZMQ listeners started');
    } catch (error) {
      console.error(`[BTC_ZMQ] Failed to start listeners: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process raw transactions for instant deposit detection
   */
  private async processRawTransactions(): Promise<void> {
    if (!this.rawTxSocket) return;

    try {
      for await (const [topic, message] of this.rawTxSocket) {
        if (!this.isRunning) break;

        try {
          const txHex = message.toString('hex');
          const tx = await this.parseRawTransaction(txHex);

          if (tx) {
            await this.handleNewTransaction(tx, true); // true = from mempool
          }
        } catch (error) {
          console.error(`[BTC_ZMQ] Error processing raw transaction: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`[BTC_ZMQ] Raw transaction listener error: ${error.message}`);
    }
  }

  /**
   * Process raw blocks for confirmation updates
   */
  private async processRawBlocks(): Promise<void> {
    if (!this.rawBlockSocket) return;

    try {
      for await (const [topic, message] of this.rawBlockSocket) {
        if (!this.isRunning) break;

        try {
          console.log(`[BTC_ZMQ] New block received, updating confirmations...`);

          // Update all pending transactions with new confirmation counts
          await this.updatePendingTransactions();

          // Clean up old mempool transactions
          this.cleanupMempoolTxs();
        } catch (error) {
          console.error(`[BTC_ZMQ] Error processing block: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`[BTC_ZMQ] Raw block listener error: ${error.message}`);
    }
  }

  /**
   * Process hash transactions (lightweight notification)
   */
  private async processHashTransactions(): Promise<void> {
    if (!this.hashTxSocket) return;

    try {
      for await (const [topic, message] of this.hashTxSocket) {
        if (!this.isRunning) break;

        try {
          const txHash = message.toString('hex');
          // Just log for monitoring, main processing happens in rawtx
          console.log(`[BTC_ZMQ] New transaction hash: ${txHash}`);
        } catch (error) {
          console.error(`[BTC_ZMQ] Error processing tx hash: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`[BTC_ZMQ] Hash transaction listener error: ${error.message}`);
    }
  }

  /**
   * Parse raw transaction hex to extract addresses
   */
  private async parseRawTransaction(txHex: string): Promise<any> {
    try {
      if (!this.nodeService) return null;

      // Decode raw transaction using Bitcoin RPC
      const response = await this.nodeService.decodeRawTransaction(txHex);

      return {
        txid: response.txid,
        vout: response.vout,
        vin: response.vin,
        hex: txHex,
      };
    } catch (error) {
      console.error(`[BTC_ZMQ] Failed to parse raw transaction: ${error.message}`);
      return null;
    }
  }

  /**
   * Handle new transaction (from mempool or confirmed)
   */
  private async handleNewTransaction(tx: any, fromMempool: boolean): Promise<void> {
    try {
      // Skip if already processed
      if (this.processedTxIds.has(tx.txid)) {
        return;
      }

      // Check if any outputs match our watched addresses
      const matchedOutputs: { address: string; amount: number; vout: number }[] = [];

      for (let i = 0; i < tx.vout.length; i++) {
        const output = tx.vout[i];
        const addresses = output.scriptPubKey?.addresses ||
                         (output.scriptPubKey?.address ? [output.scriptPubKey.address] : []);

        for (const address of addresses) {
          if (this.watchedAddresses.has(address)) {
            matchedOutputs.push({
              address,
              amount: output.value,
              vout: i,
            });
          }
        }
      }

      if (matchedOutputs.length === 0) {
        return; // No watched addresses involved
      }

      console.log(`[BTC_ZMQ] 🎯 Detected transaction to watched address: ${tx.txid}`);
      console.log(`[BTC_ZMQ] Matched outputs:`, matchedOutputs);

      // Calculate fee (if available)
      let fee = 0;
      try {
        const fullTx = await this.nodeService?.getRawTransaction(tx.txid, true);
        if (fullTx) {
          fee = fullTx.fee ? Math.abs(fullTx.fee) : 0;
        }
      } catch (e) {
        // Fee estimation not available yet
      }

      // Store in mempool tracking if unconfirmed
      if (fromMempool) {
        this.mempoolTxs.set(tx.txid, {
          time: Date.now(),
          fee: fee,
          addresses: matchedOutputs.map(o => o.address),
        });

        console.log(`[BTC_ZMQ] ⚠️  0-conf transaction detected with fee: ${fee} BTC`);
      }

      // Process each matched output
      for (const output of matchedOutputs) {
        const walletId = this.addressToWalletId.get(output.address);
        if (!walletId) continue;

        const wallet = await models.wallet.findOne({
          where: { id: walletId },
          include: [{ model: models.user, as: 'user' }],
        });

        if (!wallet) continue;

        // Broadcast pending transaction (0 confirmations)
        if (storeAndBroadcastTransaction) {
          const txData = {
            walletId: wallet.id,
            chain: 'BTC',
            hash: tx.txid,
            transactionHash: tx.txid,
            type: fromMempool ? 'pending_confirmation' : 'DEPOSIT',
            from: 'N/A',
            address: output.address,
            amount: output.amount,
            fee: fee,
            confirmations: fromMempool ? 0 : 1,
            requiredConfirmations: 3, // BTC requires 3 confirmations
            status: fromMempool ? 'PENDING' : 'COMPLETED',
          };

          await storeAndBroadcastTransaction(txData, tx.txid, fromMempool);

          console.log(`[BTC_ZMQ] Broadcasted ${fromMempool ? 'pending' : 'confirmed'} transaction for wallet ${wallet.id}`);
        }
      }

      // Mark as processed
      this.processedTxIds.add(tx.txid);

      // Clean up old processed txs (keep last 1000)
      if (this.processedTxIds.size > 1000) {
        const toDelete = Array.from(this.processedTxIds).slice(0, 100);
        toDelete.forEach(txid => this.processedTxIds.delete(txid));
      }
    } catch (error) {
      console.error(`[BTC_ZMQ] Error handling transaction ${tx.txid}: ${error.message}`);
    }
  }

  /**
   * Update pending transactions with new confirmation counts
   */
  private async updatePendingTransactions(): Promise<void> {
    try {
      // Get all pending BTC transactions
      const pendingTxs = await models.transaction.findAll({
        where: {
          status: 'PENDING',
          chain: 'BTC',
        },
        include: [{ model: models.wallet, as: 'wallet' }],
      });

      for (const transaction of pendingTxs) {
        try {
          if (!transaction.trxId) continue;

          const tx = await this.nodeService?.getRawTransaction(transaction.trxId, true);
          if (!tx) continue;

          const confirmations = tx.confirmations || 0;

          // Update transaction with new confirmation count
          if (storeAndBroadcastTransaction) {
            const txData = {
              walletId: transaction.walletId,
              chain: 'BTC',
              hash: transaction.trxId,
              transactionHash: transaction.trxId,
              type: confirmations >= 3 ? 'DEPOSIT' : 'pending_confirmation',
              from: 'N/A',
              address: transaction.toAddress,
              amount: transaction.amount,
              fee: transaction.fee || 0,
              confirmations: confirmations,
              requiredConfirmations: 3,
              status: confirmations >= 3 ? 'COMPLETED' : 'PENDING',
            };

            await storeAndBroadcastTransaction(txData, transaction.trxId, confirmations < 3);

            console.log(`[BTC_ZMQ] Updated transaction ${transaction.trxId}: ${confirmations}/3 confirmations`);
          }
        } catch (error) {
          console.error(`[BTC_ZMQ] Error updating transaction ${transaction.id}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`[BTC_ZMQ] Error updating pending transactions: ${error.message}`);
    }
  }

  /**
   * Clean up old mempool transactions (older than 1 hour)
   */
  private cleanupMempoolTxs(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [txid, data] of this.mempoolTxs.entries()) {
      if (data.time < oneHourAgo) {
        this.mempoolTxs.delete(txid);
      }
    }
  }

  /**
   * Add address to watch list
   */
  public async watchAddress(address: string, walletId: string): Promise<void> {
    try {
      // Import address into Bitcoin Core watch-only wallet
      if (this.nodeService) {
        await this.nodeService.importAddress(address, `wallet_${walletId}`);
      }

      this.watchedAddresses.add(address);
      this.addressToWalletId.set(address, walletId);

      console.log(`[BTC_ZMQ] Now watching address ${address} for wallet ${walletId}`);
    } catch (error) {
      console.error(`[BTC_ZMQ] Failed to watch address ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove address from watch list
   */
  public unwatchAddress(address: string): void {
    this.watchedAddresses.delete(address);
    this.addressToWalletId.delete(address);
    console.log(`[BTC_ZMQ] Stopped watching address ${address}`);
  }

  /**
   * Get mempool transaction info
   */
  public getMempoolTx(txid: string): { time: number; fee: number; addresses: string[] } | undefined {
    return this.mempoolTxs.get(txid);
  }

  /**
   * Check if transaction is in mempool
   */
  public isInMempool(txid: string): boolean {
    return this.mempoolTxs.has(txid);
  }

  /**
   * Get all watched addresses
   */
  public getWatchedAddresses(): string[] {
    return Array.from(this.watchedAddresses);
  }

  /**
   * Stop ZMQ service
   */
  public async stop(): Promise<void> {
    console.log('[BTC_ZMQ] Stopping Bitcoin ZMQ service...');
    this.isRunning = false;

    if (this.rawTxSocket) await this.rawTxSocket.close();
    if (this.rawBlockSocket) await this.rawBlockSocket.close();
    if (this.hashTxSocket) await this.hashTxSocket.close();
    if (this.hashBlockSocket) await this.hashBlockSocket.close();

    console.log('[BTC_ZMQ] Bitcoin ZMQ service stopped');
  }
}

export default BitcoinZMQService;