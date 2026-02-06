"use strict";
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
        var _a, _b;
        try {
            const transactions = [];
            const apiUrl = `${this.fullHost}/v1/accounts/${address}/transactions`;
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
            if (data.success && data.data && Array.isArray(data.data)) {
                const lastProcessedTime = TronService.lastScannedBlock.get(address) || 0;
                for (const tx of data.data) {
                    const txTimestamp = tx.block_timestamp || ((_a = tx.raw_data) === null || _a === void 0 ? void 0 : _a.timestamp) || 0;
                    if (txTimestamp > lastProcessedTime) {
                        if (((_b = tx.raw_data) === null || _b === void 0 ? void 0 : _b.contract) && tx.raw_data.contract[0]) {
                            const contract = tx.raw_data.contract[0];
                            if (contract.type === "TransferContract") {
                                const value = contract.parameter.value;
                                const to = tronweb_1.utils.address.fromHex(value.to_address);
                                if (to === address) {
                                    transactions.push(tx);
                                }
                            }
                        }
                    }
                }
                if (transactions.length > 0 || data.data.length > 0) {
                    TronService.lastScannedBlock.set(address, Date.now());
                }
            }
            if (transactions.length > 0) {
                console_1.logger.debug("TRON", `Fetched ${transactions.length} new transactions for ${address}`);
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
            let depositFound = false;
            const checkDeposits = async () => {
                if (depositFound || !TronService.monitoringAddresses.has(monitoringKey)) {
                    return;
                }
                try {
                    const rawTransactions = await this.fetchTronTransactions(address);
                    const transactions = this.parseTronTransactions(rawTransactions, address);
                    consecutiveErrors = 0;
                    currentInterval = baseInterval;
                    const deposits = transactions.filter((tx) => tx.to === address && tx.status === "Success");
                    if (deposits.length > 0) {
                        console_1.logger.info("TRON", `Found ${deposits.length} deposits for ${address}`);
                    }
                    for (const deposit of deposits) {
                        if (TronService.processedTransactions.has(deposit.hash)) {
                            console_1.logger.debug("TRON", `Transaction ${deposit.hash} already processed, skipping`);
                            continue;
                        }
                        const existingTx = await db_1.models.transaction.findOne({
                            where: { trxId: deposit.hash, walletId: wallet.id },
                        });
                        if (!existingTx) {
                            TronService.processedTransactions.set(deposit.hash, Date.now());
                            await this.processTronTransaction(deposit.hash, wallet, address);
                            depositFound = true;
                            TronService.monitoringAddresses.delete(monitoringKey);
                            console_1.logger.success("TRON", `Processed deposit for ${address}, stopping monitor`);
                            return;
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
                if (!depositFound && TronService.monitoringAddresses.has(monitoringKey)) {
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
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transferring ${amount} TRX to ${toAddress}`);
            const transactionSignature = await this.transferTrx(walletId, toAddress, amountSun);
            if (transactionSignature) {
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
}
TronService.monitoringAddresses = new Map();
TronService.lastScannedBlock = new Map();
TronService.processedTransactions = new Map();
TronService.PROCESSING_EXPIRY_MS = 30 * 60 * 1000;
exports.default = TronService;
