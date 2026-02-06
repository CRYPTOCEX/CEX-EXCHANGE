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
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const bip39_1 = require("bip39");
const ed25519 = __importStar(require("ed25519-hd-key"));
const redis_1 = require("@b/utils/redis");
const date_fns_1 = require("date-fns");
const encrypt_1 = require("@b/utils/encrypt");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const security_1 = require("@b/utils/security");
let storeAndBroadcastTransaction;
let getMasterWalletByChainFull;
let getWalletData;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) {
}
try {
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    getMasterWalletByChainFull = walletModule.getMasterWalletByChainFull;
    getWalletData = walletModule.getWalletData;
}
catch (e) {
}
class SolanaService {
    constructor(cacheExpirationMinutes = 30) {
        this.chainActive = false;
        this.connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)(process.env.SOL_NETWORK === "mainnet"
            ? "mainnet-beta"
            : process.env.SOL_NETWORK === "testnet"
                ? "testnet"
                : "devnet"), "confirmed");
        this.cacheExpiration = cacheExpirationMinutes;
    }
    static async getInstance() {
        if (!SolanaService.instance) {
            SolanaService.instance = new SolanaService();
            await SolanaService.instance.checkChainStatus();
        }
        return SolanaService.instance;
    }
    async checkChainStatus() {
        const result = await (0, security_1.isBlockchainActive)("SOL");
        if (!result.active) {
            console_1.logger.warn("SOL", result.reason || "Blockchain not active");
            this.chainActive = false;
            return;
        }
        this.chainActive = true;
        console_1.logger.info("SOL", "Solana service initialized successfully");
    }
    ensureChainActive() {
        if (!this.chainActive) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Solana service not available. Please ensure your license is activated and the blockchain is enabled." });
        }
    }
    createWallet() {
        this.ensureChainActive();
        const mnemonic = (0, bip39_1.generateMnemonic)();
        const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic);
        const derivationPath = "m/44'/501'/0'/0'";
        const derivedSeed = ed25519.derivePath(derivationPath, seed.toString("hex")).key;
        const keypair = web3_js_1.Keypair.fromSeed(derivedSeed);
        const address = keypair.publicKey.toBase58();
        const privateKey = Buffer.from(keypair.secretKey).toString("hex");
        const publicKey = keypair.publicKey.toBase58();
        return {
            address,
            data: {
                mnemonic,
                publicKey,
                privateKey,
                derivationPath,
            },
        };
    }
    async fetchTransactions(address) {
        try {
            const cacheKey = `wallet:${address}:transactions:sol`;
            const cachedData = await this.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            const rawTransactions = await this.fetchSolanaTransactions(address);
            const parsedTransactions = this.parseSolanaTransactions(rawTransactions, address);
            const cacheData = {
                transactions: parsedTransactions,
                timestamp: new Date().toISOString(),
            };
            const redis = redis_1.RedisSingleton.getInstance();
            await redis.setex(cacheKey, this.cacheExpiration * 60, JSON.stringify(cacheData));
            return parsedTransactions;
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to fetch Solana transactions", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch Solana transactions: ${error.message}` });
        }
    }
    async fetchSolanaTransactions(address) {
        try {
            const publicKey = new web3_js_1.PublicKey(address);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 50 });
            const transactions = await Promise.all(signatures.map(async (signatureInfo) => {
                const transaction = await this.connection.getTransaction(signatureInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                    commitment: "confirmed",
                });
                return transaction;
            }));
            return transactions;
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to fetch transactions", error);
            return [];
        }
    }
    parseSolanaTransactions(rawTransactions, address) {
        if (!Array.isArray(rawTransactions)) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Invalid raw transactions format for Solana` });
        }
        return rawTransactions
            .filter((tx) => tx !== null && tx.meta !== null)
            .map((tx) => {
            var _a;
            const { transaction, meta, blockTime } = tx;
            const hash = transaction.signatures[0];
            const timestamp = blockTime ? blockTime * 1000 : Date.now();
            const status = meta.err ? "Failed" : "Success";
            let from = "";
            let to = "";
            let amount = "0";
            transaction.message.instructions.forEach((instruction) => {
                var _a;
                if (instruction.programId.equals(new web3_js_1.PublicKey("11111111111111111111111111111111")) &&
                    ((_a = instruction.parsed) === null || _a === void 0 ? void 0 : _a.type) === "transfer") {
                    const info = instruction.parsed.info;
                    if (info.source === address || info.destination === address) {
                        from = info.source;
                        to = info.destination;
                        amount = (info.lamports / 1e9).toString();
                    }
                }
            });
            return {
                timestamp: new Date(timestamp).toISOString(),
                hash,
                from,
                to,
                amount,
                confirmations: ((_a = meta.confirmations) === null || _a === void 0 ? void 0 : _a.toString()) || "0",
                status,
                isError: status === "Failed" ? "1" : "0",
                fee: (meta.fee / 1e9).toString(),
            };
        });
    }
    async getBalance(address) {
        try {
            const publicKey = new web3_js_1.PublicKey(address);
            const balanceLamports = await this.connection.getBalance(publicKey);
            const balanceSOL = (balanceLamports / 1e9).toString();
            return balanceSOL;
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to fetch balance", error);
            throw error;
        }
    }
    async getCachedData(cacheKey) {
        const redis = redis_1.RedisSingleton.getInstance();
        let cachedData = await redis.get(cacheKey);
        if (cachedData && typeof cachedData === "string") {
            cachedData = JSON.parse(cachedData);
        }
        if (cachedData) {
            const now = new Date();
            const lastUpdated = new Date(cachedData.timestamp);
            if ((0, date_fns_1.differenceInMinutes)(now, lastUpdated) < this.cacheExpiration) {
                return cachedData.transactions;
            }
        }
        return null;
    }
    async monitorSolanaDeposits(wallet, address, onDepositProcessed, ctx) {
        var _a;
        try {
            const publicKey = new web3_js_1.PublicKey(address);
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Starting monitoring for wallet ${wallet.id} on ${address}`);
            console_1.logger.info("SOL", `Starting monitoring for wallet ${wallet.id} on ${address}`);
            const timeoutDuration = 60 * 60 * 1000;
            let logsSubscriptionId = null;
            const processedSignatures = new Set();
            let isProcessing = false;
            const inactivityTimeout = setTimeout(async () => {
                if (logsSubscriptionId !== null) {
                    console_1.logger.debug("SOL", `No activity for 1 hour on ${address}, removing listener`);
                    await this.connection.removeOnLogsListener(logsSubscriptionId);
                    logsSubscriptionId = null;
                }
            }, timeoutDuration);
            logsSubscriptionId = await this.connection.onLogs(publicKey, async (logs, context) => {
                try {
                    clearTimeout(inactivityTimeout);
                    console_1.logger.debug("SOL", `WebSocket triggered for ${address}, Slot: ${context.slot}`);
                    const transactionSignature = logs.signature;
                    if (transactionSignature) {
                        if (isProcessing || processedSignatures.has(transactionSignature)) {
                            console_1.logger.debug("SOL", `Signature ${transactionSignature} already processed or in progress, skipping`);
                            return;
                        }
                        isProcessing = true;
                        processedSignatures.add(transactionSignature);
                        console_1.logger.info("SOL", `Detected tx signature: ${transactionSignature}`);
                        await this.trackTransactionSignature(transactionSignature, wallet, address, logsSubscriptionId);
                        if (logsSubscriptionId !== null) {
                            await this.connection.removeOnLogsListener(logsSubscriptionId);
                            logsSubscriptionId = null;
                            console_1.logger.success("SOL", `Processed deposit for ${address}`);
                            if (onDepositProcessed)
                                onDepositProcessed();
                        }
                    }
                    else {
                        console_1.logger.warn("SOL", "No transaction signature detected in logs");
                    }
                }
                catch (logError) {
                    console_1.logger.error("SOL", `Error processing logs for ${address}`, logError);
                    isProcessing = false;
                }
            }, "confirmed");
            console_1.logger.debug("SOL", `Subscribed to logs on ${address}, subscriptionId: ${logsSubscriptionId}`);
        }
        catch (error) {
            console_1.logger.error("SOL", `Error monitoring deposits for ${address}`, error);
        }
    }
    async trackTransactionSignature(signature, wallet, address, logsSubscriptionId) {
        try {
            const maxRetries = 30;
            let retries = 0;
            let transaction = null;
            while (retries < maxRetries) {
                try {
                    transaction = await this.connection.getTransaction(signature, {
                        commitment: "finalized",
                        maxSupportedTransactionVersion: 0,
                    });
                    if (transaction) {
                        console_1.logger.debug("SOL", `Transaction ${signature} found`);
                        break;
                    }
                    else {
                        console_1.logger.debug("SOL", `Transaction ${signature} not found, retrying (${retries + 1}/${maxRetries})`);
                    }
                }
                catch (error) {
                    console_1.logger.error("SOL", `Error fetching transaction ${signature}`, error);
                }
                retries++;
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
            if (!transaction) {
                console_1.logger.error("SOL", `Transaction ${signature} not found after ${maxRetries} retries`);
                return;
            }
            if (!transaction.meta) {
                console_1.logger.error("SOL", `Transaction metadata not available for ${signature}`);
                return;
            }
            const accountKeys = transaction.transaction.message.accountKeys.map((key) => key.toBase58());
            const walletIndex = accountKeys.findIndex((key) => key === address);
            if (walletIndex === -1) {
                console_1.logger.error("SOL", `Wallet ${address} not found in transaction ${signature}`);
                return;
            }
            const preBalance = transaction.meta.preBalances[walletIndex];
            const postBalance = transaction.meta.postBalances[walletIndex];
            const balanceDifference = postBalance - preBalance;
            const amountReceived = (balanceDifference / 1e9).toString();
            if (balanceDifference <= 0) {
                console_1.logger.warn("SOL", `No SOL received in transaction ${signature}`);
                return;
            }
            console_1.logger.info("SOL", `Received ${amountReceived} SOL on ${address}`);
            const txDetails = {
                contractType: "NATIVE",
                id: wallet.id,
                chain: "SOL",
                hash: transaction.transaction.signatures[0],
                type: "DEPOSIT",
                from: "N/A",
                address: address,
                amount: amountReceived,
                gasLimit: "N/A",
                gasPrice: "N/A",
                status: "COMPLETED",
            };
            console_1.logger.debug("SOL", `Storing transaction for wallet ${wallet.id}`);
            await storeAndBroadcastTransaction(txDetails, signature);
            console_1.logger.success("SOL", `Transaction stored for wallet ${wallet.id}`);
            await this.connection.removeOnLogsListener(logsSubscriptionId);
            console_1.logger.debug("SOL", `Unsubscribed from logs on ${address}`);
        }
        catch (error) {
            console_1.logger.error("SOL", `Error processing transaction ${signature}`, error);
        }
    }
    async monitorSPLTokenDeposits(wallet, monitoredWalletAddress, mintAddress, onDepositProcessed) {
        try {
            console_1.logger.info("SOL", `Starting SPL token monitoring for wallet ${wallet.id} on ${monitoredWalletAddress}`);
            const timeoutDuration = 60 * 60 * 1000;
            let programChangeSubscriptionId;
            const processedSlots = new Set();
            let isProcessing = false;
            let inactivityTimeout = setTimeout(async () => {
                if (programChangeSubscriptionId !== undefined) {
                    console_1.logger.debug("SOL", `Inactivity timeout for SPL account ${monitoredWalletAddress}`);
                    await this.connection.removeProgramAccountChangeListener(programChangeSubscriptionId);
                    programChangeSubscriptionId = undefined;
                }
            }, timeoutDuration);
            programChangeSubscriptionId = this.connection.onProgramAccountChange(spl_token_1.TOKEN_PROGRAM_ID, async ({ accountId, accountInfo }, context) => {
                try {
                    console_1.logger.debug("SOL", `Program account change for ${accountId.toBase58()}`);
                    if (isProcessing || processedSlots.has(context.slot)) {
                        console_1.logger.debug("SOL", `Slot ${context.slot} already processed or in progress, skipping`);
                        return;
                    }
                    isProcessing = true;
                    processedSlots.add(context.slot);
                    if (inactivityTimeout)
                        clearTimeout(inactivityTimeout);
                    inactivityTimeout = setTimeout(async () => {
                        if (programChangeSubscriptionId !== undefined) {
                            console_1.logger.debug("SOL", `Inactivity timeout for SPL account ${monitoredWalletAddress}`);
                            await this.connection.removeProgramAccountChangeListener(programChangeSubscriptionId);
                            programChangeSubscriptionId = undefined;
                        }
                    }, timeoutDuration);
                    const blockTransactions = await this.connection.getBlock(context.slot, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
                    if (!blockTransactions || !blockTransactions.transactions) {
                        console_1.logger.warn("SOL", `No transactions in block ${context.slot}`);
                        isProcessing = false;
                        return;
                    }
                    const isDepositFound = await this.checkSPLTransactionsInBlock(blockTransactions.transactions, wallet, monitoredWalletAddress, mintAddress);
                    if (isDepositFound && programChangeSubscriptionId !== undefined) {
                        await this.connection.removeProgramAccountChangeListener(programChangeSubscriptionId);
                        programChangeSubscriptionId = undefined;
                        console_1.logger.success("SOL", `SPL deposit processed for ${monitoredWalletAddress}`);
                        if (onDepositProcessed)
                            onDepositProcessed();
                    }
                    isProcessing = false;
                }
                catch (error) {
                    console_1.logger.error("SOL", `Error processing program account change for ${monitoredWalletAddress}`, error);
                    isProcessing = false;
                }
            }, {
                filters: [
                    { memcmp: { offset: 0, bytes: mintAddress } },
                    { memcmp: { offset: 32, bytes: monitoredWalletAddress } },
                    { dataSize: 165 },
                ],
                commitment: "confirmed",
            });
            console_1.logger.debug("SOL", `Subscribed to SPL changes for ${monitoredWalletAddress}, id: ${programChangeSubscriptionId}`);
        }
        catch (error) {
            console_1.logger.error("SOL", `Error setting up SPL monitoring for ${monitoredWalletAddress}`, error);
        }
    }
    parseSPLTransferInstruction(transaction, monitoredWalletAddress, mintAddress) {
        var _a, _b, _c, _d;
        try {
            const instructions = "instructions" in transaction.transaction.message
                ? transaction.transaction.message.instructions
                : transaction.transaction.message.compiledInstructions;
            for (const instruction of instructions) {
                const programId = (_b = (_a = instruction.programId) === null || _a === void 0 ? void 0 : _a.toBase58) === null || _b === void 0 ? void 0 : _b.call(_a);
                const isTokenProgram = programId === spl_token_1.TOKEN_PROGRAM_ID.toBase58() ||
                    programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                if (!isTokenProgram)
                    continue;
                if (instruction.parsed) {
                    const { type, info } = instruction.parsed;
                    if (type === "transferChecked") {
                        if (info.mint !== mintAddress)
                            continue;
                        if (info.destination === monitoredWalletAddress) {
                            return {
                                amount: parseFloat(info.tokenAmount.uiAmount),
                                decimals: info.tokenAmount.decimals,
                                from: info.source,
                                to: info.destination,
                            };
                        }
                    }
                    if (type === "transfer") {
                        if (info.destination === monitoredWalletAddress) {
                            const tokenBalance = (_d = (_c = transaction.meta) === null || _c === void 0 ? void 0 : _c.postTokenBalances) === null || _d === void 0 ? void 0 : _d.find((balance) => balance.accountIndex === instruction.accounts[1] &&
                                balance.mint === mintAddress);
                            if (tokenBalance) {
                                return {
                                    amount: parseFloat(info.amount) / Math.pow(10, tokenBalance.uiTokenAmount.decimals),
                                    decimals: tokenBalance.uiTokenAmount.decimals,
                                    from: info.source,
                                    to: info.destination,
                                };
                            }
                        }
                    }
                }
                if (!instruction.parsed && instruction.data) {
                    continue;
                }
            }
            return null;
        }
        catch (error) {
            console_1.logger.error("SOL", "Error parsing SPL transfer instruction", error);
            return null;
        }
    }
    async checkSPLTransactionsInBlock(transactions, wallet, monitoredWalletAddress, mintAddress) {
        var _a, _b, _c, _d, _e, _f;
        for (const transaction of transactions) {
            try {
                if (!transaction || !transaction.meta) {
                    continue;
                }
                const transferDetails = this.parseSPLTransferInstruction(transaction, monitoredWalletAddress, mintAddress);
                if (transferDetails && transferDetails.amount > 0) {
                    console_1.logger.info("SOL", `SPL deposit: ${transferDetails.amount} tokens to ${monitoredWalletAddress}`);
                    const txDetails = {
                        contractType: "PERMIT",
                        id: wallet.id,
                        chain: "SOL",
                        hash: transaction.transaction.signatures[0],
                        type: "DEPOSIT",
                        from: transferDetails.from || "Unknown",
                        address: monitoredWalletAddress,
                        amount: transferDetails.amount.toString(),
                        status: "COMPLETED",
                    };
                    await storeAndBroadcastTransaction(txDetails, transaction.transaction.signatures[0]);
                    console_1.logger.success("SOL", `SPL deposit stored for wallet ${wallet.id}`);
                    return true;
                }
                if (transaction.meta.postTokenBalances && transaction.meta.preTokenBalances) {
                    const postBalance = transaction.meta.postTokenBalances.find((balance) => balance.owner === monitoredWalletAddress &&
                        balance.mint === mintAddress);
                    const preBalance = transaction.meta.preTokenBalances.find((balance) => balance.owner === monitoredWalletAddress &&
                        balance.mint === mintAddress);
                    if (postBalance) {
                        const preAmount = ((_a = preBalance === null || preBalance === void 0 ? void 0 : preBalance.uiTokenAmount) === null || _a === void 0 ? void 0 : _a.uiAmount) || 0;
                        const postAmount = ((_b = postBalance.uiTokenAmount) === null || _b === void 0 ? void 0 : _b.uiAmount) || 0;
                        const amountReceived = postAmount - preAmount;
                        if (amountReceived > 0) {
                            console_1.logger.info("SOL", `SPL balance change: ${amountReceived} tokens to ${monitoredWalletAddress}`);
                            const accountKeys = transaction.transaction.message.accountKeys || [];
                            const fromAddress = accountKeys.length > 0
                                ? (typeof accountKeys[0] === 'string' ? accountKeys[0] : (_d = (_c = accountKeys[0]) === null || _c === void 0 ? void 0 : _c.toBase58) === null || _d === void 0 ? void 0 : _d.call(_c))
                                : "Unknown";
                            const txDetails = {
                                contractType: "PERMIT",
                                id: wallet.id,
                                chain: "SOL",
                                hash: transaction.transaction.signatures[0],
                                type: "DEPOSIT",
                                from: fromAddress,
                                address: monitoredWalletAddress,
                                amount: amountReceived.toString(),
                                status: "COMPLETED",
                            };
                            await storeAndBroadcastTransaction(txDetails, transaction.transaction.signatures[0]);
                            console_1.logger.success("SOL", `SPL deposit stored for wallet ${wallet.id}`);
                            return true;
                        }
                    }
                }
            }
            catch (error) {
                console_1.logger.error("SOL", `Error processing SPL transaction ${(_f = (_e = transaction === null || transaction === void 0 ? void 0 : transaction.transaction) === null || _e === void 0 ? void 0 : _e.signatures) === null || _f === void 0 ? void 0 : _f[0]}`, error);
                continue;
            }
        }
        return false;
    }
    async processSolanaTransaction(transactionHash, wallet, address) {
        try {
            console_1.logger.debug("SOL", `Fetching transaction ${transactionHash}`);
            const transaction = await this.connection.getTransaction(transactionHash, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
            if (!transaction) {
                console_1.logger.error("SOL", `Transaction ${transactionHash} not found`);
                return;
            }
            if (!transaction.meta) {
                console_1.logger.error("SOL", `Transaction metadata not available for ${transactionHash}`);
                return;
            }
            let contractType = "NATIVE";
            let amount = "0";
            const instructions = "instructions" in transaction.transaction.message
                ? transaction.transaction.message.instructions
                : transaction.transaction.message.compiledInstructions;
            instructions.forEach((instruction) => {
                var _a;
                if (instruction.programId &&
                    instruction.programId.equals &&
                    instruction.programId.equals(new web3_js_1.PublicKey("11111111111111111111111111111111")) &&
                    ((_a = instruction.parsed) === null || _a === void 0 ? void 0 : _a.type) === "transfer") {
                    const info = instruction.parsed.info;
                    if (info.destination === address) {
                        amount = (info.lamports / 1e9).toString();
                        contractType = "NATIVE";
                    }
                }
            });
            if (amount === "0") {
                console_1.logger.warn("SOL", `No SOL received in transaction ${transactionHash}`);
                return;
            }
            const txDetails = {
                contractType,
                id: wallet.id,
                chain: "SOL",
                hash: transaction.transaction.signatures[0],
                type: "DEPOSIT",
                from: "N/A",
                to: address,
                amount,
                fee: (transaction.meta.fee / 1e9).toString(),
            };
            await storeAndBroadcastTransaction(txDetails, transaction.transaction.signatures[0]);
            console_1.logger.success("SOL", `Processed transaction ${transactionHash}`);
        }
        catch (error) {
            console_1.logger.error("SOL", `Error processing transaction ${transactionHash}`, error);
        }
    }
    async handleSolanaWithdrawal(transactionId, walletId, amount, toAddress, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing Solana withdrawal for transaction ${transactionId}`);
            const recipient = new web3_js_1.PublicKey(toAddress);
            const amountLamports = Math.round(amount * 1e9);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} SOL to ${toAddress}`);
            const transactionSignature = await this.transferSol(walletId, recipient, amountLamports);
            if (transactionSignature) {
                await db_1.models.transaction.update({
                    status: "COMPLETED",
                    trxId: transactionSignature,
                }, {
                    where: { id: transactionId },
                });
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Solana withdrawal completed: ${transactionSignature}`);
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Failed to receive transaction signature" });
            }
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to execute withdrawal", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to execute withdrawal");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: `Withdrawal failed: ${error.message}`,
            }, {
                where: { id: transactionId },
            });
            throw error;
        }
    }
    async transferSol(walletId, recipient, amount) {
        try {
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "SOL", chain: "SOL" },
            });
            if (!walletData || !walletData.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Private key not found for the wallet" });
            }
            const decryptedWalletData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            const privateKey = Buffer.from(decryptedWalletData.privateKey, "hex");
            const custodialWallet = web3_js_1.Keypair.fromSecretKey(privateKey);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: custodialWallet.publicKey,
                toPubkey: recipient,
                lamports: amount,
            }));
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = custodialWallet.publicKey;
            transaction.sign(custodialWallet);
            const serializedTransaction = transaction.serialize();
            const signature = await this.connection.sendRawTransaction(serializedTransaction);
            console_1.logger.debug("SOL", `Transaction signature: ${signature}`);
            try {
                await this.connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight,
                }, "confirmed");
            }
            catch (confirmError) {
                console_1.logger.warn("SOL", `Transaction confirmation failed: ${confirmError.message}`);
            }
            const txResult = await this.connection.getTransaction(signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
            if (txResult && txResult.meta && txResult.meta.err === null) {
                console_1.logger.success("SOL", `Transfer successful: ${signature}`);
                return signature;
            }
            else if (txResult && txResult.meta && txResult.meta.err) {
                throw (0, error_1.createError)({ statusCode: 500, message: `Transaction failed with error: ${JSON.stringify(txResult.meta.err)}` });
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction not found or not confirmed" });
            }
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to transfer SOL", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to transfer SOL: ${error.message}` });
        }
    }
    async handleSplTokenWithdrawal(transactionId, walletId, tokenMintAddress, amount, toAddress, decimals, ctx) {
        var _a, _b, _c, _d, _e;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Starting SPL token withdrawal for ${transactionId}`);
            console_1.logger.info("SOL", `Starting SPL token withdrawal for ${transactionId}`);
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Fetching sender wallet data for ${walletId}`);
            console_1.logger.debug("SOL", `Fetching sender wallet data for ${walletId}`);
            const senderWalletData = await getWalletData(walletId, "SOL");
            if (!senderWalletData || !senderWalletData.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Sender wallet data not found" });
            }
            const decryptedSenderData = JSON.parse((0, encrypt_1.decrypt)(senderWalletData.data));
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(decryptedSenderData.privateKey, "hex"));
            console_1.logger.debug("SOL", `Sender: ${senderKeypair.publicKey.toBase58()}`);
            console_1.logger.debug("SOL", "Fetching master wallet data");
            const masterWallet = await getMasterWalletByChainFull("SOL");
            if (!masterWallet || !masterWallet.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet not found or invalid" });
            }
            const decryptedMasterData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
            const masterKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(decryptedMasterData.privateKey, "hex"));
            console_1.logger.debug("SOL", `Master (fee payer): ${masterKeypair.publicKey.toBase58()}`);
            const tokenMint = new web3_js_1.PublicKey(tokenMintAddress);
            const amountInLamports = Math.round(amount * Math.pow(10, decimals));
            console_1.logger.debug("SOL", `Amount: ${amountInLamports} lamports`);
            const senderTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, masterKeypair, tokenMint, senderKeypair.publicKey);
            const senderBalance = await this.connection.getTokenAccountBalance(senderTokenAccount.address);
            const senderBalanceAmount = (_c = senderBalance.value.uiAmount) !== null && _c !== void 0 ? _c : 0;
            if (senderBalanceAmount < amount) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Insufficient SPL token balance" });
            }
            console_1.logger.debug("SOL", `Sender token account: ${senderTokenAccount.address.toBase58()}, balance: ${senderBalance.value.uiAmount}`);
            const recipientPublicKey = new web3_js_1.PublicKey(toAddress);
            const recipientTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, masterKeypair, tokenMint, recipientPublicKey);
            console_1.logger.debug("SOL", `Recipient token account: ${recipientTokenAccount.address.toBase58()}`);
            const transferInstruction = (0, spl_token_1.createTransferInstruction)(senderTokenAccount.address, recipientTokenAccount.address, senderKeypair.publicKey, amountInLamports, [], spl_token_1.TOKEN_PROGRAM_ID);
            const transaction = new web3_js_1.Transaction().add(transferInstruction);
            const { blockhash: freshBlockhash, lastValidBlockHeight: freshLastValidBlockHeight } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = freshBlockhash;
            transaction.feePayer = masterKeypair.publicKey;
            transaction.sign(senderKeypair);
            transaction.partialSign(masterKeypair);
            const serializedTransaction = transaction.serialize();
            const signature = await this.connection.sendRawTransaction(serializedTransaction);
            console_1.logger.info("SOL", `Transaction sent: ${signature}`);
            const confirmationStrategy = {
                signature,
                blockhash: freshBlockhash,
                lastValidBlockHeight: freshLastValidBlockHeight,
            };
            await this.connection.confirmTransaction(confirmationStrategy, "confirmed");
            console_1.logger.success("SOL", `Transaction ${signature} confirmed`);
            await db_1.models.transaction.update({ status: "COMPLETED", trxId: signature }, { where: { id: transactionId } });
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `SPL token withdrawal completed: ${signature}`);
            console_1.logger.success("SOL", `Transaction ${transactionId} completed`);
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to process SPL token withdrawal", error);
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message || "Failed to process SPL token withdrawal");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: `SPL token withdrawal failed: ${error.message}`,
            }, { where: { id: transactionId } });
            throw error;
        }
    }
    async deploySplToken(masterWallet, decimals, ctx) {
        var _a, _b, _c, _d;
        try {
            this.ensureChainActive();
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting SPL token deployment");
            console_1.logger.info("SOL", "Starting SPL token deployment");
            if (!masterWallet.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet data not found" });
            }
            console_1.logger.debug("SOL", "Decrypting master wallet private key");
            const decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
            if (!decryptedData || !decryptedData.privateKey) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet private key is missing" });
            }
            let masterKeypair;
            const privateKeyBytes = Buffer.from(decryptedData.privateKey, "hex");
            if (privateKeyBytes.length === 64) {
                console_1.logger.debug("SOL", "Using 64-byte private key format");
                masterKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
            }
            else if (privateKeyBytes.length === 32) {
                console_1.logger.debug("SOL", "Extending 32-byte private key to 64 bytes");
                const extendedKey = new Uint8Array(64);
                extendedKey.set(privateKeyBytes, 0);
                masterKeypair = web3_js_1.Keypair.fromSecretKey(extendedKey);
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: `Invalid secret key length: ${privateKeyBytes.length} bytes` });
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Creating mint with ${decimals} decimals`);
            console_1.logger.info("SOL", `Creating mint with ${decimals} decimals`);
            const mint = await (0, spl_token_1.createMint)(this.connection, masterKeypair, masterKeypair.publicKey, null, decimals);
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Mint created: ${mint.toBase58()}`);
            console_1.logger.success("SOL", `Mint created: ${mint.toBase58()}`);
            return mint.toBase58();
        }
        catch (error) {
            console_1.logger.error("SOL", "Failed to deploy SPL token", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to deploy SPL token");
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to deploy SPL token: " + error.message });
        }
    }
    async mintInitialSupply(masterWallet, mintAddress, initialSupply, decimals, initialHolder, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Starting minting for ${mintAddress} to ${initialHolder}`);
            console_1.logger.info("SOL", `Starting minting for ${mintAddress} to ${initialHolder}`);
            if (!masterWallet.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet data not found" });
            }
            const decryptedData = JSON.parse((0, encrypt_1.decrypt)(masterWallet.data));
            if (!decryptedData || !decryptedData.privateKey) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Master wallet private key is missing" });
            }
            let masterKeypair;
            const privateKeyBytes = Buffer.from(decryptedData.privateKey, "hex");
            if (privateKeyBytes.length === 64) {
                masterKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
            }
            else if (privateKeyBytes.length === 32) {
                const extendedKey = new Uint8Array(64);
                extendedKey.set(privateKeyBytes, 0);
                masterKeypair = web3_js_1.Keypair.fromSecretKey(extendedKey);
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Invalid secret key length. Expected 32 or 64 bytes." });
            }
            const mint = new web3_js_1.PublicKey(mintAddress);
            const mintAmount = initialSupply * Math.pow(10, decimals);
            const initialHolderPubKey = new web3_js_1.PublicKey(initialHolder);
            let initialHolderAccount;
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    console_1.logger.debug("SOL", `Attempt ${attempt}: Creating associated token account for ${initialHolder}`);
                    initialHolderAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, masterKeypair, mint, initialHolderPubKey);
                    console_1.logger.debug("SOL", `Token account created: ${initialHolderAccount.address.toBase58()}`);
                    break;
                }
                catch (error) {
                    console_1.logger.error("SOL", `Attempt ${attempt} to create token account failed`, error);
                    if (attempt === 3) {
                        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to create associated token account: " + error.message });
                    }
                }
            }
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
                    console_1.logger.debug("SOL", `Attempt ${attempt}: Minting ${mintAmount} tokens`);
                    const signature = await (0, spl_token_1.mintTo)(this.connection, masterKeypair, mint, initialHolderAccount.address, masterKeypair, mintAmount);
                    console_1.logger.debug("SOL", `Minting signature: ${signature}`);
                    const confirmation = await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
                    if (confirmation.value.err) {
                        throw (0, error_1.createError)({ statusCode: 500, message: `Transaction failed: ${confirmation.value.err}` });
                    }
                    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Initial supply minted to ${initialHolderAccount.address.toBase58()}`);
                    console_1.logger.success("SOL", `Initial supply minted to ${initialHolderAccount.address.toBase58()}`);
                    return;
                }
                catch (error) {
                    console_1.logger.error("SOL", `Attempt ${attempt} to mint tokens failed`, error);
                    if (attempt === 3) {
                        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to mint initial supply");
                        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to mint initial supply: " + error.message });
                    }
                }
            }
        }
        catch (error) {
            console_1.logger.error("SOL", "Background minting failed", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Background minting failed");
        }
    }
}
exports.default = SolanaService;
