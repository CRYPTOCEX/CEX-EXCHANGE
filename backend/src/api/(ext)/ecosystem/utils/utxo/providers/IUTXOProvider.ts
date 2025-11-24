/**
 * Interface for UTXO blockchain providers
 * All UTXO providers (BlockCypher, Mempool, Bitcoin Core Node) must implement this interface
 */

export interface UTXOTransaction {
  hash: string;
  blockHeight?: number;
  value: number; // in satoshis
  confirmedTime?: string;
  spent?: boolean;
  confirmations: number;
  inputs?: UTXOInput[];
  outputs?: UTXOOutput[];
  fee?: number; // in satoshis
}

export interface UTXOInput {
  prev_hash?: string;
  prevHash?: string;
  output_index?: number;
  outputIndex?: number;
  output_value: number; // in satoshis (converted from provider format)
  addresses: string[];
  script?: string;
}

export interface UTXOOutput {
  value: number; // in satoshis (converted from provider format)
  addresses: string[];
  script?: string;
  spent?: boolean;
  spender?: string;
  spent_by?: string;
}

export interface UTXOTransactionDetails {
  hash: string;
  block_height?: number;
  confirmations?: number;
  fee?: number; // in satoshis
  inputs: UTXOInput[];
  outputs: UTXOOutput[];
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number; // in satoshis
  confirmations: number;
  script?: string;
}

export interface IUTXOProvider {
  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Fetch transactions for an address
   */
  fetchTransactions(address: string): Promise<UTXOTransaction[]>;

  /**
   * Fetch full transaction details by hash
   */
  fetchTransaction(txHash: string): Promise<UTXOTransactionDetails | null>;

  /**
   * Fetch raw transaction hex by hash
   */
  fetchRawTransaction(txHash: string): Promise<string>;

  /**
   * Get balance for an address
   */
  getBalance(address: string): Promise<number>;

  /**
   * Get UTXOs for an address
   */
  getUTXOs(address: string): Promise<UTXO[]>;

  /**
   * Broadcast a raw transaction
   */
  broadcastTransaction(rawTxHex: string): Promise<{ success: boolean; txid: string | null; error?: string }>;

  /**
   * Get current fee rate per byte
   */
  getFeeRate(): Promise<number>;

  /**
   * Check if provider is available/responding
   */
  isAvailable(): Promise<boolean>;
}