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
const db_1 = require("@b/db");
const safe_imports_1 = require("@b/utils/safe-imports");
const notifications_1 = require("@b/utils/notifications");
const utxo_network_1 = require("@b/utils/utxo-network");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const Websocket_1 = require("@b/handler/Websocket");
const rust_owns_1 = require("@b/utils/rust-owns");
let depositDetailsModule = null;
async function loadDepositDetails() {
    if (!depositDetailsModule) {
        depositDetailsModule = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/utxo/deposit-details")));
    }
    return depositDetailsModule;
}
const BTC_NODE = (process.env.BTC_NODE || "mempool").toLowerCase();
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;
const BTC_NETWORK = (process.env.BTC_NETWORK || "mainnet").toLowerCase();
const BLOCKCYPHER_USABLE = !!BLOCKCYPHER_TOKEN && ["mainnet", "testnet3"].includes(BTC_NETWORK);
const SCAN_INTERVAL = 60000;
const REQUIRED_CONFIRMATIONS = 3;
const PROCESSED_TX_TTL = 60 * 60 * 1000;
const WALLET_SCAN_SPACING_MS = 250;
const MAX_WALLETS_PER_CYCLE = 100;
class BTCDepositScanner {
    constructor() {
        this.isScanning = false;
        this.processedTransactions = new Map();
        this.provider = null;
        this.providerType = null;
        this.scanInterval = null;
        this.ecosystemWalletUtils = null;
        this.initFailureCount = 0;
        this.isInitialized = false;
        this.scanCursor = 0;
    }
    static getInstance() {
        if (!BTCDepositScanner.instance) {
            BTCDepositScanner.instance = new BTCDepositScanner();
        }
        return BTCDepositScanner.instance;
    }
    async initializeProviderWithFallback() {
        const fallbackChain = [];
        switch (BTC_NODE) {
            case "node":
                fallbackChain.push("node");
                fallbackChain.push("mempool");
                if (BLOCKCYPHER_USABLE) {
                    fallbackChain.push("blockcypher");
                }
                break;
            case "blockcypher":
                if (BLOCKCYPHER_USABLE) {
                    fallbackChain.push("blockcypher");
                }
                fallbackChain.push("mempool");
                break;
            case "mempool":
            default:
                fallbackChain.push("mempool");
                if (BLOCKCYPHER_USABLE) {
                    fallbackChain.push("blockcypher");
                }
                break;
        }
        for (const providerType of fallbackChain) {
            try {
                const success = await this.tryInitializeProvider(providerType);
                if (success) {
                    this.providerType = providerType;
                    return true;
                }
            }
            catch (error) {
                console_1.logger.groupItem("BTC_SCAN", `${providerType} failed: ${error instanceof Error ? error.message : error}`, "error");
            }
        }
        return false;
    }
    async tryInitializeProvider(type) {
        var _a;
        switch (type) {
            case "node": {
                console_1.logger.groupItem("BTC_SCAN", "Trying local Bitcoin Core node...");
                const BitcoinNodeService = await (0, safe_imports_1.getBitcoinNodeService)();
                if (!(0, safe_imports_1.isServiceAvailable)(BitcoinNodeService)) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "Bitcoin Node service not available" });
                }
                console_1.logger.groupItem("BTC_SCAN", "Initializing BTC Core RPC connection");
                this.provider = await BitcoinNodeService.getInstance();
                const isSynced = await this.provider.isSynced();
                if (!isSynced) {
                    const progress = await this.provider.getSyncProgress();
                    console_1.logger.groupItem("BTC_SCAN", `Node syncing: ${progress.blocks}/${progress.headers} (${progress.progress.toFixed(1)}%)`, "warn");
                }
                console_1.logger.groupItem("BTC_SCAN", "Local node connected", "success");
                return true;
            }
            case "mempool": {
                console_1.logger.groupItem("BTC_SCAN", "Trying Mempool.space API...");
                const MempoolProvider = await (0, safe_imports_1.getMempoolProviderClass)();
                if (!(0, safe_imports_1.isServiceAvailable)(MempoolProvider)) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "Mempool provider not available" });
                }
                const mempoolProvider = new MempoolProvider("BTC");
                const isAvailable = await mempoolProvider.isAvailable();
                if (!isAvailable) {
                    const reason = (_a = mempoolProvider.getLastError) === null || _a === void 0 ? void 0 : _a.call(mempoolProvider);
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: `Mempool API not reachable on any mirror${reason ? `: ${reason}` : ""}`,
                    });
                }
                this.provider = mempoolProvider;
                console_1.logger.groupItem("BTC_SCAN", `${mempoolProvider.getName()} connected`, "success");
                return true;
            }
            case "blockcypher": {
                if (!BLOCKCYPHER_TOKEN) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "BLOCKCYPHER_TOKEN not configured" });
                }
                console_1.logger.groupItem("BTC_SCAN", "Trying BlockCypher API...");
                const BlockCypherProvider = await (0, safe_imports_1.getBlockCypherProviderClass)();
                if (!(0, safe_imports_1.isServiceAvailable)(BlockCypherProvider)) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "BlockCypher provider not available" });
                }
                const blockcypherProvider = new BlockCypherProvider("BTC");
                const isAvailable = await blockcypherProvider.isAvailable();
                if (!isAvailable) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "BlockCypher API not reachable" });
                }
                this.provider = blockcypherProvider;
                console_1.logger.groupItem("BTC_SCAN", "BlockCypher connected", "success");
                return true;
            }
            default:
                return false;
        }
    }
    async start() {
        if (this.isInitialized) {
            return;
        }
        if ((0, rust_owns_1.rustOwns)("btcDepositScanner")) {
            return;
        }
        this.ecosystemWalletUtils = await (0, safe_imports_1.getEcosystemWalletUtils)();
        if (!(0, safe_imports_1.isServiceAvailable)(this.ecosystemWalletUtils)) {
            return;
        }
        console_1.logger.group("BTC_SCAN", "Starting Bitcoin deposit scanner...");
        console_1.logger.registerGroupAlias("BTC_NODE", "BTC_SCAN");
        console_1.logger.registerGroupAlias("BTC_NODE_PROVIDER", "BTC_SCAN");
        try {
            const providerInitialized = await this.initializeProviderWithFallback();
            if (!providerInitialized) {
                throw (0, error_1.createError)({ statusCode: 500, message: "All providers failed - no BTC scanning available" });
            }
            if (this.providerType === "node") {
                await this.importAllAddresses();
            }
            this.startPeriodicScan();
            this.isInitialized = true;
            this.initFailureCount = 0;
            console_1.logger.groupEnd("BTC_SCAN", `Scanner started using ${this.providerType}`, true);
        }
        catch (error) {
            this.provider = null;
            this.providerType = null;
            this.initFailureCount++;
            console_1.logger.groupEnd("BTC_SCAN", `Failed (attempt ${this.initFailureCount}, retrying next cycle): ${error instanceof Error ? error.message : error}`, false);
            if (this.initFailureCount === 1) {
                if (BTC_NODE === "node") {
                    console_1.logger.warn("BTC_SCAN", "Tip: Ensure Bitcoin Core is running or set BTC_NODE=mempool in .env");
                }
                else {
                    console_1.logger.warn("BTC_SCAN", "Tip: Check your internet connection or try a different BTC_NODE provider");
                }
            }
        }
        finally {
            console_1.logger.unregisterGroupAlias("BTC_NODE");
            console_1.logger.unregisterGroupAlias("BTC_NODE_PROVIDER");
        }
    }
    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        if (this.isInitialized) {
            console_1.logger.info("BTC_SCAN", "Bitcoin deposit scanner stopped");
        }
        this.isInitialized = false;
    }
    async importAllAddresses() {
        var _a, _b;
        if (this.providerType !== "node" || !((_a = this.provider) === null || _a === void 0 ? void 0 : _a.importAddress)) {
            return;
        }
        try {
            console_1.logger.groupItem("BTC_SCAN", "Importing wallet addresses to node...");
            const wallets = await db_1.models.wallet.findAll({
                where: {
                    type: "ECO",
                    currency: "BTC",
                },
            });
            console_1.logger.groupItem("BTC_SCAN", `Found ${wallets.length} BTC wallets`);
            let imported = 0;
            for (const wallet of wallets) {
                try {
                    if (!wallet.address)
                        continue;
                    const addresses = typeof wallet.address === "string"
                        ? JSON.parse(wallet.address)
                        : wallet.address;
                    const btcAddress = (_b = addresses === null || addresses === void 0 ? void 0 : addresses.BTC) === null || _b === void 0 ? void 0 : _b.address;
                    if (!btcAddress)
                        continue;
                    if (!(0, utxo_network_1.isUtxoAddressOnConfiguredNetwork)("BTC", btcAddress, `address import (wallet ${wallet.id})`)) {
                        continue;
                    }
                    await this.provider.importAddress(btcAddress, `wallet_${wallet.id}_user_${wallet.userId}`);
                    imported++;
                    await this.delay(100);
                }
                catch (error) {
                }
            }
            if (imported > 0) {
                console_1.logger.groupItem("BTC_SCAN", `Imported ${imported} addresses`, "success");
            }
        }
        catch (error) {
            console_1.logger.groupItem("BTC_SCAN", `Address import failed: ${error instanceof Error ? error.message : error}`, "warn");
        }
    }
    startPeriodicScan() {
        this.scanInterval = setInterval(async () => {
            await this.scanAllWallets();
        }, SCAN_INTERVAL);
        setImmediate(() => this.scanAllWallets());
    }
    async scanAllWallets() {
        if (this.isScanning || !this.provider) {
            return;
        }
        this.isScanning = true;
        try {
            if (this.providerType === "node" && this.provider.isSynced) {
                const isSynced = await this.provider.isSynced();
                if (!isSynced) {
                    return;
                }
            }
            const now = Date.now();
            for (const [key, entry] of this.processedTransactions) {
                if (now - entry.lastChecked >= PROCESSED_TX_TTL) {
                    this.processedTransactions.delete(key);
                }
            }
            const walletQuery = {
                where: {
                    type: "ECO",
                    currency: "BTC",
                },
                attributes: ["id", "userId", "address", "balance"],
            };
            let batch;
            if (this.providerType !== "node") {
                const total = await db_1.models.wallet.count({ where: walletQuery.where });
                if (total === 0)
                    return;
                const start = this.scanCursor % total;
                batch = await db_1.models.wallet.findAll({
                    ...walletQuery,
                    order: [["id", "ASC"]],
                    limit: MAX_WALLETS_PER_CYCLE,
                    offset: start,
                });
                if (batch.length < MAX_WALLETS_PER_CYCLE && total > batch.length) {
                    batch = batch.concat(await db_1.models.wallet.findAll({
                        ...walletQuery,
                        order: [["id", "ASC"]],
                        limit: MAX_WALLETS_PER_CYCLE - batch.length,
                        offset: 0,
                    }));
                }
                this.scanCursor = (start + MAX_WALLETS_PER_CYCLE) % total;
            }
            else {
                batch = await db_1.models.wallet.findAll(walletQuery);
            }
            let newDepositsFound = 0;
            let pendingDeposits = 0;
            let failedWallets = 0;
            let detailFetchFailures = 0;
            for (const wallet of batch) {
                try {
                    const result = await this.scanWalletForDeposits(wallet);
                    newDepositsFound += result.newDeposits;
                    pendingDeposits += result.pendingDeposits;
                    detailFetchFailures += result.fetchFailures;
                    if (result.failed) {
                        failedWallets++;
                    }
                }
                catch (error) {
                    failedWallets++;
                    console_1.logger.error("BTC_SCAN", `Error scanning wallet ${wallet.id}`, error);
                }
                if (this.providerType !== "node") {
                    await this.delay(WALLET_SCAN_SPACING_MS);
                }
            }
            if (newDepositsFound > 0 || pendingDeposits > 0) {
                console_1.logger.info("BTC_SCAN", `Scan completed: ${newDepositsFound} new, ${pendingDeposits} pending`);
            }
            if (failedWallets > 0 || detailFetchFailures > 0) {
                console_1.logger.warn("BTC_SCAN", `Scan cycle: ${failedWallets}/${batch.length} wallet scans failed, ${detailFetchFailures} tx detail fetches failed (will retry next cycle)`);
            }
        }
        catch (error) {
            console_1.logger.error("BTC_SCAN", "Error in scan cycle", error);
        }
        finally {
            this.isScanning = false;
        }
    }
    async scanWalletForDeposits(wallet) {
        var _a;
        try {
            if (!wallet.address) {
                return { newDeposits: 0, pendingDeposits: 0, fetchFailures: 0 };
            }
            const addresses = typeof wallet.address === "string"
                ? JSON.parse(wallet.address)
                : wallet.address;
            const btcAddress = (_a = addresses === null || addresses === void 0 ? void 0 : addresses.BTC) === null || _a === void 0 ? void 0 : _a.address;
            if (!btcAddress) {
                return { newDeposits: 0, pendingDeposits: 0, fetchFailures: 0 };
            }
            if (!(0, utxo_network_1.isUtxoAddressOnConfiguredNetwork)("BTC", btcAddress, `deposit scan (wallet ${wallet.id})`)) {
                return { newDeposits: 0, pendingDeposits: 0, fetchFailures: 0 };
            }
            let transactions = [];
            if (this.providerType === "node") {
                const { aggregateNodeListEntries } = await loadDepositDetails();
                const entries = await this.provider.getAddressTransactions(btcAddress);
                transactions = aggregateNodeListEntries(entries).map((entry) => ({
                    txid: entry.txid,
                    confirmations: entry.confirmations,
                    time: entry.time,
                    category: entry.receiveEntries > 0 ? "receive" : "send",
                    value: Math.round(entry.receivedFromList * 100000000),
                    spendsFromWallet: entry.spendsFromWallet,
                }));
            }
            else {
                transactions = await this.provider.fetchTransactions(btcAddress);
            }
            let newDeposits = 0;
            let pendingDeposits = 0;
            let fetchFailures = 0;
            for (const tx of transactions) {
                const txid = tx.txid || tx.hash;
                const confirmations = tx.confirmations || 0;
                const category = tx.category || (tx.value > 0 ? "receive" : "send");
                if (category !== "receive" && tx.value <= 0)
                    continue;
                const txKey = `${txid}-${wallet.id}`;
                const memo = this.processedTransactions.get(txKey);
                if (memo && Date.now() - memo.lastChecked < PROCESSED_TX_TTL)
                    continue;
                const existingTx = await db_1.models.transaction.findOne({
                    where: {
                        trxId: txid,
                        walletId: wallet.id,
                    },
                });
                if (existingTx) {
                    this.processedTransactions.set(txKey, {
                        txid,
                        walletId: wallet.id,
                        lastChecked: Date.now(),
                    });
                    continue;
                }
                const platformUtxo = await db_1.models.ecosystemUtxo.findOne({
                    where: {
                        transactionId: txid,
                        walletId: wallet.id,
                        origin: ["CHANGE", "CONSOLIDATION"],
                    },
                    paranoid: false,
                });
                if (platformUtxo) {
                    this.processedTransactions.set(txKey, {
                        txid,
                        walletId: wallet.id,
                        lastChecked: Date.now(),
                    });
                    continue;
                }
                if (confirmations >= REQUIRED_CONFIRMATIONS) {
                    const details = await this.provider.fetchTransaction(txid);
                    if (!details) {
                        fetchFailures++;
                        continue;
                    }
                    const { summariseDepositForAddress } = await loadDepositDetails();
                    const summary = summariseDepositForAddress(details, btcAddress, {
                        spendsFromWallet: tx.spendsFromWallet === true ||
                            (Array.isArray(details.walletDetails) &&
                                details.walletDetails.some((d) => (d === null || d === void 0 ? void 0 : d.category) === "send" && (!d.address || d.address === btcAddress))),
                    });
                    if (summary.spendsFromWallet || summary.receivedSats <= 0) {
                        this.processedTransactions.set(txKey, {
                            txid,
                            walletId: wallet.id,
                            lastChecked: Date.now(),
                        });
                        continue;
                    }
                    tx.amount = summary.receivedSats / 100000000;
                    tx.vin = summary.vin;
                    tx.vout = summary.vout;
                    console_1.logger.info("BTC_SCAN", `Processing deposit: ${txid} (${confirmations} conf)`);
                    try {
                        await this.processDeposit(wallet, tx, btcAddress);
                        newDeposits++;
                    }
                    catch (error) {
                        if ((error === null || error === void 0 ? void 0 : error.statusCode) === 409) {
                            this.processedTransactions.set(txKey, {
                                txid,
                                walletId: wallet.id,
                                lastChecked: Date.now(),
                            });
                            console_1.logger.info("BTC_SCAN", `Skipping ${txid}: ${error.message}`);
                            continue;
                        }
                        throw error;
                    }
                    this.processedTransactions.set(txKey, {
                        txid,
                        walletId: wallet.id,
                        lastChecked: Date.now(),
                    });
                }
                else if (confirmations >= 0 && !existingTx) {
                    try {
                        const amount = tx.amount || (tx.value / 100000000);
                        const broadcastPayload = {
                            currency: "BTC",
                            chain: "BTC",
                            address: btcAddress.toLowerCase(),
                        };
                        Websocket_1.messageBroker.broadcastToSubscribedClients("/api/ecosystem/deposit", broadcastPayload, {
                            stream: "verification",
                            data: {
                                type: "pending_confirmation",
                                transactionHash: txid,
                                hash: txid,
                                confirmations,
                                requiredConfirmations: REQUIRED_CONFIRMATIONS,
                                amount,
                                fee: 0,
                                status: "PENDING",
                                chain: "BTC",
                                walletId: wallet.id,
                            },
                        });
                    }
                    catch (broadcastError) {
                        console_1.logger.debug("BTC_SCAN", `Failed to broadcast pending tx ${txid}`, broadcastError);
                    }
                    pendingDeposits++;
                }
            }
            return { newDeposits, pendingDeposits, fetchFailures };
        }
        catch (error) {
            console_1.logger.error("BTC_SCAN", `Error scanning wallet ${wallet.id}`, error);
            return { newDeposits: 0, pendingDeposits: 0, fetchFailures: 0, failed: true };
        }
    }
    async processDeposit(wallet, tx, address) {
        var _a;
        var _b;
        try {
            const txid = tx.txid || tx.hash;
            const amount = tx.amount || (tx.value / 100000000);
            const fee = tx.fee || 0;
            const txData = {
                id: wallet.id,
                chain: "BTC",
                hash: txid,
                type: "DEPOSIT",
                from: "N/A",
                to: address,
                amount: amount.toString(),
                fee: fee.toString(),
                status: "CONFIRMED",
                timestamp: tx.time || tx.confirmedTime || Math.floor(Date.now() / 1000),
                inputs: tx.vin || tx.inputs || [],
                outputs: tx.vout || tx.outputs || [],
            };
            console_1.logger.info("BTC_SCAN", `Creating deposit: ${amount} BTC`);
            const result = await this.ecosystemWalletUtils.handleEcosystemDeposit(txData);
            if (result.transactionId) {
                console_1.logger.success("BTC_SCAN", `Deposit processed: ${result.transactionId}`);
                const newBalance = (_b = (_a = result.wallet) === null || _a === void 0 ? void 0 : _a.balance) !== null && _b !== void 0 ? _b : wallet.balance;
                try {
                    const broadcastPayload = {
                        currency: "BTC",
                        chain: "BTC",
                        address: address.toLowerCase(),
                    };
                    Websocket_1.messageBroker.broadcastToSubscribedClients("/api/ecosystem/deposit", broadcastPayload, {
                        stream: "verification",
                        data: {
                            status: 200,
                            message: "Deposit confirmed",
                            transactionId: result.transactionId,
                            wallet: {
                                id: wallet.id,
                                currency: "BTC",
                                balance: newBalance,
                                userId: wallet.userId,
                            },
                            trx: txData,
                            balance: newBalance,
                            currency: "BTC",
                            chain: "BTC",
                            method: "Wallet Deposit",
                        },
                    });
                    console_1.logger.success("BTC_SCAN", `Broadcasted deposit confirmation to WebSocket for ${address}`);
                }
                catch (broadcastError) {
                    console_1.logger.error("BTC_SCAN", `Failed to broadcast deposit to WebSocket`, broadcastError);
                }
                try {
                    await (0, notifications_1.createNotification)({
                        userId: wallet.userId,
                        relatedId: result.transactionId,
                        title: "Deposit Confirmed",
                        message: `Your deposit of ${amount} BTC has been confirmed.`,
                        type: "system",
                        link: `/finance/history`,
                        actions: [
                            {
                                label: "View Deposit",
                                link: `/finance/history`,
                                primary: true,
                            },
                        ],
                    });
                }
                catch (notifError) {
                    console_1.logger.error("BTC_SCAN", "Failed to send notification", notifError);
                }
                try {
                    const { onEcoDeposit } = require("@b/api/(ext)/ecosystem/utils/spot-custody");
                    await onEcoDeposit({
                        walletId: wallet.id,
                        userId: wallet.userId,
                        currency: "BTC",
                        chain: "BTC",
                        amount,
                        hash: txid,
                    });
                }
                catch (custodyError) {
                    console_1.logger.error("BTC_SCAN", `Spot custody hook failed for ${txid} (the deposit itself is credited)`, custodyError);
                }
            }
        }
        catch (error) {
            const txid = tx.txid || tx.hash;
            if ((error === null || error === void 0 ? void 0 : error.statusCode) !== 409) {
                console_1.logger.error("BTC_SCAN", `Failed to process deposit ${txid}`, error);
            }
            throw error;
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.default = BTCDepositScanner;
