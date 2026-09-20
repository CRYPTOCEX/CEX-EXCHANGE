"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericUTXONodeService = void 0;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class GenericUTXONodeService {
    constructor(chain) {
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
    getDefaultPort(chain) {
        const defaultPorts = {
            BTC: "8332",
            LTC: "9332",
            DOGE: "22555",
            DASH: "9998",
        };
        return defaultPorts[chain] || "8332";
    }
    async initialize() {
        console_1.logger.info(`${this.config.chain}_NODE`, `Initializing ${this.config.chain} Core RPC connection`);
        try {
            const info = await this.rpcCall("getblockchaininfo", []);
            console_1.logger.success(`${this.config.chain}_NODE`, `Connected - Blocks: ${info.blocks}, Chain: ${info.chain}`);
            await this.ensureWalletExists();
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to initialize: ${error.message}`);
            throw error;
        }
    }
    async ensureWalletExists() {
        try {
            await this.rpcCall("loadwallet", [this.config.walletName]);
            console_1.logger.info(`${this.config.chain}_NODE`, `Loaded existing wallet: ${this.config.walletName}`);
        }
        catch (error) {
            if (error.message.includes("not found") || error.message.includes("does not exist")) {
                try {
                    await this.rpcCall("createwallet", [
                        this.config.walletName,
                        false,
                        false,
                        "",
                        false,
                        true,
                        false,
                    ]);
                    console_1.logger.success(`${this.config.chain}_NODE`, `Created new watch-only wallet: ${this.config.walletName}`);
                }
                catch (createError) {
                    if (createError.message.includes("descriptors")) {
                        await this.rpcCall("createwallet", [
                            this.config.walletName,
                            false,
                            false,
                            "",
                            false,
                        ]);
                        console_1.logger.success(`${this.config.chain}_NODE`, `Created wallet (legacy mode): ${this.config.walletName}`);
                    }
                    else {
                        console_1.logger.error(`${this.config.chain}_NODE`, `Failed to create wallet: ${createError.message}`);
                    }
                }
            }
            else if (error.message.includes("already loaded")) {
                console_1.logger.info(`${this.config.chain}_NODE`, `Wallet already loaded: ${this.config.walletName}`);
            }
            else {
                throw error;
            }
        }
    }
    async rpcCall(method, params = []) {
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
            const data = await response.json();
            if (data.error) {
                throw (0, error_1.createError)({ statusCode: 500, message: data.error.message || "RPC call failed" });
            }
            return data.result;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, "RPC call failed", error);
            throw error;
        }
    }
    async walletRpcCall(method, params = []) {
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
            const data = await response.json();
            if (data.error) {
                throw (0, error_1.createError)({ statusCode: 500, message: data.error.message || "Wallet RPC call failed" });
            }
            return data.result;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, "Wallet RPC call failed", error);
            throw error;
        }
    }
    async importAddress(address, label = "") {
        try {
            console_1.logger.debug(`${this.config.chain}_NODE`, `Importing address ${address}`);
            await this.walletRpcCall("importaddress", [address, label, false]);
            console_1.logger.info(`${this.config.chain}_NODE`, `Successfully imported address ${address}`);
        }
        catch (error) {
            if (error.message.includes("already have this key")) {
                console_1.logger.debug(`${this.config.chain}_NODE`, `Address ${address} already imported`);
            }
            else {
                throw error;
            }
        }
    }
    async getAddressTransactions(address) {
        try {
            const transactions = await this.walletRpcCall("listtransactions", ["*", 100, 0, true]);
            const addressTxs = transactions.filter((tx) => tx.address === address);
            return addressTxs;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to get transactions for ${address}: ${error.message}`);
            throw error;
        }
    }
    async getAddressBalance(address) {
        try {
            const unspent = await this.walletRpcCall("listunspent", [0, 9999999, [address]]);
            const balance = unspent.reduce((sum, utxo) => sum + utxo.amount, 0);
            return balance;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to get balance for ${address}: ${error.message}`);
            return 0;
        }
    }
    async listUnspent(address, minconf = 1) {
        try {
            const utxos = await this.walletRpcCall("listunspent", [minconf, 9999999, [address]]);
            return utxos;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to list unspent for ${address}: ${error.message}`);
            return [];
        }
    }
    async getBlockchainInfo() {
        return await this.rpcCall("getblockchaininfo", []);
    }
    async getRawTransaction(txid, verbose = true) {
        try {
            return await this.rpcCall("getrawtransaction", [txid, verbose]);
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to get raw transaction ${txid}: ${error.message}`);
            throw error;
        }
    }
    async decodeRawTransaction(txHex) {
        try {
            return await this.rpcCall("decoderawtransaction", [txHex]);
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to decode raw transaction: ${error.message}`);
            throw error;
        }
    }
    async sendRawTransaction(hexString) {
        try {
            const txid = await this.rpcCall("sendrawtransaction", [hexString]);
            console_1.logger.success(`${this.config.chain}_NODE`, `Transaction broadcasted: ${txid}`);
            return txid;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to broadcast transaction: ${error.message}`);
            throw error;
        }
    }
    async estimateSmartFee(confTarget) {
        try {
            return await this.rpcCall("estimatesmartfee", [confTarget]);
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to estimate fee: ${error.message}`);
            return {};
        }
    }
    async getMempoolInfo() {
        try {
            return await this.rpcCall("getmempoolinfo", []);
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to get mempool info: ${error.message}`);
            return null;
        }
    }
    async getRawMempool(verbose = false) {
        try {
            return await this.rpcCall("getrawmempool", [verbose]);
        }
        catch (error) {
            return verbose ? {} : [];
        }
    }
    async getMempoolEntry(txid) {
        try {
            return await this.rpcCall("getmempoolentry", [txid]);
        }
        catch (error) {
            return null;
        }
    }
    async bumpFee(txid, options) {
        try {
            console_1.logger.info(`${this.config.chain}_NODE`, `Bumping fee for transaction ${txid}`);
            const bumpOptions = {};
            if (options === null || options === void 0 ? void 0 : options.confTarget) {
                bumpOptions.conf_target = options.confTarget;
            }
            if (options === null || options === void 0 ? void 0 : options.feeRate) {
                bumpOptions.fee_rate = options.feeRate;
            }
            const result = await this.walletRpcCall("bumpfee", [txid, bumpOptions]);
            console_1.logger.success(`${this.config.chain}_NODE`, `Fee bumped successfully: newTxid=${result.txid}, originalFee=${result.origfee}, newFee=${result.fee}`);
            return result;
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to bump fee for ${txid}: ${error.message}`);
            throw error;
        }
    }
    async isRBFSignaled(txid) {
        try {
            const tx = await this.getRawTransaction(txid, true);
            if (!tx)
                return false;
            for (const input of tx.vin) {
                if (input.sequence < 0xfffffffe) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    async abandonTransaction(txid) {
        try {
            console_1.logger.info(`${this.config.chain}_NODE`, `Abandoning transaction ${txid}`);
            await this.walletRpcCall("abandontransaction", [txid]);
            console_1.logger.success(`${this.config.chain}_NODE`, `Transaction ${txid} abandoned successfully`);
        }
        catch (error) {
            console_1.logger.error(`${this.config.chain}_NODE`, `Failed to abandon transaction ${txid}: ${error.message}`);
            throw error;
        }
    }
    async isSynced() {
        try {
            const info = await this.getBlockchainInfo();
            return info.blocks >= info.headers - 1;
        }
        catch (error) {
            return false;
        }
    }
    async getSyncProgress() {
        try {
            const info = await this.getBlockchainInfo();
            return {
                blocks: info.blocks,
                headers: info.headers,
                progress: (info.blocks / info.headers) * 100,
            };
        }
        catch (error) {
            return { blocks: 0, headers: 0, progress: 0 };
        }
    }
    async getTransactionStatus(txid) {
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
        }
        catch (error) {
            return {
                confirmed: false,
                confirmations: 0,
                inMempool: false,
            };
        }
    }
    getChain() {
        return this.config.chain;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.GenericUTXONodeService = GenericUTXONodeService;
exports.default = GenericUTXONodeService;
