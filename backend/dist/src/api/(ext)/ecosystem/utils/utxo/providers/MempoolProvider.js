"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MempoolProvider = void 0;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class MempoolProvider {
    constructor(chain) {
        this.timeout = 30000;
        this.chain = chain;
        this.baseURL = this.getBaseURL(chain);
    }
    getBaseURL(chain) {
        const urls = {
            'BTC': process.env.BTC_NETWORK === 'testnet'
                ? 'https://mempool.space/testnet/api'
                : 'https://mempool.space/api',
            'LTC': 'https://litecoinspace.org/api',
        };
        if (!urls[chain]) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Mempool provider not available for ${chain}` });
        }
        return urls[chain];
    }
    getName() {
        return `Mempool.space (${this.chain})`;
    }
    async fetchFromAPI(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!response.ok) {
                throw (0, error_1.createError)({ statusCode: response.status, message: `HTTP ${response.status}: ${response.statusText}` });
            }
            const contentType = response.headers.get('content-type');
            if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')) {
                return await response.json();
            }
            else {
                return await response.text();
            }
        }
        catch (error) {
            const enhancedError = this.enhanceError(error, url);
            throw enhancedError;
        }
    }
    enhanceError(error, url) {
        var _a, _b, _c, _d;
        let message = (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error';
        const details = [];
        if (error === null || error === void 0 ? void 0 : error.cause) {
            const cause = error.cause;
            if (cause.code)
                details.push(`code: ${cause.code}`);
            if (cause.syscall)
                details.push(`syscall: ${cause.syscall}`);
            if (cause.hostname)
                details.push(`host: ${cause.hostname}`);
            if (cause.message && cause.message !== message) {
                message = cause.message;
            }
            if ((_a = cause.cause) === null || _a === void 0 ? void 0 : _a.message) {
                message = cause.cause.message;
            }
        }
        if ((error === null || error === void 0 ? void 0 : error.name) === 'TimeoutError' || message.includes('timeout')) {
            message = `Request timed out after ${this.timeout}ms`;
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOTFOUND' || ((_b = error === null || error === void 0 ? void 0 : error.cause) === null || _b === void 0 ? void 0 : _b.code) === 'ENOTFOUND') {
            message = 'DNS lookup failed - host not found';
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'ECONNREFUSED' || ((_c = error === null || error === void 0 ? void 0 : error.cause) === null || _c === void 0 ? void 0 : _c.code) === 'ECONNREFUSED') {
            message = 'Connection refused';
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'ECONNRESET' || ((_d = error === null || error === void 0 ? void 0 : error.cause) === null || _d === void 0 ? void 0 : _d.code) === 'ECONNRESET') {
            message = 'Connection reset by server';
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'CERT_HAS_EXPIRED' || message.includes('certificate')) {
            message = 'SSL certificate error';
        }
        const urlPath = url.replace(this.baseURL, '');
        const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
        const enhancedMessage = `${message}${detailStr} [${urlPath}]`;
        const enhancedError = new Error(enhancedMessage);
        enhancedError.name = (error === null || error === void 0 ? void 0 : error.name) || 'FetchError';
        return enhancedError;
    }
    async fetchTransactions(address) {
        try {
            const txs = await this.fetchFromAPI(`/address/${address}/txs`);
            const currentHeight = await this.getCurrentBlockHeight();
            return txs.map((tx) => {
                const confirmations = tx.status.confirmed
                    ? currentHeight - tx.status.block_height + 1
                    : 0;
                let value = 0;
                tx.vout.forEach((output) => {
                    if (output.scriptpubkey_address === address) {
                        value += output.value;
                    }
                });
                return {
                    hash: tx.txid,
                    blockHeight: tx.status.block_height,
                    value: value,
                    confirmedTime: tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : undefined,
                    spent: false,
                    confirmations: confirmations,
                    fee: tx.fee,
                };
            });
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', `fetchTransactions(${address.slice(0, 8)}...)`, error);
            return [];
        }
    }
    async fetchTransaction(txHash) {
        try {
            const tx = await this.fetchFromAPI(`/tx/${txHash}`);
            const currentHeight = await this.getCurrentBlockHeight();
            const confirmations = tx.status.confirmed
                ? currentHeight - tx.status.block_height + 1
                : 0;
            const inputs = tx.vin.map((input) => {
                var _a, _b, _c;
                return ({
                    prev_hash: input.txid,
                    prevHash: input.txid,
                    output_index: input.vout,
                    outputIndex: input.vout,
                    output_value: ((_a = input.prevout) === null || _a === void 0 ? void 0 : _a.value) || 0,
                    addresses: ((_b = input.prevout) === null || _b === void 0 ? void 0 : _b.scriptpubkey_address) ? [input.prevout.scriptpubkey_address] : [],
                    script: (_c = input.prevout) === null || _c === void 0 ? void 0 : _c.scriptpubkey,
                });
            });
            const outputs = tx.vout.map((output) => ({
                value: output.value,
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
                fee: tx.fee,
                inputs: inputs,
                outputs: outputs,
            };
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', `fetchTransaction(${txHash.slice(0, 8)}...)`, error);
            return null;
        }
    }
    async fetchRawTransaction(txHash) {
        try {
            const hex = await this.fetchFromAPI(`/tx/${txHash}/hex`);
            return hex;
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', `fetchRawTransaction(${txHash.slice(0, 8)}...)`, error);
            throw error;
        }
    }
    async getBalance(address) {
        try {
            const data = await this.fetchFromAPI(`/address/${address}`);
            const funded = data.chain_stats.funded_txo_sum || 0;
            const spent = data.chain_stats.spent_txo_sum || 0;
            return funded - spent;
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', `getBalance(${address.slice(0, 8)}...)`, error);
            return 0;
        }
    }
    async getUTXOs(address) {
        try {
            const utxos = await this.fetchFromAPI(`/address/${address}/utxo`);
            const currentHeight = await this.getCurrentBlockHeight();
            return utxos.map((utxo) => ({
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value,
                confirmations: utxo.status.confirmed
                    ? currentHeight - utxo.status.block_height + 1
                    : 0,
                script: utxo.scriptpubkey,
            }));
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', `getUTXOs(${address.slice(0, 8)}...)`, error);
            return [];
        }
    }
    async broadcastTransaction(rawTxHex) {
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
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', 'broadcastTransaction', error);
            return {
                success: false,
                txid: null,
                error: error.message,
            };
        }
    }
    async getFeeRate() {
        try {
            const fees = await this.fetchFromAPI('/v1/fees/recommended');
            const feeRatePriority = process.env.BTC_FEE_RATE_PRIORITY || 'halfHourFee';
            return fees[feeRatePriority] || fees.halfHourFee || fees.fastestFee;
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', 'getFeeRate', error);
            return 1;
        }
    }
    async getCurrentBlockHeight() {
        try {
            const height = await this.fetchFromAPI('/blocks/tip/height');
            return parseInt(height);
        }
        catch (error) {
            console_1.logger.error('MEMPOOL', 'getCurrentBlockHeight', error);
            return 0;
        }
    }
    async isAvailable() {
        try {
            await this.fetchFromAPI('/blocks/tip/height');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.MempoolProvider = MempoolProvider;
