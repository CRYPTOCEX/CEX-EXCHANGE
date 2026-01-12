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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tonweb_1 = __importDefault(require("tonweb")); // TON SDK
const encrypt_1 = require("@b/utils/encrypt");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
// Extension module - using safe import
let storeAndBroadcastTransaction;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) {
    // Extension not available
}
const tonMnemonic = __importStar(require("tonweb-mnemonic"));
const redis_1 = require("@b/utils/redis");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const redis = redis_1.RedisSingleton.getInstance();
const BN = tonweb_1.default.utils.BN;
const HIGHLOAD_WALLET_TIMEOUT = 60 * 60; // 1 hour
class TonService {
    constructor(endpoint = TonService.getTonEndpoint(), apiKey = TonService.getTonApiKey()) {
        this.chainActive = false;
        if (!apiKey) {
            console_1.logger.warn("TON", "No TON API Key provided. Some functionalities may be limited.");
        }
        const httpProvider = new tonweb_1.default.HttpProvider(endpoint, { apiKey });
        this.tonWeb = new tonweb_1.default(httpProvider);
    }
    /**
     * Dynamically determine the TON RPC endpoint based on the TON_NETWORK environment variable.
     */
    static getTonEndpoint() {
        const network = process.env.TON_NETWORK || "mainnet";
        if (network === "testnet") {
            return (process.env.TON_TESTNET_RPC ||
                "https://testnet.toncenter.com/api/v2/jsonRPC");
        }
        return (process.env.TON_MAINNET_RPC || "https://toncenter.com/api/v2/jsonRPC");
    }
    /**
     * Dynamically get the API key based on the TON_NETWORK environment variable.
     */
    static getTonApiKey() {
        const network = process.env.TON_NETWORK || "mainnet";
        if (network === "testnet") {
            return process.env.TON_TESTNET_RPC_API_KEY;
        }
        return process.env.TON_MAINNET_RPC_API_KEY;
    }
    /**
     * Singleton instance accessor.
     */
    static async getInstance() {
        if (!TonService.instance) {
            TonService.instance = new TonService();
            await TonService.instance.checkChainStatus();
            // Schedule periodic cleanup of processed transactions every minute
            setInterval(() => TonService.cleanupProcessedTransactions(), 60 * 1000);
        }
        return TonService.instance;
    }
    /**
     * Cleanup processedTransactions map by removing entries older than PROCESSING_EXPIRY_MS.
     */
    static cleanupProcessedTransactions() {
        const now = Date.now();
        for (const [tx, timestamp] of TonService.processedTransactions.entries()) {
            if (now - timestamp > TonService.PROCESSING_EXPIRY_MS) {
                TonService.processedTransactions.delete(tx);
            }
        }
    }
    /**
     * Checks if the chain is active by the presence of a `ton.bin` file.
     */
    async checkChainStatus() {
        try {
            // Try multiple paths for the bin file - similar to how index.ts handles .env files
            const possiblePaths = [
                path_1.default.resolve(__dirname, "ton.bin.ts"), // Development TypeScript
                path_1.default.resolve(__dirname, "ton.bin.js"), // Production JavaScript
                path_1.default.resolve(process.cwd(), "backend/src/blockchains/ton.bin.ts"), // Development from root
                path_1.default.resolve(process.cwd(), "backend/src/blockchains/ton.bin.js"), // Production from root
                path_1.default.resolve(process.cwd(), "dist/blockchains/ton.bin.js"), // Production dist
                path_1.default.resolve(process.cwd(), "src/blockchains/ton.bin.js"), // Production src
            ];
            let tonBinFileExists = false;
            let foundPath = "";
            for (const filePath of possiblePaths) {
                if (fs_1.default.existsSync(filePath)) {
                    tonBinFileExists = true;
                    foundPath = filePath;
                    break;
                }
            }
            if (tonBinFileExists) {
                this.chainActive = true;
            }
            else {
                this.chainActive = false;
            }
        }
        catch (error) {
            console_1.logger.error("TON", `Error checking chain status: ${error.message}`);
            this.chainActive = false;
        }
    }
    /**
     * Ensures the chain is active.
     */
    ensureChainActive() {
        if (!this.chainActive) {
            throw new Error("Chain 'TON' is not active.");
        }
    }
    /**
     * Rate-limited RPC queue to ensure a maximum of 1 call per second.
     */
    static async addToQueue(operation) {
        TonService.queue.push(operation);
        if (!TonService.processing) {
            await TonService.processQueue();
        }
    }
    static async processQueue() {
        TonService.processing = true;
        while (TonService.queue.length > 0) {
            const operation = TonService.queue.shift();
            if (operation) {
                try {
                    await operation();
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
                }
                catch (error) {
                    console_1.logger.error("TON", `Error processing wallet operation: ${error.message}`);
                }
            }
        }
        TonService.processing = false;
    }
    formatAddress(address) {
        const addressObj = new this.tonWeb.utils.Address(address);
        const network = process.env.TON_NETWORK || "mainnet";
        // Determine if the network is testnet
        const isTestnet = network === "testnet";
        // Parameters for toString method
        const isUserFriendly = true;
        const isUrlSafe = true;
        const isBounceable = false;
        return addressObj.toString(isUserFriendly, isUrlSafe, isBounceable);
    }
    /**
     * Monitors TON deposits for a given wallet.
     * Instead of stopping monitoring after one deposit, this function
     * continues to check for new deposits every minute.
     */
    async monitorTonDeposits(wallet, address) {
        const monitoringKey = `${wallet.id}_${address}`;
        if (TonService.monitoringAddresses.has(monitoringKey)) {
            console_1.logger.debug("TON", `Monitoring already in progress for wallet ${wallet.id} on address ${address}`);
            return;
        }
        TonService.monitoringAddresses.set(monitoringKey, true);
        try {
            console_1.logger.info("TON", `Starting deposit monitoring for wallet ${wallet.id} on address ${address}`);
            const checkDeposits = async () => {
                try {
                    const rawTransactions = await this.fetchTransactions(address);
                    for (const tx of rawTransactions) {
                        // Check if transaction is already in DB or has been processed recently.
                        const existingTx = await db_1.models.transaction.findOne({
                            where: { trxId: tx.hash },
                        });
                        if (existingTx ||
                            (TonService.processedTransactions.has(tx.hash) &&
                                Date.now() - TonService.processedTransactions.get(tx.hash) <
                                    TonService.PROCESSING_EXPIRY_MS)) {
                            continue;
                        }
                        if (tx.status === "Success") {
                            await this.processTonTransaction(tx.hash, wallet, address);
                            // Mark as processed with current timestamp
                            TonService.processedTransactions.set(tx.hash, Date.now());
                        }
                    }
                }
                catch (error) {
                    console_1.logger.error("TON", `Error checking deposits for ${address}: ${error.message}`);
                }
                // Schedule the next check after 1 minute
                setTimeout(checkDeposits, 60 * 1000);
            };
            checkDeposits();
        }
        catch (error) {
            console_1.logger.error("TON", `Error monitoring deposits for ${address}: ${error.message}`);
            TonService.monitoringAddresses.delete(monitoringKey);
        }
    }
    /**
     * Processes a TON transaction by storing and broadcasting it.
     */
    async processTonTransaction(transactionHash, wallet, address) {
        try {
            console_1.logger.debug("TON", `Fetching transaction ${transactionHash} for address ${address}`);
            // Fetch all transactions for the address and search for the specific transaction by hash
            const rawTransactions = (await this.fetchTransactions(address));
            const transactionInfo = rawTransactions.find((tx) => tx.hash === transactionHash);
            if (!transactionInfo) {
                console_1.logger.error("TON", `Transaction ${transactionHash} not found for address ${address}`);
                return;
            }
            const { from, amount } = transactionInfo;
            const addresses = typeof wallet.address === "string"
                ? JSON.parse(wallet.address)
                : wallet.address;
            const expectedTo = addresses["TON"].address; // Expected destination
            const toStr = new this.tonWeb.utils.Address(expectedTo).toString(false);
            const txToStr = new this.tonWeb.utils.Address(transactionInfo.to).toString(false);
            console_1.logger.debug("TON", `Expected address: ${toStr}`);
            console_1.logger.debug("TON", `Transaction address: ${txToStr}`);
            if (txToStr !== toStr) {
                console_1.logger.error("TON", `Transaction ${transactionHash} is not for the expected address ${expectedTo}`);
                return;
            }
            const txData = {
                contractType: "NATIVE",
                id: wallet.id,
                chain: "TON",
                hash: transactionHash,
                type: "DEPOSIT",
                from,
                address: expectedTo,
                amount,
                status: "COMPLETED",
            };
            await storeAndBroadcastTransaction(txData, transactionHash);
            console_1.logger.success("TON", `Processed transaction ${transactionHash}`);
        }
        catch (error) {
            console_1.logger.error("TON", `Error processing transaction ${transactionHash}: ${error.message}`);
        }
    }
    /**
     * Fetches and parses transactions for a given TON address.
     */
    async fetchTransactions(address) {
        this.ensureChainActive();
        let rawTransactions = [];
        try {
            const addressStr = this.formatAddress(address);
            rawTransactions = await this.tonWeb.provider.getTransactions(addressStr, 10, undefined, undefined, undefined, true);
        }
        catch (error) {
            console_1.logger.error("TON", "Failed to fetch TON transactions", error);
            throw new Error(`Failed to fetch TON transactions: ${error.message || "Unknown error"}`);
        }
        return this.parseTonTransactions(rawTransactions);
    }
    /**
     * Parses raw TON transactions into a standardized format.
     */
    parseTonTransactions(rawTransactions) {
        return rawTransactions.map((tx) => {
            var _a;
            const { in_msg, out_msgs, utime } = tx;
            const from = (in_msg === null || in_msg === void 0 ? void 0 : in_msg.source) || "Unknown";
            const to = out_msgs.length > 0
                ? out_msgs[0].destination
                : (in_msg === null || in_msg === void 0 ? void 0 : in_msg.destination) || "Unknown";
            const amount = (parseInt(in_msg.value, 10) / 1e9).toString();
            const transactionHash = ((_a = tx.transaction_id) === null || _a === void 0 ? void 0 : _a.hash) || "Unknown";
            return {
                timestamp: new Date(utime * 1000).toISOString(),
                hash: transactionHash,
                from,
                to,
                amount,
                confirmations: "N/A",
                status: "Success",
                isError: "0",
                fee: "N/A",
            };
        });
    }
    /**
     * Creates a new TON wallet.
     */
    async createWallet() {
        this.ensureChainActive();
        const mnemonic = await tonMnemonic.generateMnemonic();
        const isValidMnemonic = await tonMnemonic.validateMnemonic(mnemonic);
        if (!isValidMnemonic) {
            throw new Error("Generated mnemonic is invalid.");
        }
        const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonic);
        const wallet = this.tonWeb.wallet.create({ publicKey: keyPair.publicKey });
        const address = await wallet.getAddress();
        return {
            address: address.toString(true),
            data: {
                mnemonic: mnemonic.join(" "),
                publicKey: tonweb_1.default.utils.bytesToHex(keyPair.publicKey),
                privateKey: tonweb_1.default.utils.bytesToHex(keyPair.secretKey),
            },
        };
    }
    /**
     * Retrieves the balance of a TON wallet.
     */
    async getBalance(address) {
        this.ensureChainActive();
        try {
            const balanceNanoTon = await this.tonWeb.provider.getBalance(address);
            const balanceTON = (balanceNanoTon / 1e9).toString();
            return balanceTON;
        }
        catch (error) {
            console_1.logger.error("TON", `Failed to fetch balance: ${error.message}`);
            throw error;
        }
    }
    /**
     * Handles TON withdrawal by transferring TON to the specified address.
     */
    async handleTonWithdrawal(transactionId, walletId, amount, toAddress, ctx) {
        var _a, _b, _c, _d;
        let checkedTransactions = new Set();
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing TON withdrawal for transaction ${transactionId}`);
            console_1.logger.info("TON", `Starting withdrawal for transaction ${transactionId}`);
            const walletDb = await db_1.models.wallet.findOne({ where: { id: walletId } });
            if (!walletDb) {
                throw new Error("Wallet not found");
            }
            const addresses = typeof walletDb.address === "string"
                ? JSON.parse(walletDb.address)
                : walletDb.address;
            const fromAddressStr = addresses["TON"].address;
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "TON", chain: "TON" },
            });
            if (!walletData || !walletData.data) {
                throw new Error("Private key not found for the wallet");
            }
            const decryptedWalletData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            const privateKey = tonweb_1.default.utils.hexToBytes(decryptedWalletData.privateKey);
            const publicKey = tonweb_1.default.utils.hexToBytes(decryptedWalletData.publicKey);
            if (!privateKey || !publicKey) {
                throw new Error("WalletContract requires both publicKey and privateKey.");
            }
            const fromAddress = this.formatAddress(fromAddressStr);
            const wallet = this.tonWeb.wallet.create({
                publicKey: publicKey,
                privateKey: privateKey,
                address: new this.tonWeb.utils.Address(fromAddress),
            });
            const walletAddress = await wallet.getAddress();
            let seqno = await wallet.methods.seqno().call();
            if (seqno === null || seqno === undefined || isNaN(seqno)) {
                seqno = 0;
            }
            const walletBalance = new BN(await this.tonWeb.provider.getBalance(walletAddress.toString(true)));
            const withdrawalAmount = new BN(amount * 1e9);
            if (withdrawalAmount.gte(walletBalance)) {
                console_1.logger.error("TON", `Not enough balance to process withdrawal for transaction ${transactionId}`);
                await db_1.models.transaction.update({
                    status: "FAILED",
                    description: "Not enough balance for withdrawal",
                }, { where: { id: transactionId } });
                return;
            }
            const recipientAddress = this.formatAddress(toAddress);
            const uniquePayload = `TON_WITHDRAWAL_${transactionId}_${Date.now()}`;
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} TON to ${toAddress}`);
            await wallet.methods
                .transfer({
                secretKey: privateKey,
                toAddress: recipientAddress,
                amount: withdrawalAmount,
                seqno: seqno,
                sendMode: 3,
                payload: uniquePayload,
            })
                .send();
            console_1.logger.debug("TON", `Transfer initiated with payload: ${uniquePayload}`);
            let retries = 0;
            const maxRetries = 10;
            const retryDelay = 10000;
            let transactionHash = null;
            while (retries < maxRetries && !transactionHash) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                const transactions = await this.tonWeb.provider.getTransactions(walletAddress.toString(true), 5);
                console_1.logger.debug("TON", `Checking ${transactions.length} transactions on retry ${retries + 1}/${maxRetries}`);
                for (const tx of transactions) {
                    if (checkedTransactions.has(tx.transaction_id.hash)) {
                        continue;
                    }
                    checkedTransactions.add(tx.transaction_id.hash);
                    if (tx.out_msgs && tx.out_msgs.length > 0) {
                        const outMessage = tx.out_msgs[0];
                        if (outMessage.message && outMessage.message === uniquePayload) {
                            transactionHash = tx.transaction_id.hash;
                            break;
                        }
                    }
                }
                retries++;
                if (transactionHash) {
                    console_1.logger.info("TON", `Transaction confirmed with hash: ${transactionHash}`);
                }
                else {
                    console_1.logger.debug("TON", `Retry ${retries}/${maxRetries}: Transaction not yet confirmed.`);
                }
                if (checkedTransactions.size > 1000) {
                    checkedTransactions.clear();
                }
            }
            if (!transactionHash) {
                throw new Error(`Transaction hash could not be retrieved after ${maxRetries} retries.`);
            }
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `TON withdrawal completed: ${transactionHash}`);
            console_1.logger.success("TON", `Completed withdrawal for transaction ${transactionId}`);
            await db_1.models.transaction.update({ status: "COMPLETED", trxId: transactionHash }, { where: { id: transactionId } });
        }
        catch (error) {
            console_1.logger.error("TON", `Failed to send transfer: ${error.message}`);
            console_1.logger.debug("TON", `Full error stack: ${error.stack}`);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to send transfer");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: `Failed to send transfer: ${error.message}`,
            }, { where: { id: transactionId } });
            throw error;
        }
        finally {
            if (checkedTransactions) {
                checkedTransactions.clear();
                checkedTransactions = null;
            }
        }
    }
}
TonService.monitoringAddresses = new Map();
// Change processedTransactions from a Set to a Map so we can store timestamps
TonService.processedTransactions = new Map();
TonService.queue = []; // Queue for RPC calls
TonService.processing = false; // Whether the queue is processing
// Expiry period for processed transactions (30 minutes)
TonService.PROCESSING_EXPIRY_MS = 30 * 60 * 1000;
exports.default = TonService;
