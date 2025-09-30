/**
 * BlockCypher Provider for UTXO chains
 * Commercial API with free tier (200 requests/hour)
 * Supports: BTC, LTC, DOGE, DASH
 */

import { IUTXOProvider, UTXOTransaction, UTXOTransactionDetails, UTXO, UTXOInput, UTXOOutput } from './IUTXOProvider';
import { logError } from '@b/utils/logger';

export class BlockCypherProvider implements IUTXOProvider {
  private baseURL: string;
  private chain: string;
  private token: string | undefined;
  private timeout: number = 30000;

  constructor(chain: string) {
    this.chain = chain;
    this.token = process.env.BLOCKCYPHER_TOKEN;
    this.baseURL = this.getBaseURL(chain);
  }

  private getBaseURL(chain: string): string {
    const network = chain === 'BTC' && process.env.BTC_NETWORK === 'testnet' ? 'test3' : 'main';

    const urls = {
      'BTC': `https://api.blockcypher.com/v1/btc/${network}`,
      'LTC': 'https://api.blockcypher.com/v1/ltc/main',
      'DASH': 'https://api.blockcypher.com/v1/dash/main',
      'DOGE': 'https://api.blockcypher.com/v1/doge/main',
    };

    if (!urls[chain]) {
      throw new Error(`BlockCypher provider not available for ${chain}`);
    }

    return urls[chain];
  }

  getName(): string {
    return `BlockCypher (${this.chain})`;
  }

  private addToken(url: string): string {
    if (this.token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${this.token}`;
    }
    return url;
  }

  private async fetchFromAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = this.addToken(`${this.baseURL}${endpoint}`);

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logError('blockcypher_provider_fetch', error, __filename);
      throw error;
    }
  }

  async fetchTransactions(address: string): Promise<UTXOTransaction[]> {
    try {
      const data = await this.fetchFromAPI(`/addrs/${address}`);

      if (!Array.isArray(data.txrefs)) {
        return [];
      }

      return data.txrefs.map((tx: any) => ({
        hash: tx.tx_hash,
        blockHeight: tx.block_height,
        value: tx.value, // in satoshis
        confirmedTime: tx.confirmed,
        spent: tx.spent,
        confirmations: tx.confirmations,
      }));
    } catch (error) {
      logError('blockcypher_fetch_transactions', error, __filename);
      return [];
    }
  }

  async fetchTransaction(txHash: string): Promise<UTXOTransactionDetails | null> {
    try {
      const tx = await this.fetchFromAPI(`/txs/${txHash}`);

      // Parse inputs
      const inputs: UTXOInput[] = tx.inputs.map((input: any) => ({
        prev_hash: input.prev_hash,
        prevHash: input.prev_hash,
        output_index: input.output_index,
        outputIndex: input.output_index,
        output_value: input.output_value, // in satoshis
        addresses: input.addresses || [],
        script: input.script,
      }));

      // Parse outputs
      const outputs: UTXOOutput[] = tx.outputs.map((output: any) => ({
        value: output.value, // in satoshis
        addresses: output.addresses || [],
        script: output.script,
        spent: output.spent || false,
        spent_by: output.spent_by,
        spender: output.spent_by,
      }));

      return {
        hash: tx.hash,
        block_height: tx.block_height,
        confirmations: tx.confirmations,
        fee: tx.fees, // in satoshis
        inputs: inputs,
        outputs: outputs,
      };
    } catch (error) {
      logError('blockcypher_fetch_transaction', error, __filename);
      return null;
    }
  }

  async fetchRawTransaction(txHash: string): Promise<string> {
    try {
      const data = await this.fetchFromAPI(`/txs/${txHash}?includeHex=true`);

      if (!data.hex) {
        throw new Error('Missing hex data in response');
      }

      return data.hex;
    } catch (error) {
      logError('blockcypher_fetch_raw_transaction', error, __filename);
      throw error;
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const data = await this.fetchFromAPI(`/addrs/${address}/balance`);

      if (data.error) {
        logError('blockcypher_get_balance', new Error(data.error), __filename);
        return 0;
      }

      return Number(data.final_balance) || 0; // in satoshis
    } catch (error) {
      logError('blockcypher_get_balance', error, __filename);
      return 0;
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      // BlockCypher doesn't have a direct UTXO endpoint
      // We need to get unspent transaction references
      const data = await this.fetchFromAPI(`/addrs/${address}?unspentOnly=true`);

      if (!Array.isArray(data.txrefs)) {
        return [];
      }

      return data.txrefs.map((ref: any) => ({
        txid: ref.tx_hash,
        vout: ref.tx_output_n,
        value: ref.value, // in satoshis
        confirmations: ref.confirmations,
        script: ref.script,
      }));
    } catch (error) {
      logError('blockcypher_get_utxos', error, __filename);
      return [];
    }
  }

  async broadcastTransaction(rawTxHex: string): Promise<{ success: boolean; txid: string | null; error?: string }> {
    try {
      const response = await this.fetchFromAPI('/txs/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx: rawTxHex }),
      });

      if (!response.tx || !response.tx.hash) {
        throw new Error('Transaction broadcast failed: No transaction ID returned');
      }

      return {
        success: true,
        txid: response.tx.hash,
      };
    } catch (error) {
      logError('blockcypher_broadcast_transaction', error, __filename);
      return {
        success: false,
        txid: null,
        error: error.message,
      };
    }
  }

  async getFeeRate(): Promise<number> {
    try {
      if (this.chain === 'BTC') {
        // Use blockchain.info for BTC fees
        const response = await fetch('https://api.blockchain.info/mempool/fees');
        const data = await response.json();
        const priority = process.env.BTC_FEE_RATE_PRIORITY || 'regular';
        return data[priority] || data.regular || 1;
      } else {
        // Use BlockCypher for other chains
        const data = await this.fetchFromAPI('');
        const mediumFeePerKb = data.medium_fee_per_kb || data.medium_fee_per_kbyte;
        return mediumFeePerKb / 1024; // Convert to sat/byte
      }
    } catch (error) {
      logError('blockcypher_get_fee_rate', error, __filename);
      return 1; // Default 1 sat/byte
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.fetchFromAPI('');
      return true;
    } catch (error) {
      return false;
    }
  }
}