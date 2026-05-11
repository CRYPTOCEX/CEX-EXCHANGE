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
const tronweb_1 = require("tronweb");
const bip39_1 = require("bip39");
const ethers_1 = require("ethers");
const redis_1 = require("@b/utils/redis");
const date_fns_1 = require("date-fns");
const encrypt_1 = require("@b/utils/encrypt");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const security_1 = require("@b/utils/security");
let storeAndBroadcastTransaction;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) {
}
const TRX_DECIMALS = 1e6;
class TronService {
    static cleanupProcessedTransactions() {
        const now = Date.now();
        for (const [tx, timestamp] of TronService.processedTransactions.entries()) {
            if (now - timestamp > TronService.PROCESSING_EXPIRY_MS) {
                TronService.processedTransactions.delete(tx);
            }
        }
    }
    constructor(fullHost = TronService.getFullHostUrl(process.env.TRON_NETWORK || "mainnet"), cacheExpirationMinutes = 30) {
        this.chainActive = false;
        this.fullHost = fullHost;
        if (!this.fullHost || this.fullHost.trim() === '') {
            throw (0, error_1.createError)({ statusCode: 500, message: `Invalid TRON fullHost URL: ${this.fullHost}` });
        }
        if (process.env.DEBUG_TRON === "true") {
            console_1.logger.debug("TRON", `Initializing TronWeb with fullHost: ${this.fullHost}`);
            console_1.logger.debug("TRON", `API_KEY: ${process.env.TRON_API_KEY ? 'Set' : 'Not set'}`);
        }
        try {
            this.tronWeb = new tronweb_1.TronWeb({
                fullHost: this.fullHost,
                headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
            });
            if (process.env.DEBUG_TRON === "true") {
                console_1.logger.debug("TRON", "TronWeb initialized successfully");
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to initialize TronWeb", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `TronWeb initialization failed: ${error.message}` });
        }
        this.cacheExpiration = cacheExpirationMinutes;
    }
    static getFullHostUrl(network) {
        if (process.env.DEBUG_TRON === "true") {
            console_1.logger.debug("TRON", `getFullHostUrl called with network: "${network}"`);
        }
        let fullHost;
        switch (network) {
            case "mainnet":
                fullHost = process.env.TRON_MAINNET_RPC || "https://api.trongrid.io";
                break;
            case "shasta":
                fullHost = process.env.TRON_SHASTA_RPC || "https://api.shasta.trongrid.io";
                break;
            case "nile":
                fullHost = process.env.TRON_NILE_RPC || "https://api.nileex.io";
                break;
            default:
                console_1.logger.error("TRON", `Invalid Tron network: ${network}`);
                throw (0, error_1.createError)({ statusCode: 500, message: `Invalid Tron network: ${network}` });
        }
        if (!fullHost || fullHost.trim() === '') {
            console_1.logger.error("TRON", `Empty fullHost for network: ${network}`);
            throw (0, error_1.createError)({ statusCode: 500, message: `Empty TRON RPC URL for network: ${network}` });
        }
        try {
            new URL(fullHost);
        }
        catch (urlError) {
            console_1.logger.error("TRON", `Invalid URL format: ${fullHost}`);
            throw (0, error_1.createError)({ statusCode: 500, message: `Invalid TRON RPC URL format: ${fullHost}` });
        }
        if (process.env.DEBUG_TRON === "true") {
            console_1.logger.debug("TRON", `Resolved fullHost: "${fullHost}"`);
        }
        return fullHost;
    }
    static async getInstance() {
        if (!TronService.instance) {
            TronService.instance = new TronService();
            await TronService.instance.checkChainStatus();
            setInterval(() => TronService.cleanupProcessedTransactions(), 60 * 1000);
        }
        else if (!TronService.instance.chainActive) {
            await TronService.instance.checkChainStatus();
        }
        return TronService.instance;
    }
    async checkChainStatus() {
        const result = await (0, security_1.isBlockchainActive)("TRON");
        if (!result.active) {
            console_1.logger.warn("TRON", result.reason || "Blockchain not active");
            this.chainActive = false;
            return;
        }
        this.chainActive = true;
        console_1.logger.info("TRON", "TRON service initialized successfully");
    }
    ensureChainActive() {
        if (!this.chainActive) {
            throw (0, error_1.createError)({ statusCode: 500, message: "TRON service not available. Please ensure your license is activated and the blockchain is enabled." });
        }
    }
    createWallet() {
        this.ensureChainActive();
        const mnemonic = (0, bip39_1.generateMnemonic)();
        const derivationPath = "m/44'/195'/0'/0/0";
        const wallet = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
        const privateKey = wallet.privateKey.replace(/^0x/, "");
        const publicKey = wallet.publicKey.replace(/^0x/, "");
        const address = tronweb_1.utils.address.fromPrivateKey(privateKey);
        if (!address) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to derive address from private key" });
        }
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
            const cacheKey = `wallet:${address}:transactions:tron`;
            const cachedData = await this.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            const rawTransactions = await this.fetchTronTransactions(address);
            const parsedTransactions = this.parseTronTransactions(rawTransactions, address);
            const cacheData = {
                transactions: parsedTransactions,
                timestamp: new Date().toISOString(),
            };
            const redis = redis_1.RedisSingleton.getInstance();
            await redis.setex(cacheKey, this.cacheExpiration * 60, JSON.stringify(cacheData));
            return parsedTransactions;
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to fetch Tron transactions", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch Tron transactions: ${error instanceof Error ? error.message : error}` });
        }
    }
    async fetchTronTransactions(address) {
        var _a, _b, _c;
        try {
            const transactions = [];
            const apiUrl = `${this.fullHost}/v1/accounts/${address}/transactions?only_to=true&limit=50`;
            const headers = {
                'Accept': 'application/json',
            };
            if (process.env.TRON_API_KEY) {
                headers['TRON-PRO-API-KEY'] = process.env.TRON_API_KEY;
            }
            const response = await fetch(apiUrl, {
                headers,
                signal: AbortSignal.timeout(30000),
            });
            if (response.status === 429) {
                console_1.logger.warn("TRON", `Rate limited fetching transactions for ${address}, will retry later`);
                throw new Error("Rate limited");
            }
            if (response.status === 403) {
                console_1.logger.warn("TRON", `Forbidden (403) fetching transactions for ${address}. Check API key.`);
                throw new Error("Forbidden - check API key");
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if ((data === null || data === void 0 ? void 0 : data.data) && Array.isArray(data.data)) {
                for (const tx of data.data) {
                    if (((_c = (_b = (_a = tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.type) === "TransferContract") {
                        const value = tx.raw_data.contract[0].parameter.value;
                        const to = tronweb_1.utils.address.fromHex(value.to_address);
                        if (to === address) {
                            transactions.push(tx);
                        }
                    }
                }
            }
            if (transactions.length > 0) {
                console_1.logger.debug("TRON", `Fetched ${transactions.length} incoming transactions for ${address}`);
            }
            return transactions;
        }
        catch (error) {
            console_1.logger.error("TRON", `Failed to fetch transactions: ${error.message}`);
            throw error;
        }
    }
    parseTronTransactions(rawTransactions, address) {
        if (!Array.isArray(rawTransactions)) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid raw transactions format for Tron" });
        }
        return rawTransactions.map((tx) => {
            var _a, _b, _c, _d, _e;
            const hash = tx.txID;
            const timestamp = tx.raw_data.timestamp;
            let from = "";
            let to = "";
            let amount = "0";
            let fee = "0";
            let status = "Success";
            let isError = "0";
            let confirmations = "0";
            if (((_a = tx.ret) === null || _a === void 0 ? void 0 : _a[0]) && tx.ret[0].contractRet !== "SUCCESS") {
                status = "Failed";
                isError = "1";
            }
            if ((_c = (_b = tx.raw_data) === null || _b === void 0 ? void 0 : _b.contract) === null || _c === void 0 ? void 0 : _c[0]) {
                const contract = tx.raw_data.contract[0];
                if (contract.type === "TransferContract") {
                    const value = contract.parameter.value;
                    from = tronweb_1.utils.address.fromHex(value.owner_address);
                    to = tronweb_1.utils.address.fromHex(value.to_address);
                    amount = (value.amount / TRX_DECIMALS).toString();
                }
            }
            if ((_e = (_d = tx.ret) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.fee) {
                fee = (tx.ret[0].fee / TRX_DECIMALS).toString();
            }
            else if (tx.fee) {
                fee = (tx.fee / TRX_DECIMALS).toString();
            }
            if (tx.blockNumber) {
                confirmations = tx.blockNumber.toString();
            }
            return {
                timestamp: new Date(timestamp).toISOString(),
                hash,
                from,
                to,
                amount,
                confirmations,
                status,
                isError,
                fee,
            };
        });
    }
    async getBalance(address) {
        try {
            const balanceSun = await this.tronWeb.trx.getBalance(address);
            const balanceTRX = (balanceSun / TRX_DECIMALS).toString();
            return balanceTRX;
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to fetch balance", error);
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
    async monitorTronDeposits(wallet, address) {
        const monitoringKey = `${wallet.id}_${address}`;
        if (TronService.monitoringAddresses.has(monitoringKey)) {
            console_1.logger.debug("TRON", `Monitoring already in progress for ${address}`);
            return;
        }
        TronService.monitoringAddresses.set(monitoringKey, true);
        try {
            console_1.logger.info("TRON", `Starting deposit monitoring for wallet ${wallet.id} on ${address}`);
            const baseInterval = 30 * 1000;
            const maxInterval = 5 * 60 * 1000;
            let currentInterval = baseInterval;
            let consecutiveErrors = 0;
            const maxConsecutiveErrors = 10;
            const MIN_DEPOSIT_TRX = 0.001;
            const checkDeposits = async () => {
                if (!TronService.monitoringAddresses.has(monitoringKey)) {
                    return;
                }
                try {
                    const rawTransactions = await this.fetchTronTransactions(address);
                    const transactions = this.parseTronTransactions(rawTransactions, address);
                    consecutiveErrors = 0;
                    currentInterval = baseInterval;
                    const deposits = transactions.filter((tx) => tx.to === address &&
                        tx.status === "Success" &&
                        parseFloat(tx.amount) >= MIN_DEPOSIT_TRX);
                    const dustCount = transactions.filter((tx) => tx.to === address &&
                        tx.status === "Success" &&
                        parseFloat(tx.amount) < MIN_DEPOSIT_TRX).length;
                    if (deposits.length > 0) {
                        console_1.logger.info("TRON", `Found ${deposits.length} deposits for ${address}${dustCount ? ` (skipped ${dustCount} dust)` : ""}`);
                    }
                    else if (dustCount > 0) {
                        console_1.logger.debug("TRON", `Skipped ${dustCount} dust transaction(s) for ${address}`);
                    }
                    for (const deposit of deposits) {
                        if (TronService.processedTransactions.has(deposit.hash)) {
                            continue;
                        }
                        const existingTx = await db_1.models.transaction.findOne({
                            where: { trxId: deposit.hash, walletId: wallet.id },
                        });
                        if (existingTx) {
                            TronService.processedTransactions.set(deposit.hash, Date.now());
                            continue;
                        }
                        TronService.processedTransactions.set(deposit.hash, Date.now());
                        try {
                            await this.processTronTransaction(deposit.hash, wallet, address);
                            console_1.logger.success("TRON", `Processed deposit ${deposit.hash} (${deposit.amount} TRX) for ${address}`);
                        }
                        catch (procErr) {
                            TronService.processedTransactions.delete(deposit.hash);
                            console_1.logger.error("TRON", `Failed to process ${deposit.hash}: ${procErr instanceof Error ? procErr.message : procErr}`);
                        }
                    }
                }
                catch (error) {
                    consecutiveErrors++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage.includes("Rate limited") || errorMessage.includes("429")) {
                        currentInterval = Math.min(currentInterval * 2, maxInterval);
                        console_1.logger.warn("TRON", `Rate limited for ${address}, backing off to ${currentInterval / 1000}s`);
                    }
                    else if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
                        currentInterval = Math.min(currentInterval * 3, maxInterval);
                        console_1.logger.warn("TRON", `Forbidden error for ${address}, backing off to ${currentInterval / 1000}s`);
                    }
                    else {
                        console_1.logger.error("TRON", `Error checking deposits for ${address}: ${errorMessage}`);
                    }
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        console_1.logger.error("TRON", `Max consecutive errors (${maxConsecutiveErrors}) reached for ${address}, stopping monitor`);
                        TronService.monitoringAddresses.delete(monitoringKey);
                        return;
                    }
                }
                TronService.cleanupProcessedTransactions();
                if (TronService.monitoringAddresses.has(monitoringKey)) {
                    setTimeout(checkDeposits, currentInterval);
                }
            };
            const initialDelay = Math.random() * 5000;
            setTimeout(checkDeposits, initialDelay);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error setting up deposit monitoring for ${address}`, error);
            TronService.monitoringAddresses.delete(monitoringKey);
        }
    }
    async processTronTransaction(transactionHash, wallet, address) {
        var _a, _b;
        try {
            console_1.logger.debug("TRON", `Fetching transaction ${transactionHash}`);
            const transactionInfo = await this.tronWeb.trx.getTransactionInfo(transactionHash);
            if (!transactionInfo) {
                console_1.logger.error("TRON", `Transaction ${transactionHash} not found`);
                return;
            }
            const txDetails = await this.tronWeb.trx.getTransaction(transactionHash);
            if (!txDetails) {
                console_1.logger.error("TRON", `Transaction details not found for ${transactionHash}`);
                return;
            }
            let from = "";
            let to = "";
            let amount = "0";
            let fee = "0";
            if ((_b = (_a = txDetails.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0]) {
                const contract = txDetails.raw_data.contract[0];
                if (contract.type === "TransferContract") {
                    const value = contract.parameter.value;
                    from = tronweb_1.utils.address.fromHex(value.owner_address);
                    to = tronweb_1.utils.address.fromHex(value.to_address);
                    amount = (value.amount / TRX_DECIMALS).toString();
                }
            }
            if (transactionInfo.fee) {
                fee = (transactionInfo.fee / TRX_DECIMALS).toString();
            }
            const txData = {
                contractType: "NATIVE",
                id: wallet.id,
                chain: "TRON",
                hash: transactionHash,
                type: "DEPOSIT",
                from,
                address,
                amount,
                fee,
                status: "COMPLETED",
            };
            await storeAndBroadcastTransaction(txData, transactionHash);
            console_1.logger.success("TRON", `Processed transaction ${transactionHash}`);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error processing transaction ${transactionHash}`, error);
        }
    }
    async handleTronWithdrawal(transactionId, walletId, amount, toAddress, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing Tron withdrawal for transaction ${transactionId}`);
            const amountSun = Math.round(amount * TRX_DECIMALS);
            let sourceWalletId = walletId;
            const userWalletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "TRX", chain: "TRON" },
            });
            if (userWalletData && userWalletData.data) {
                const decryptedData = JSON.parse((0, encrypt_1.decrypt)(userWalletData.data));
                const userPrivateKey = decryptedData.privateKey.replace(/^0x/, "");
                const tempTronWeb = new tronweb_1.TronWeb({
                    fullHost: this.fullHost,
                    privateKey: userPrivateKey,
                    headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
                });
                const userAddress = tempTronWeb.defaultAddress.base58;
                if (userAddress) {
                    try {
                        const onChainBalance = await this.tronWeb.trx.getBalance(userAddress);
                        if (onChainBalance < amountSun) {
                            console_1.logger.info("TRON", `User address ${userAddress} has ${onChainBalance} sun but needs ${amountSun} sun. Looking for alternative wallet.`);
                            const { findAlternativeWalletData } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/wallet")));
                            const altWalletData = await findAlternativeWalletData({ currency: "TRX", chain: "TRON" }, amount);
                            if (altWalletData && altWalletData.walletId !== walletId) {
                                sourceWalletId = altWalletData.walletId;
                                console_1.logger.info("TRON", `Using alternative wallet ${sourceWalletId} for withdrawal`);
                            }
                        }
                    }
                    catch (balanceCheckError) {
                        console_1.logger.warn("TRON", `Failed to check on-chain balance, proceeding with user wallet: ${balanceCheckError instanceof Error ? balanceCheckError.message : balanceCheckError}`);
                    }
                }
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} TRX to ${toAddress}`);
            const transactionSignature = await this.transferTrx(sourceWalletId, toAddress, amountSun);
            if (transactionSignature) {
                if (sourceWalletId !== walletId) {
                    try {
                        const { updatePrivateLedger } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/wallet")));
                        const { sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
                        const { Transaction } = await Promise.resolve().then(() => __importStar(require("sequelize")));
                        await sequelize.transaction(async (t) => {
                            const altWalletData = await db_1.models.walletData.findOne({
                                where: { walletId: sourceWalletId, currency: "TRX", chain: "TRON" },
                                transaction: t,
                                lock: Transaction.LOCK.UPDATE,
                            });
                            if (!altWalletData) {
                                return;
                            }
                            await updatePrivateLedger(sourceWalletId, altWalletData.index, "TRX", "TRON", amount, t);
                            const altBalance = parseFloat(String(altWalletData.balance)) || 0;
                            const newAltBalance = altBalance - amount;
                            if (newAltBalance < 0) {
                                throw (0, error_1.createError)({
                                    statusCode: 400,
                                    message: `Alternative TRON wallet balance would go negative (have=${altBalance}, debit=${amount})`,
                                });
                            }
                            await db_1.models.walletData.update({ balance: newAltBalance }, { where: { id: altWalletData.id }, transaction: t });
                        });
                    }
                    catch (ledgerError) {
                        console_1.logger.error("TRON", "Failed to update private ledger for alternative wallet", ledgerError);
                    }
                }
                await db_1.models.transaction.update({
                    status: "COMPLETED",
                    trxId: transactionSignature,
                }, { where: { id: transactionId } });
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Tron withdrawal completed: ${transactionSignature}`);
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Failed to receive transaction signature" });
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to execute withdrawal", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error instanceof Error ? error.message : "Failed to execute withdrawal");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: `Withdrawal failed: ${error instanceof Error ? error.message : error}`,
            }, { where: { id: transactionId } });
            throw error;
        }
    }
    async isAddressActivated(address) {
        try {
            const account = await this.tronWeb.trx.getAccount(address);
            return !!(account && account.address);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error checking if address ${address} is activated`, error);
            return false;
        }
    }
    async estimateTransactionFee(fromAddress, toAddress, amountSun) {
        try {
            const transaction = await this.tronWeb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            const bandwidthNeeded = Math.ceil(JSON.stringify(transaction).length / 2);
            const bandwidth = await this.tronWeb.trx.getBandwidth(fromAddress);
            const bandwidthDeficit = Math.max(0, bandwidthNeeded - bandwidth);
            const feeSun = bandwidthDeficit * 10000;
            return feeSun;
        }
        catch (error) {
            console_1.logger.error("TRON", "Error estimating transaction fee", error);
            return 0;
        }
    }
    async transferTrx(walletId, toAddress, amount) {
        try {
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "TRX", chain: "TRON" },
            });
            if (!walletData || !walletData.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Private key not found for the wallet" });
            }
            const decryptedWalletData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            const privateKey = decryptedWalletData.privateKey.replace(/^0x/, "");
            const tronWeb = new tronweb_1.TronWeb({
                fullHost: this.fullHost,
                privateKey: privateKey,
                headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
            });
            const fromAddress = tronWeb.defaultAddress.base58;
            if (!fromAddress) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Default address is not set" });
            }
            const tradeObj = await tronWeb.transactionBuilder.sendTrx(toAddress, amount, fromAddress);
            const signedTxn = await tronWeb.trx.sign(tradeObj);
            const receipt = await tronWeb.trx.sendRawTransaction(signedTxn);
            if (receipt.result === true) {
                console_1.logger.success("TRON", `Transfer successful: ${receipt.txid}`);
                return receipt.txid;
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: `Transaction failed: ${JSON.stringify(receipt)}` });
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to transfer TRX", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to transfer TRX: ${error instanceof Error ? error.message : error}` });
        }
    }
    async fetchTrc20Transactions(address, contractAddress) {
        try {
            const cacheKey = `wallet:${address}:transactions:trc20:${contractAddress || "all"}`;
            const cachedData = await this.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            const rawTransactions = await this.fetchTrc20RawTransactions(address, contractAddress);
            const parsedTransactions = this.parseTrc20Transactions(rawTransactions, address);
            const cacheData = {
                transactions: parsedTransactions,
                timestamp: new Date().toISOString(),
            };
            const redis = redis_1.RedisSingleton.getInstance();
            await redis.setex(cacheKey, this.cacheExpiration * 60, JSON.stringify(cacheData));
            return parsedTransactions;
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to fetch TRC20 transactions", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to fetch TRC20 transactions: ${error instanceof Error ? error.message : error}` });
        }
    }
    async fetchTrc20RawTransactions(address, contractAddress) {
        try {
            let apiUrl = `${this.fullHost}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&limit=50&order_by=block_timestamp,desc`;
            if (contractAddress) {
                apiUrl += `&contract_address=${contractAddress}`;
            }
            const headers = {
                'Accept': 'application/json',
            };
            if (process.env.TRON_API_KEY) {
                headers['TRON-PRO-API-KEY'] = process.env.TRON_API_KEY;
            }
            const response = await fetch(apiUrl, {
                headers,
                signal: AbortSignal.timeout(30000),
            });
            if (response.status === 429) {
                console_1.logger.warn("TRON", `Rate limited fetching TRC20 transactions for ${address}`);
                throw new Error("Rate limited");
            }
            if (response.status === 403) {
                console_1.logger.warn("TRON", `Forbidden (403) fetching TRC20 transactions for ${address}. Check API key.`);
                throw new Error("Forbidden - check API key");
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const transactions = [];
            if ((data === null || data === void 0 ? void 0 : data.data) && Array.isArray(data.data)) {
                for (const tx of data.data) {
                    if (tx.to === address) {
                        transactions.push(tx);
                    }
                }
            }
            if (transactions.length > 0) {
                console_1.logger.debug("TRON", `Fetched ${transactions.length} incoming TRC20 transactions for ${address}`);
            }
            return transactions;
        }
        catch (error) {
            console_1.logger.error("TRON", `Failed to fetch TRC20 transactions: ${error.message}`);
            throw error;
        }
    }
    parseTrc20Transactions(rawTransactions, address) {
        if (!Array.isArray(rawTransactions)) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid raw TRC20 transactions format" });
        }
        return rawTransactions.map((tx) => {
            var _a;
            const hash = tx.transaction_id;
            const timestamp = tx.block_timestamp;
            const from = tx.from || "";
            const to = tx.to || "";
            const decimals = parseInt(((_a = tx.token_info) === null || _a === void 0 ? void 0 : _a.decimals) || "6", 10);
            const rawValue = BigInt(tx.value || "0");
            const amount = (Number(rawValue) / Math.pow(10, decimals)).toString();
            return {
                timestamp: new Date(timestamp).toISOString(),
                hash,
                from,
                to,
                amount,
                confirmations: "20",
                status: "Success",
                isError: "0",
                fee: "0",
            };
        });
    }
    async monitorTrc20Deposits(wallet, address, contractAddress, currency, decimals) {
        const monitoringKey = `${wallet.id}_${address}_trc20_${contractAddress}`;
        if (TronService.monitoringAddresses.has(monitoringKey)) {
            console_1.logger.debug("TRON", `TRC20 monitoring already in progress for ${address} (${currency})`);
            return;
        }
        TronService.monitoringAddresses.set(monitoringKey, true);
        try {
            console_1.logger.info("TRON", `Starting TRC20 deposit monitoring for wallet ${wallet.id} on ${address} (${currency})`);
            const baseInterval = 30 * 1000;
            const maxInterval = 5 * 60 * 1000;
            let currentInterval = baseInterval;
            let consecutiveErrors = 0;
            const maxConsecutiveErrors = 10;
            const minTokenAmount = 1 / Math.pow(10, Math.max(0, decimals - 3));
            const checkDeposits = async () => {
                if (!TronService.monitoringAddresses.has(monitoringKey)) {
                    return;
                }
                try {
                    const rawTransactions = await this.fetchTrc20RawTransactions(address, contractAddress);
                    const transactions = this.parseTrc20Transactions(rawTransactions, address);
                    consecutiveErrors = 0;
                    currentInterval = baseInterval;
                    const deposits = transactions.filter((tx) => tx.to === address &&
                        tx.status === "Success" &&
                        parseFloat(tx.amount) >= minTokenAmount);
                    const dustCount = transactions.filter((tx) => tx.to === address &&
                        tx.status === "Success" &&
                        parseFloat(tx.amount) < minTokenAmount).length;
                    if (deposits.length > 0) {
                        console_1.logger.info("TRON", `Found ${deposits.length} TRC20 (${currency}) deposits for ${address}${dustCount ? ` (skipped ${dustCount} dust)` : ""}`);
                    }
                    else if (dustCount > 0) {
                        console_1.logger.debug("TRON", `Skipped ${dustCount} dust TRC20 (${currency}) tx(s) for ${address}`);
                    }
                    for (const deposit of deposits) {
                        if (TronService.processedTransactions.has(deposit.hash)) {
                            continue;
                        }
                        const existingTx = await db_1.models.transaction.findOne({
                            where: { trxId: deposit.hash, walletId: wallet.id },
                        });
                        if (existingTx) {
                            TronService.processedTransactions.set(deposit.hash, Date.now());
                            continue;
                        }
                        TronService.processedTransactions.set(deposit.hash, Date.now());
                        try {
                            await this.processTrc20Transaction(deposit.hash, wallet, address, contractAddress, currency, decimals);
                            console_1.logger.success("TRON", `Processed TRC20 deposit ${deposit.hash} (${deposit.amount} ${currency}) for ${address}`);
                        }
                        catch (procErr) {
                            TronService.processedTransactions.delete(deposit.hash);
                            console_1.logger.error("TRON", `Failed to process TRC20 ${deposit.hash}: ${procErr instanceof Error ? procErr.message : procErr}`);
                        }
                    }
                }
                catch (error) {
                    consecutiveErrors++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage.includes("Rate limited") || errorMessage.includes("429")) {
                        currentInterval = Math.min(currentInterval * 2, maxInterval);
                        console_1.logger.warn("TRON", `Rate limited for TRC20 ${address}, backing off to ${currentInterval / 1000}s`);
                    }
                    else if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
                        currentInterval = Math.min(currentInterval * 3, maxInterval);
                        console_1.logger.warn("TRON", `Forbidden error for TRC20 ${address}, backing off to ${currentInterval / 1000}s`);
                    }
                    else {
                        console_1.logger.error("TRON", `Error checking TRC20 deposits for ${address}: ${errorMessage}`);
                    }
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        console_1.logger.error("TRON", `Max consecutive errors reached for TRC20 ${address}, stopping monitor`);
                        TronService.monitoringAddresses.delete(monitoringKey);
                        return;
                    }
                }
                TronService.cleanupProcessedTransactions();
                if (TronService.monitoringAddresses.has(monitoringKey)) {
                    setTimeout(checkDeposits, currentInterval);
                }
            };
            const initialDelay = Math.random() * 5000;
            setTimeout(checkDeposits, initialDelay);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error setting up TRC20 deposit monitoring for ${address}`, error);
            TronService.monitoringAddresses.delete(monitoringKey);
        }
    }
    async processTrc20Transaction(transactionHash, wallet, address, contractAddress, currency, decimals) {
        try {
            console_1.logger.debug("TRON", `Fetching TRC20 transaction ${transactionHash}`);
            const transactionInfo = await this.tronWeb.trx.getTransactionInfo(transactionHash);
            if (!transactionInfo) {
                console_1.logger.error("TRON", `TRC20 transaction ${transactionHash} not found`);
                return;
            }
            let from = "";
            let to = "";
            let amount = "0";
            let fee = "0";
            if (transactionInfo.log && transactionInfo.log.length > 0) {
                for (const log of transactionInfo.log) {
                    if (log.topics &&
                        log.topics.length === 3 &&
                        log.topics[0] ===
                            "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                        from = tronweb_1.utils.address.fromHex("41" + log.topics[1].substring(24));
                        to = tronweb_1.utils.address.fromHex("41" + log.topics[2].substring(24));
                        const rawValue = BigInt("0x" + log.data);
                        amount = (Number(rawValue) / Math.pow(10, decimals)).toString();
                        break;
                    }
                }
            }
            if (transactionInfo.fee) {
                fee = (transactionInfo.fee / TRX_DECIMALS).toString();
            }
            const txData = {
                contractType: "NO_PERMIT",
                id: wallet.id,
                chain: "TRON",
                hash: transactionHash,
                type: "DEPOSIT",
                from,
                address,
                amount,
                fee,
                status: "COMPLETED",
                contract: contractAddress,
                currency,
            };
            await storeAndBroadcastTransaction(txData, transactionHash);
            console_1.logger.success("TRON", `Processed TRC20 transaction ${transactionHash} (${amount} ${currency})`);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error processing TRC20 transaction ${transactionHash}`, error);
        }
    }
    async handleTrc20Withdrawal(transactionId, walletId, contractAddress, amount, toAddress, decimals, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing TRC20 withdrawal for transaction ${transactionId}`);
            const amountInSmallestUnit = BigInt(Math.round(amount * Math.pow(10, decimals))).toString();
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "TRX", chain: "TRON" },
            });
            if (!walletData || !walletData.data) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Private key not found for the wallet" });
            }
            const decryptedWalletData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            let privateKey = decryptedWalletData.privateKey.replace(/^0x/, "");
            let sourceWalletId = walletId;
            const userTronWeb = new tronweb_1.TronWeb({
                fullHost: this.fullHost,
                privateKey,
                headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
            });
            const userAddress = userTronWeb.defaultAddress.base58;
            if (userAddress) {
                try {
                    const onChainBalance = await this.getTrc20Balance(userAddress, contractAddress);
                    const onChainBalanceNum = parseFloat(onChainBalance);
                    if (onChainBalanceNum < amount) {
                        console_1.logger.info("TRON", `User address ${userAddress} has ${onChainBalanceNum} but needs ${amount} TRC20 tokens. Looking for alternative wallet.`);
                        const { findAlternativeWalletData } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/wallet")));
                        const token = await db_1.models.ecosystemToken.findOne({
                            where: { contract: contractAddress, chain: "TRON" },
                        });
                        if (token) {
                            const altWalletData = await findAlternativeWalletData({ currency: token.currency, chain: "TRON" }, amount);
                            if (altWalletData && altWalletData.walletId !== walletId) {
                                sourceWalletId = altWalletData.walletId;
                                const altWallet = await db_1.models.walletData.findOne({
                                    where: { walletId: sourceWalletId, currency: "TRX", chain: "TRON" },
                                });
                                if (altWallet && altWallet.data) {
                                    const altDecrypted = JSON.parse((0, encrypt_1.decrypt)(altWallet.data));
                                    privateKey = altDecrypted.privateKey.replace(/^0x/, "");
                                    console_1.logger.info("TRON", `Using alternative wallet ${sourceWalletId} for TRC20 withdrawal`);
                                }
                            }
                        }
                    }
                }
                catch (balanceCheckError) {
                    console_1.logger.warn("TRON", `Failed to check TRC20 on-chain balance, proceeding with user wallet: ${balanceCheckError instanceof Error ? balanceCheckError.message : balanceCheckError}`);
                }
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} TRC20 tokens to ${toAddress}`);
            const tronWeb = new tronweb_1.TronWeb({
                fullHost: this.fullHost,
                privateKey,
                headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
            });
            const fromAddress = tronWeb.defaultAddress.base58;
            if (!fromAddress) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Default address is not set" });
            }
            const functionSelector = "transfer(address,uint256)";
            const parameter = [
                { type: "address", value: toAddress },
                { type: "uint256", value: amountInSmallestUnit },
            ];
            const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(contractAddress, functionSelector, {
                feeLimit: 100000000,
                callValue: 0,
            }, parameter, fromAddress);
            if (!transaction) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Failed to build TRC20 transfer transaction" });
            }
            const signedTxn = await tronWeb.trx.sign(transaction);
            const receipt = await tronWeb.trx.sendRawTransaction(signedTxn);
            if (receipt.result === true) {
                const txHash = receipt.txid;
                console_1.logger.success("TRON", `TRC20 transfer successful: ${txHash}`);
                if (sourceWalletId !== walletId) {
                    try {
                        const { updatePrivateLedger } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/wallet")));
                        const altWalletDataRecord = await db_1.models.walletData.findOne({
                            where: { walletId: sourceWalletId, currency: "TRX", chain: "TRON" },
                        });
                        if (altWalletDataRecord) {
                            const token = await db_1.models.ecosystemToken.findOne({
                                where: { contract: contractAddress, chain: "TRON" },
                            });
                            if (token) {
                                await updatePrivateLedger(sourceWalletId, altWalletDataRecord.index, token.currency, "TRON", amount);
                            }
                        }
                    }
                    catch (ledgerError) {
                        console_1.logger.error("TRON", "Failed to update private ledger for alternative wallet", ledgerError);
                    }
                }
                await db_1.models.transaction.update({
                    status: "COMPLETED",
                    trxId: txHash,
                }, { where: { id: transactionId } });
                (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `TRC20 withdrawal completed: ${txHash}`);
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: `TRC20 transaction failed: ${JSON.stringify(receipt)}` });
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to execute TRC20 withdrawal", error);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error instanceof Error ? error.message : "Failed to execute TRC20 withdrawal");
            await db_1.models.transaction.update({
                status: "FAILED",
                description: `TRC20 withdrawal failed: ${error instanceof Error ? error.message : error}`,
            }, { where: { id: transactionId } });
            throw error;
        }
    }
    async getTrc20Balance(address, contractAddress) {
        try {
            const apiUrl = `${this.fullHost}/v1/accounts/${address}`;
            const headers = {
                'Accept': 'application/json',
            };
            if (process.env.TRON_API_KEY) {
                headers['TRON-PRO-API-KEY'] = process.env.TRON_API_KEY;
            }
            const response = await fetch(apiUrl, {
                headers,
                signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
                const account = data.data[0];
                if (account.trc20) {
                    for (const tokenObj of account.trc20) {
                        if (tokenObj[contractAddress]) {
                            const token = await db_1.models.ecosystemToken.findOne({
                                where: { contract: contractAddress, chain: "TRON" },
                            });
                            const decimals = (token === null || token === void 0 ? void 0 : token.decimals) || 6;
                            const rawBalance = BigInt(tokenObj[contractAddress]);
                            return (Number(rawBalance) / Math.pow(10, decimals)).toString();
                        }
                    }
                }
            }
            return "0";
        }
        catch (error) {
            console_1.logger.error("TRON", `Failed to fetch TRC20 balance for ${address}`, error);
            return "0";
        }
    }
    async estimateTrc20TransactionFee(fromAddress, toAddress, contractAddress, amount, decimals) {
        try {
            const amountInSmallestUnit = BigInt(Math.round(amount * Math.pow(10, decimals))).toString();
            const functionSelector = "transfer(address,uint256)";
            const parameter = [
                { type: "address", value: toAddress },
                { type: "uint256", value: amountInSmallestUnit },
            ];
            const result = await this.tronWeb.transactionBuilder.triggerConstantContract(contractAddress, functionSelector, {}, parameter, fromAddress);
            const energyUsed = result.energy_used || 65000;
            const energyPrice = 420;
            const feeSun = energyUsed * energyPrice;
            return feeSun / TRX_DECIMALS;
        }
        catch (error) {
            console_1.logger.error("TRON", "Error estimating TRC20 transaction fee", error);
            return 27;
        }
    }
}
TronService.monitoringAddresses = new Map();
TronService.lastScannedBlock = new Map();
TronService.processedTransactions = new Map();
TronService.PROCESSING_EXPIRY_MS = 30 * 60 * 1000;
exports.default = TronService;
