"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockCypherProvider = void 0;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class BlockCypherProvider {
    constructor(chain) {
        this.timeout = 30000;
        this.chain = chain;
        this.token = process.env.BLOCKCYPHER_TOKEN;
        this.baseURL = this.getBaseURL(chain);
    }
    getBaseURL(chain) {
        const network = chain === 'BTC' && process.env.BTC_NETWORK === 'testnet' ? 'test3' : 'main';
        const urls = {
            'BTC': `https://api.blockcypher.com/v1/btc/${network}`,
            'LTC': 'https://api.blockcypher.com/v1/ltc/main',
            'DASH': 'https://api.blockcypher.com/v1/dash/main',
            'DOGE': 'https://api.blockcypher.com/v1/doge/main',
        };
        if (!urls[chain]) {
            throw (0, error_1.createError)({ statusCode: 400, message: `BlockCypher provider not available for ${chain}` });
        }
        return urls[chain];
    }
    getName() {
        return `BlockCypher (${this.chain})`;
    }
    addToken(url) {
        if (this.token) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}token=${this.token}`;
        }
        return url;
    }
    async fetchFromAPI(endpoint, options = {}) {
        const url = this.addToken(`${this.baseURL}${endpoint}`);
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: response.status, message: `HTTP ${response.status}: ${response.statusText}` });
            }
            return await response.json();
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to fetch from API', error);
            throw error;
        }
    }
    async fetchTransactions(address) {
        try {
            const data = await this.fetchFromAPI(`/addrs/${address}`);
            if (!Array.isArray(data.txrefs)) {
                return [];
            }
            return data.txrefs.map((tx) => ({
                hash: tx.tx_hash,
                blockHeight: tx.block_height,
                value: tx.value,
                confirmedTime: tx.confirmed,
                spent: tx.spent,
                confirmations: tx.confirmations,
            }));
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to fetch transactions', error);
            return [];
        }
    }
    async fetchTransaction(txHash) {
        try {
            const tx = await this.fetchFromAPI(`/txs/${txHash}`);
            const inputs = tx.inputs.map((input) => ({
                prev_hash: input.prev_hash,
                prevHash: input.prev_hash,
                output_index: input.output_index,
                outputIndex: input.output_index,
                output_value: input.output_value,
                addresses: input.addresses || [],
                script: input.script,
            }));
            const outputs = tx.outputs.map((output) => ({
                value: output.value,
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
                fee: tx.fees,
                inputs: inputs,
                outputs: outputs,
            };
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to fetch transaction details', error);
            return null;
        }
    }
    async fetchRawTransaction(txHash) {
        try {
            const data = await this.fetchFromAPI(`/txs/${txHash}?includeHex=true`);
            if (!data.hex) {
                throw (0, error_1.createError)({ statusCode: 500, message: 'Missing hex data in response' });
            }
            return data.hex;
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to fetch raw transaction', error);
            throw error;
        }
    }
    async getBalance(address) {
        try {
            const data = await this.fetchFromAPI(`/addrs/${address}/balance`);
            if (data.error) {
                console_1.logger.error('BLOCKCYPHER', `Failed to get balance: ${data.error}`);
                return 0;
            }
            return Number(data.final_balance) || 0;
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to get balance', error);
            return 0;
        }
    }
    async getUTXOs(address) {
        try {
            const data = await this.fetchFromAPI(`/addrs/${address}?unspentOnly=true`);
            if (!Array.isArray(data.txrefs)) {
                return [];
            }
            return data.txrefs.map((ref) => ({
                txid: ref.tx_hash,
                vout: ref.tx_output_n,
                value: ref.value,
                confirmations: ref.confirmations,
                script: ref.script,
            }));
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to get UTXOs', error);
            return [];
        }
    }
    async broadcastTransaction(rawTxHex) {
        try {
            const response = await this.fetchFromAPI('/txs/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tx: rawTxHex }),
            });
            if (!response.tx || !response.tx.hash) {
                throw (0, error_1.createError)({ statusCode: 500, message: 'Transaction broadcast failed: No transaction ID returned' });
            }
            return {
                success: true,
                txid: response.tx.hash,
            };
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to broadcast transaction', error);
            return {
                success: false,
                txid: null,
                error: error.message,
            };
        }
    }
    async getFeeRate() {
        try {
            if (this.chain === 'BTC') {
                const response = await fetch('https://api.blockchain.info/mempool/fees');
                const data = await response.json();
                const priority = process.env.BTC_FEE_RATE_PRIORITY || 'regular';
                return data[priority] || data.regular || 1;
            }
            else {
                const data = await this.fetchFromAPI('');
                const mediumFeePerKb = data.medium_fee_per_kb || data.medium_fee_per_kbyte;
                return mediumFeePerKb / 1024;
            }
        }
        catch (error) {
            console_1.logger.error('BLOCKCYPHER', 'Failed to get fee rate', error);
            return 1;
        }
    }
    async isAvailable() {
        try {
            await this.fetchFromAPI('');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.BlockCypherProvider = BlockCypherProvider;
