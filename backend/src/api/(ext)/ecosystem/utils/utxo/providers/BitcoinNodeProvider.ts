/**
 * Bitcoin Core Node Provider (Local RPC)
 * Self-hosted Bitcoin Core node with full control and privacy
 * Requires local Bitcoin Core installation with RPC enabled
 */

import { IUTXOProvider, UTXOTransaction, UTXOTransactionDetails, UTXO, UTXOInput, UTXOOutput } from './IUTXOProvider';
import { BitcoinNodeService } from '../btc-node';
import { BitcoinZMQService } from '../btc-zmq';
import { logger } from '@b/utils/console';

export class BitcoinNodeProvider implements IUTXOProvider {
  private nodeService: BitcoinNodeService;
  private zmqService: BitcoinZMQService | null = null;
  private chain: string;

  constructor(chain: string) {
    if (chain !== 'BTC') {
      throw new Error('Bitcoin Node provider only supports BTC');
    }
    this.chain = chain;
  }

  async initialize(): Promise<void> {
    this.nodeService = await BitcoinNodeService.getInstance();

    // Initialize ZMQ service if ZMQ endpoints are configured
    if (process.env.BTC_ZMQ_RAWTX) {
      try {
        this.zmqService = await BitcoinZMQService.getInstance();
        logger.success("BTC_NODE_PROVIDER", "ZMQ service initialized");
      } catch (error) {
        logger.warn("BTC_NODE_PROVIDER", `ZMQ service failed to initialize, falling back to polling: ${error.message}`);
      }
    }
  }

  /**
   * Watch address for deposits via ZMQ
   */
  async watchAddress(address: string, walletId: string): Promise<void> {
    if (this.zmqService) {
      await this.zmqService.watchAddress(address, walletId);
    }
  }

  getName(): string {
    return `Bitcoin Core Node (${this.chain})`;
  }

  async fetchTransactions(address: string): Promise<UTXOTransaction[]> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const txs = await this.nodeService.getAddressTransactions(address);

      return txs.map((tx: any) => ({
        hash: tx.txid,
        blockHeight: tx.blockheight || undefined,
        value: Math.abs(tx.amount * 100000000), // Convert BTC to satoshis
        confirmedTime: tx.time ? new Date(tx.time * 1000).toISOString() : undefined,
        spent: false,
        confirmations: tx.confirmations || 0,
      }));
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to fetch transactions", error);
      return [];
    }
  }

  async fetchTransaction(txHash: string): Promise<UTXOTransactionDetails | null> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const tx = await this.nodeService.getRawTransaction(txHash, true);

      if (!tx) {
        return null;
      }

      // Parse inputs
      const inputs: UTXOInput[] = await Promise.all(
        tx.vin.map(async (input: any) => {
          if (input.coinbase) {
            return {
              prev_hash: 'coinbase',
              prevHash: 'coinbase',
              output_index: 0,
              outputIndex: 0,
              output_value: 0,
              addresses: [],
            };
          }

          // Get previous transaction to get input value
          const prevTx = await this.nodeService.getRawTransaction(input.txid, true);
          const prevOut = prevTx?.vout[input.vout];

          return {
            prev_hash: input.txid,
            prevHash: input.txid,
            output_index: input.vout,
            outputIndex: input.vout,
            output_value: prevOut ? prevOut.value * 100000000 : 0, // Convert BTC to satoshis
            addresses: prevOut?.scriptPubKey?.addresses || [],
            script: prevOut?.scriptPubKey?.hex,
          };
        })
      );

      // Parse outputs
      const outputs: UTXOOutput[] = tx.vout.map((output: any) => ({
        value: output.value * 100000000, // Convert BTC to satoshis
        addresses: output.scriptPubKey?.addresses || [],
        script: output.scriptPubKey?.hex,
        spent: false, // Would need additional check
      }));

      // Calculate fee
      const totalInput = inputs.reduce((sum, input) => sum + input.output_value, 0);
      const totalOutput = outputs.reduce((sum, output) => sum + output.value, 0);
      const fee = totalInput - totalOutput;

      return {
        hash: tx.txid,
        block_height: tx.blockheight,
        confirmations: tx.confirmations,
        fee: fee, // in satoshis
        inputs: inputs,
        outputs: outputs,
      };
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to fetch transaction", error);
      return null;
    }
  }

  async fetchRawTransaction(txHash: string): Promise<string> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const tx = await this.nodeService.getRawTransaction(txHash, false);
      return tx;
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to fetch raw transaction", error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const balanceBTC = await this.nodeService.getAddressBalance(address);
      return balanceBTC * 100000000; // Convert BTC to satoshis
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to get balance", error);
      return 0;
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const utxos = await this.nodeService.listUnspent(address);

      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.amount * 100000000, // Convert BTC to satoshis
        confirmations: utxo.confirmations,
        script: utxo.scriptPubKey,
      }));
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to get UTXOs", error);
      return [];
    }
  }

  async broadcastTransaction(rawTxHex: string): Promise<{ success: boolean; txid: string | null; error?: string }> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      const txid = await this.nodeService.sendRawTransaction(rawTxHex);

      return {
        success: true,
        txid: txid,
      };
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to broadcast transaction", error);
      return {
        success: false,
        txid: null,
        error: error.message,
      };
    }
  }

  async getFeeRate(): Promise<number> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      // estimatesmartfee returns fee in BTC/kB, we need sat/byte
      const result = await this.nodeService.estimateSmartFee(6); // 6 blocks

      if (result.feerate) {
        const feePerKB = result.feerate * 100000000; // Convert BTC to satoshis
        return feePerKB / 1024; // Convert from sat/kB to sat/byte
      }

      return 1; // Default 1 sat/byte
    } catch (error) {
      logger.error("BTC_NODE_PROVIDER", "Failed to get fee rate", error);
      return 1;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.nodeService) {
        await this.initialize();
      }

      return await this.nodeService.isSynced();
    } catch (error) {
      return false;
    }
  }
}