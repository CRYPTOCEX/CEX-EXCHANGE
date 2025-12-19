/**
 * Mempool.space Provider for UTXO chains
 * Free, unlimited API with excellent support for Bitcoin and Litecoin
 * https://mempool.space/docs/api
 */

import { IUTXOProvider, UTXOTransaction, UTXOTransactionDetails, UTXO, UTXOInput, UTXOOutput } from './IUTXOProvider';
import { logger } from '@b/utils/console';

export class MempoolProvider implements IUTXOProvider {
  private baseURL: string;
  private chain: string;
  private timeout: number = 30000;

  constructor(chain: string) {
    this.chain = chain;
    this.baseURL = this.getBaseURL(chain);
  }

  private getBaseURL(chain: string): string {
    const urls = {
      'BTC': process.env.BTC_NETWORK === 'testnet'
        ? 'https://mempool.space/testnet/api'
        : 'https://mempool.space/api',
      'LTC': 'https://litecoinspace.org/api',
    };

    if (!urls[chain]) {
      throw new Error(`Mempool provider not available for ${chain}`);
    }

    return urls[chain];
  }

  getName(): string {
    return `Mempool.space (${this.chain})`;
  }

  private async fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      // Enhance the error with more context for debugging
      const enhancedError = this.enhanceError(error, url);
      throw enhancedError;
    }
  }

  private enhanceError(error: any, url: string): Error {
    let message = error?.message || 'Unknown error';
    const details: string[] = [];

    // Extract the root cause from nested errors
    if (error?.cause) {
      const cause = error.cause;
      if (cause.code) details.push(`code: ${cause.code}`);
      if (cause.syscall) details.push(`syscall: ${cause.syscall}`);
      if (cause.hostname) details.push(`host: ${cause.hostname}`);
      if (cause.message && cause.message !== message) {
        message = cause.message;
      }
      // Check for deeper nested cause
      if (cause.cause?.message) {
        message = cause.cause.message;
      }
    }

    // Handle specific error types
    if (error?.name === 'TimeoutError' || message.includes('timeout')) {
      message = `Request timed out after ${this.timeout}ms`;
    } else if (error?.code === 'ENOTFOUND' || error?.cause?.code === 'ENOTFOUND') {
      message = 'DNS lookup failed - host not found';
    } else if (error?.code === 'ECONNREFUSED' || error?.cause?.code === 'ECONNREFUSED') {
      message = 'Connection refused';
    } else if (error?.code === 'ECONNRESET' || error?.cause?.code === 'ECONNRESET') {
      message = 'Connection reset by server';
    } else if (error?.code === 'CERT_HAS_EXPIRED' || message.includes('certificate')) {
      message = 'SSL certificate error';
    }

    // Build the final error message
    const urlPath = url.replace(this.baseURL, '');
    const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
    const enhancedMessage = `${message}${detailStr} [${urlPath}]`;

    const enhancedError = new Error(enhancedMessage);
    enhancedError.name = error?.name || 'FetchError';
    return enhancedError;
  }

  async fetchTransactions(address: string): Promise<UTXOTransaction[]> {
    try {
      const txs = await this.fetchFromAPI(`/address/${address}/txs`);
      const currentHeight = await this.getCurrentBlockHeight();

      return txs.map((tx: any) => {
        const confirmations = tx.status.confirmed
          ? currentHeight - tx.status.block_height + 1
          : 0;

        // Calculate value for this address
        let value = 0;
        tx.vout.forEach((output: any) => {
          if (output.scriptpubkey_address === address) {
            value += output.value;
          }
        });

        return {
          hash: tx.txid,
          blockHeight: tx.status.block_height,
          value: value, // in satoshis
          confirmedTime: tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : undefined,
          spent: false, // Would need additional check
          confirmations: confirmations,
          fee: tx.fee,
        };
      });
    } catch (error) {
      logger.error('MEMPOOL', `fetchTransactions(${address.slice(0, 8)}...)`, error);
      return [];
    }
  }

  async fetchTransaction(txHash: string): Promise<UTXOTransactionDetails | null> {
    try {
      const tx = await this.fetchFromAPI(`/tx/${txHash}`);
      const currentHeight = await this.getCurrentBlockHeight();

      const confirmations = tx.status.confirmed
        ? currentHeight - tx.status.block_height + 1
        : 0;

      // Parse inputs
      const inputs: UTXOInput[] = tx.vin.map((input: any) => ({
        prev_hash: input.txid,
        prevHash: input.txid,
        output_index: input.vout,
        outputIndex: input.vout,
        output_value: input.prevout?.value || 0, // Already in satoshis
        addresses: input.prevout?.scriptpubkey_address ? [input.prevout.scriptpubkey_address] : [],
        script: input.prevout?.scriptpubkey,
      }));

      // Parse outputs
      const outputs: UTXOOutput[] = tx.vout.map((output: any) => ({
        value: output.value, // Already in satoshis
        addresses: output.scriptpubkey_address ? [output.scriptpubkey_address] : [],
        script: output.scriptpubkey,
        spent: output.spent || false,
        spent_by: output.spent_by,
        spender: output.spent_by,
      }));

      return {
        hash: tx.txid,
        block_height: tx.status.block_height,
        confirmations: confirmations,
        fee: tx.fee, // Already in satoshis
        inputs: inputs,
        outputs: outputs,
      };
    } catch (error) {
      logger.error('MEMPOOL', `fetchTransaction(${txHash.slice(0, 8)}...)`, error);
      return null;
    }
  }

  async fetchRawTransaction(txHash: string): Promise<string> {
    try {
      const hex = await this.fetchFromAPI(`/tx/${txHash}/hex`);
      return hex;
    } catch (error) {
      logger.error('MEMPOOL', `fetchRawTransaction(${txHash.slice(0, 8)}...)`, error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const data = await this.fetchFromAPI(`/address/${address}`);

      const funded = data.chain_stats.funded_txo_sum || 0;
      const spent = data.chain_stats.spent_txo_sum || 0;

      return funded - spent; // Returns satoshis
    } catch (error) {
      logger.error('MEMPOOL', `getBalance(${address.slice(0, 8)}...)`, error);
      return 0;
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const utxos = await this.fetchFromAPI(`/address/${address}/utxo`);
      const currentHeight = await this.getCurrentBlockHeight();

      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value, // in satoshis
        confirmations: utxo.status.confirmed
          ? currentHeight - utxo.status.block_height + 1
          : 0,
        script: utxo.scriptpubkey,
      }));
    } catch (error) {
      logger.error('MEMPOOL', `getUTXOs(${address.slice(0, 8)}...)`, error);
      return [];
    }
  }

  async broadcastTransaction(rawTxHex: string): Promise<{ success: boolean; txid: string | null; error?: string }> {
    try {
      const txid = await this.fetchFromAPI('/tx', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: rawTxHex,
      });

      return {
        success: true,
        txid: txid,
      };
    } catch (error) {
      logger.error('MEMPOOL', 'broadcastTransaction', error);
      return {
        success: false,
        txid: null,
        error: error.message,
      };
    }
  }

  async getFeeRate(): Promise<number> {
    try {
      const fees = await this.fetchFromAPI('/v1/fees/recommended');

      // Return the "half hour" fee rate as default
      // You can choose: fastestFee, halfHourFee, hourFee, economyFee, minimumFee
      const feeRatePriority = process.env.BTC_FEE_RATE_PRIORITY || 'halfHourFee';

      return fees[feeRatePriority] || fees.halfHourFee || fees.fastestFee;
    } catch (error) {
      logger.error('MEMPOOL', 'getFeeRate', error);
      return 1; // Default 1 sat/vByte
    }
  }

  async getCurrentBlockHeight(): Promise<number> {
    try {
      const height = await this.fetchFromAPI('/blocks/tip/height');
      return parseInt(height);
    } catch (error) {
      logger.error('MEMPOOL', 'getCurrentBlockHeight', error);
      return 0;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.fetchFromAPI('/blocks/tip/height');
      return true;
    } catch (error) {
      return false;
    }
  }
}