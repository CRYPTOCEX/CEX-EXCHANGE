"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinZMQService = void 0;
const zmq = __importStar(require("zeromq"));
const console_1 = require("@b/utils/console");
const btc_node_1 = require("./btc-node");
const db_1 = require("@b/db");
let storeAndBroadcastTransaction;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) {
}
class BitcoinZMQService {
    constructor() {
        this.nodeService = null;
        this.rawTxSocket = null;
        this.rawBlockSocket = null;
        this.hashTxSocket = null;
        this.hashBlockSocket = null;
        this.watchedAddresses = new Set();
        this.addressToWalletId = new Map();
        this.processedTxIds = new Set();
        this.isRunning = false;
        this.mempoolTxs = new Map();
        this.config = {
            rawTxEndpoint: process.env.BTC_ZMQ_RAWTX || 'tcp://127.0.0.1:28333',
            rawBlockEndpoint: process.env.BTC_ZMQ_RAWBLOCK || 'tcp://127.0.0.1:28332',
            hashTxEndpoint: process.env.BTC_ZMQ_HASHTX || 'tcp://127.0.0.1:28334',
            hashBlockEndpoint: process.env.BTC_ZMQ_HASHBLOCK || 'tcp://127.0.0.1:28335',
        };
    }
    static async getInstance() {
        if (!BitcoinZMQService.instance) {
            BitcoinZMQService.instance = new BitcoinZMQService();
            await BitcoinZMQService.instance.initialize();
        }
        return BitcoinZMQService.instance;
    }
    async initialize() {
        try {
            console_1.logger.info("BTC_ZMQ", "Initializing Bitcoin ZMQ service...");
            this.nodeService = await btc_node_1.BitcoinNodeService.getInstance();
            await this.startListeners();
            console_1.logger.success("BTC_ZMQ", "Bitcoin ZMQ service initialized successfully");
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Failed to initialize: ${error.message}`);
            throw error;
        }
    }
    async startListeners() {
        try {
            this.rawTxSocket = new zmq.Subscriber();
            this.rawTxSocket.connect(this.config.rawTxEndpoint);
            this.rawTxSocket.subscribe('rawtx');
            console_1.logger.info("BTC_ZMQ", `Connected to rawtx: ${this.config.rawTxEndpoint}`);
            this.rawBlockSocket = new zmq.Subscriber();
            this.rawBlockSocket.connect(this.config.rawBlockEndpoint);
            this.rawBlockSocket.subscribe('rawblock');
            console_1.logger.info("BTC_ZMQ", `Connected to rawblock: ${this.config.rawBlockEndpoint}`);
            this.hashTxSocket = new zmq.Subscriber();
            this.hashTxSocket.connect(this.config.hashTxEndpoint);
            this.hashTxSocket.subscribe('hashtx');
            console_1.logger.info("BTC_ZMQ", `Connected to hashtx: ${this.config.hashTxEndpoint}`);
            this.isRunning = true;
            this.processRawTransactions();
            this.processRawBlocks();
            this.processHashTransactions();
            console_1.logger.success("BTC_ZMQ", "All ZMQ listeners started");
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Failed to start listeners: ${error.message}`);
            throw error;
        }
    }
    async processRawTransactions() {
        if (!this.rawTxSocket)
            return;
        try {
            for await (const [topic, message] of this.rawTxSocket) {
                if (!this.isRunning)
                    break;
                try {
                    const txHex = message.toString('hex');
                    const tx = await this.parseRawTransaction(txHex);
                    if (tx) {
                        await this.handleNewTransaction(tx, true);
                    }
                }
                catch (error) {
                    console_1.logger.error("BTC_ZMQ", `Error processing raw transaction: ${error.message}`);
                }
            }
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Raw transaction listener error: ${error.message}`);
        }
    }
    async processRawBlocks() {
        if (!this.rawBlockSocket)
            return;
        try {
            for await (const [topic, message] of this.rawBlockSocket) {
                if (!this.isRunning)
                    break;
                try {
                    console_1.logger.info("BTC_ZMQ", "New block received, updating confirmations...");
                    await this.updatePendingTransactions();
                    this.cleanupMempoolTxs();
                }
                catch (error) {
                    console_1.logger.error("BTC_ZMQ", `Error processing block: ${error.message}`);
                }
            }
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Raw block listener error: ${error.message}`);
        }
    }
    async processHashTransactions() {
        if (!this.hashTxSocket)
            return;
        try {
            for await (const [topic, message] of this.hashTxSocket) {
                if (!this.isRunning)
                    break;
                try {
                    const txHash = message.toString('hex');
                    console_1.logger.debug("BTC_ZMQ", `New transaction hash: ${txHash}`);
                }
                catch (error) {
                    console_1.logger.error("BTC_ZMQ", `Error processing tx hash: ${error.message}`);
                }
            }
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Hash transaction listener error: ${error.message}`);
        }
    }
    async parseRawTransaction(txHex) {
        try {
            if (!this.nodeService)
                return null;
            const response = await this.nodeService.decodeRawTransaction(txHex);
            return {
                txid: response.txid,
                vout: response.vout,
                vin: response.vin,
                hex: txHex,
            };
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Failed to parse raw transaction: ${error.message}`);
            return null;
        }
    }
    async handleNewTransaction(tx, fromMempool) {
        var _a, _b, _c;
        try {
            if (this.processedTxIds.has(tx.txid)) {
                return;
            }
            const matchedOutputs = [];
            for (let i = 0; i < tx.vout.length; i++) {
                const output = tx.vout[i];
                const addresses = ((_a = output.scriptPubKey) === null || _a === void 0 ? void 0 : _a.addresses) ||
                    (((_b = output.scriptPubKey) === null || _b === void 0 ? void 0 : _b.address) ? [output.scriptPubKey.address] : []);
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
                return;
            }
            console_1.logger.info("BTC_ZMQ", `Detected transaction to watched address: ${tx.txid}`);
            console_1.logger.debug("BTC_ZMQ", `Matched outputs: ${JSON.stringify(matchedOutputs)}`);
            let fee = 0;
            try {
                const fullTx = await ((_c = this.nodeService) === null || _c === void 0 ? void 0 : _c.getRawTransaction(tx.txid, true));
                if (fullTx) {
                    fee = fullTx.fee ? Math.abs(fullTx.fee) : 0;
                }
            }
            catch (e) {
            }
            if (fromMempool) {
                this.mempoolTxs.set(tx.txid, {
                    time: Date.now(),
                    fee: fee,
                    addresses: matchedOutputs.map(o => o.address),
                });
                console_1.logger.warn("BTC_ZMQ", `0-conf transaction detected with fee: ${fee} BTC`);
            }
            for (const output of matchedOutputs) {
                const walletId = this.addressToWalletId.get(output.address);
                if (!walletId)
                    continue;
                const wallet = await db_1.models.wallet.findOne({
                    where: { id: walletId },
                    include: [{ model: db_1.models.user, as: 'user' }],
                });
                if (!wallet)
                    continue;
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
                        requiredConfirmations: 3,
                        status: fromMempool ? 'PENDING' : 'COMPLETED',
                    };
                    await storeAndBroadcastTransaction(txData, tx.txid, fromMempool);
                    console_1.logger.info("BTC_ZMQ", `Broadcasted ${fromMempool ? 'pending' : 'confirmed'} transaction for wallet ${wallet.id}`);
                }
            }
            this.processedTxIds.add(tx.txid);
            if (this.processedTxIds.size > 1000) {
                const toDelete = Array.from(this.processedTxIds).slice(0, 100);
                toDelete.forEach(txid => this.processedTxIds.delete(txid));
            }
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Error handling transaction ${tx.txid}: ${error.message}`);
        }
    }
    async updatePendingTransactions() {
        var _a;
        try {
            const pendingTxs = await db_1.models.transaction.findAll({
                where: {
                    status: 'PENDING',
                    type: 'WITHDRAW',
                },
                include: [{ model: db_1.models.wallet, as: 'wallet', where: { type: 'ECO' } }],
            });
            const btcTxs = pendingTxs.filter(tx => {
                try {
                    const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
                    return (metadata === null || metadata === void 0 ? void 0 : metadata.chain) === 'BTC';
                }
                catch (_a) {
                    return false;
                }
            });
            for (const transaction of btcTxs) {
                try {
                    if (!transaction.trxId)
                        continue;
                    const tx = await ((_a = this.nodeService) === null || _a === void 0 ? void 0 : _a.getRawTransaction(transaction.trxId, true));
                    if (!tx)
                        continue;
                    const confirmations = tx.confirmations || 0;
                    let toAddress;
                    try {
                        const metadata = typeof transaction.metadata === 'string'
                            ? JSON.parse(transaction.metadata)
                            : transaction.metadata;
                        toAddress = metadata === null || metadata === void 0 ? void 0 : metadata.toAddress;
                    }
                    catch (_b) {
                        toAddress = undefined;
                    }
                    if (storeAndBroadcastTransaction) {
                        const txData = {
                            walletId: transaction.walletId,
                            chain: 'BTC',
                            hash: transaction.trxId,
                            transactionHash: transaction.trxId,
                            type: confirmations >= 3 ? 'DEPOSIT' : 'pending_confirmation',
                            from: 'N/A',
                            address: toAddress || '',
                            amount: transaction.amount,
                            fee: transaction.fee || 0,
                            confirmations: confirmations,
                            requiredConfirmations: 3,
                            status: confirmations >= 3 ? 'COMPLETED' : 'PENDING',
                        };
                        await storeAndBroadcastTransaction(txData, transaction.trxId, confirmations < 3);
                        console_1.logger.info("BTC_ZMQ", `Updated transaction ${transaction.trxId}: ${confirmations}/3 confirmations`);
                    }
                }
                catch (error) {
                    console_1.logger.error("BTC_ZMQ", "Error updating transaction", error);
                }
            }
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", "Error updating pending transactions", error);
        }
    }
    cleanupMempoolTxs() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [txid, data] of this.mempoolTxs.entries()) {
            if (data.time < oneHourAgo) {
                this.mempoolTxs.delete(txid);
            }
        }
    }
    async watchAddress(address, walletId) {
        try {
            if (this.nodeService) {
                await this.nodeService.importAddress(address, `wallet_${walletId}`);
            }
            this.watchedAddresses.add(address);
            this.addressToWalletId.set(address, walletId);
            console_1.logger.info("BTC_ZMQ", `Now watching address ${address} for wallet ${walletId}`);
        }
        catch (error) {
            console_1.logger.error("BTC_ZMQ", `Failed to watch address ${address}: ${error.message}`);
            throw error;
        }
    }
    unwatchAddress(address) {
        this.watchedAddresses.delete(address);
        this.addressToWalletId.delete(address);
        console_1.logger.info("BTC_ZMQ", `Stopped watching address ${address}`);
    }
    getMempoolTx(txid) {
        return this.mempoolTxs.get(txid);
    }
    isInMempool(txid) {
        return this.mempoolTxs.has(txid);
    }
    getWatchedAddresses() {
        return Array.from(this.watchedAddresses);
    }
    async stop() {
        console_1.logger.info("BTC_ZMQ", "Stopping Bitcoin ZMQ service...");
        this.isRunning = false;
        if (this.rawTxSocket)
            await this.rawTxSocket.close();
        if (this.rawBlockSocket)
            await this.rawBlockSocket.close();
        if (this.hashTxSocket)
            await this.hashTxSocket.close();
        if (this.hashBlockSocket)
            await this.hashBlockSocket.close();
        console_1.logger.success("BTC_ZMQ", "Bitcoin ZMQ service stopped");
    }
}
exports.BitcoinZMQService = BitcoinZMQService;
exports.default = BitcoinZMQService;
