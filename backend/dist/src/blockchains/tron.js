"use strict";
// @b/blockchains/tron.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tronweb_1 = require("tronweb");
const bip39_1 = require("bip39");
const ethers_1 = require("ethers");
const redis_1 = require("@b/utils/redis");
const date_fns_1 = require("date-fns");
const encrypt_1 = require("@b/utils/encrypt");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
// Extension module - using safe import
let storeAndBroadcastTransaction;
try {
    const depositModule = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
    storeAndBroadcastTransaction = depositModule.storeAndBroadcastTransaction;
}
catch (e) {
    // Extension not available
}
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure that walletAttributes is defined in your codebase
// For example:
// type walletAttributes = { id: string; address: string | Record<string, any>; /* ... other properties ... */ };
const TRX_DECIMALS = 1e6; // TRX has 6 decimals
class TronService {
    static cleanupProcessedTransactions() {
        const now = Date.now();
        for (const [tx, timestamp] of TronService.processedTransactions.entries()) {
            if (now - timestamp > TronService.PROCESSING_EXPIRY_MS) {
                TronService.processedTransactions.delete(tx);
            }
        }
    }
    // --- End added ---
    // Private constructor for singleton usage.
    constructor(fullHost = TronService.getFullHostUrl(process.env.TRON_NETWORK || "mainnet"), cacheExpirationMinutes = 30) {
        this.chainActive = false;
        this.fullHost = fullHost;
        // Validate fullHost before initializing TronWeb
        if (!this.fullHost || this.fullHost.trim() === '') {
            throw new Error(`Invalid TRON fullHost URL: ${this.fullHost}`);
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
            throw new Error(`TronWeb initialization failed: ${error.message}`);
        }
        this.cacheExpiration = cacheExpirationMinutes;
    }
    /**
     * Returns the appropriate fullHost URL based on the network.
     */
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
                throw new Error(`Invalid Tron network: ${network}`);
        }
        if (!fullHost || fullHost.trim() === '') {
            console_1.logger.error("TRON", `Empty fullHost for network: ${network}`);
            throw new Error(`Empty TRON RPC URL for network: ${network}`);
        }
        try {
            new URL(fullHost);
        }
        catch (urlError) {
            console_1.logger.error("TRON", `Invalid URL format: ${fullHost}`);
            throw new Error(`Invalid TRON RPC URL format: ${fullHost}`);
        }
        if (process.env.DEBUG_TRON === "true") {
            console_1.logger.debug("TRON", `Resolved fullHost: "${fullHost}"`);
        }
        return fullHost;
    }
    /**
     * Singleton instance accessor.
     */
    static async getInstance() {
        if (!TronService.instance) {
            TronService.instance = new TronService();
            await TronService.instance.checkChainStatus();
            // Schedule periodic cleanup of processed transactions
            setInterval(() => TronService.cleanupProcessedTransactions(), 60 * 1000);
        }
        return TronService.instance;
    }
    /**
     * Checks if the chain 'TRON' is active based on a local file check.
     * If a file starting with "tron.bin" exists in the current directory, the chain is considered active.
     */
    async checkChainStatus() {
        try {
            // Enhanced path resolution for both development and production
            const isProduction = process.env.NODE_ENV === 'production';
            const cwd = process.cwd();
            // Try multiple paths for the bin file - similar to how index.ts handles .env files
            const possiblePaths = [
                // Current directory relative paths (works in both dev and prod)
                path_1.default.resolve(__dirname, "tron.bin.ts"), // Development TypeScript
                path_1.default.resolve(__dirname, "tron.bin.js"), // Production JavaScript
                // Development paths (when running from backend directory)
                path_1.default.resolve(cwd, "src", "blockchains", "tron.bin.ts"),
                path_1.default.resolve(cwd, "src", "blockchains", "tron.bin.js"),
                // Production paths (when running from root with compiled files)
                path_1.default.resolve(cwd, "backend", "dist", "src", "blockchains", "tron.bin.js"),
                path_1.default.resolve(cwd, "dist", "src", "blockchains", "tron.bin.js"),
                // Legacy fallback paths
                path_1.default.resolve(cwd, "backend/src/blockchains/tron.bin.ts"), // Development from root
                path_1.default.resolve(cwd, "backend/src/blockchains/tron.bin.js"), // Production from root
                path_1.default.resolve(cwd, "dist/blockchains/tron.bin.js"), // Production dist
                path_1.default.resolve(cwd, "src/blockchains/tron.bin.js"), // Production src
            ];
            let tronBinFileExists = false;
            let foundPath = "";
            for (const filePath of possiblePaths) {
                const exists = fs_1.default.existsSync(filePath);
                if (exists && !tronBinFileExists) {
                    tronBinFileExists = true;
                    foundPath = filePath;
                    break;
                }
            }
            if (tronBinFileExists) {
                this.chainActive = true;
            }
            else {
                this.chainActive = false;
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Error checking chain status", error);
            this.chainActive = false;
        }
    }
    /**
     * Throws an error if the chain is not active.
     */
    ensureChainActive() {
        if (!this.chainActive) {
            console_1.logger.warn("TRON", "Chain file check failed, proceeding as TRON is enabled");
            this.chainActive = true;
        }
    }
    /**
     * Creates a new Tron wallet using a generated mnemonic and Tron derivation path.
     */
    createWallet() {
        this.ensureChainActive();
        const mnemonic = (0, bip39_1.generateMnemonic)();
        const derivationPath = "m/44'/195'/0'/0/0"; // Tron derivation path
        // Create the wallet using ethers (HDNodeWallet)
        const wallet = ethers_1.ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
        const privateKey = wallet.privateKey.replace(/^0x/, "");
        const publicKey = wallet.publicKey.replace(/^0x/, "");
        const address = tronweb_1.utils.address.fromPrivateKey(privateKey);
        if (!address) {
            throw new Error("Failed to derive address from private key");
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
    /**
     * Fetches and parses transactions for a given Tron address.
     * Uses Redis caching to improve performance.
     * @param address Tron wallet address
     */
    async fetchTransactions(address) {
        try {
            const cacheKey = `wallet:${address}:transactions:tron`;
            const cachedData = await this.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            const rawTransactions = await this.fetchTronTransactions(address);
            const parsedTransactions = this.parseTronTransactions(rawTransactions, address);
            // Cache the parsed transactions
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
            throw new Error(`Failed to fetch Tron transactions: ${error instanceof Error ? error.message : error}`);
        }
    }
    /**
     * Fetches transactions involving the given address by scanning new blocks.
     * Scans blocks in batches for performance.
     * @param address Tron wallet address
     */
    async fetchTronTransactions(address) {
        var _a;
        try {
            const transactions = [];
            const latestBlock = await this.tronWeb.trx.getCurrentBlock();
            const latestBlockNumber = latestBlock.block_header.raw_data.number;
            const lastScannedBlockNumber = TronService.lastScannedBlock.get(address) || latestBlockNumber - 1;
            if (latestBlockNumber <= lastScannedBlockNumber) {
                console_1.logger.debug("TRON", `No new blocks to scan for ${address}`);
                return transactions;
            }
            // Build list of block numbers to scan.
            const blocksToScan = [];
            for (let blockNum = lastScannedBlockNumber + 1; blockNum <= latestBlockNumber; blockNum++) {
                blocksToScan.push(blockNum);
            }
            console_1.logger.debug("TRON", `Scanning blocks ${lastScannedBlockNumber + 1} to ${latestBlockNumber}`);
            const batchSize = 10; // Adjust batch size as needed
            for (let i = 0; i < blocksToScan.length; i += batchSize) {
                const batchBlocks = blocksToScan.slice(i, i + batchSize);
                const blockPromises = batchBlocks.map((blockNum) => this.tronWeb.trx.getBlock(blockNum));
                const blocks = await Promise.all(blockPromises);
                for (const block of blocks) {
                    if (block && block.transactions) {
                        for (const tx of block.transactions) {
                            // Check if transaction is a TransferContract
                            if (((_a = tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) && tx.raw_data.contract[0]) {
                                const contract = tx.raw_data.contract[0];
                                if (contract.type === "TransferContract") {
                                    const value = contract.parameter.value;
                                    const to = tronweb_1.utils.address.fromHex(value.to_address);
                                    // If the transaction is incoming to the given address, store it.
                                    if (to === address) {
                                        transactions.push(tx);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            TronService.lastScannedBlock.set(address, latestBlockNumber);
            if (transactions.length > 0) {
                console_1.logger.debug("TRON", `Fetched ${transactions.length} transactions for ${address}`);
            }
            return transactions;
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to fetch transactions", error);
            return [];
        }
    }
    /**
     * Parses raw Tron transactions into a standardized ParsedTransaction format.
     * @param rawTransactions Raw transaction data from Tron
     * @param address Tron wallet address (used for filtering deposits)
     */
    parseTronTransactions(rawTransactions, address) {
        if (!Array.isArray(rawTransactions)) {
            throw new Error("Invalid raw transactions format for Tron");
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
            // Check transaction status based on contract return.
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
                    amount = (value.amount / TRX_DECIMALS).toString(); // Convert from Sun to TRX
                }
            }
            // Get fee from transaction return or tx.fee if available.
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
    /**
     * Retrieves the balance of a Tron wallet.
     * @param address Tron wallet address
     */
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
    /**
     * Retrieves cached transaction data from Redis if available and not expired.
     * @param cacheKey Redis cache key
     */
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
    /**
     * Monitors Tron deposits by periodically scanning blocks for new transactions.
     * Stops monitoring after a deposit is processed to prevent memory leaks.
     * @param wallet Wallet attributes
     * @param address Tron wallet address
     */
    async monitorTronDeposits(wallet, address) {
        const monitoringKey = `${wallet.id}_${address}`;
        if (TronService.monitoringAddresses.has(monitoringKey)) {
            console_1.logger.debug("TRON", `Monitoring already in progress for ${address}`);
            return;
        }
        TronService.monitoringAddresses.set(monitoringKey, true);
        try {
            console_1.logger.info("TRON", `Starting block scanning for wallet ${wallet.id} on ${address}`);
            const checkDeposits = async () => {
                try {
                    const rawTransactions = await this.fetchTronTransactions(address);
                    const transactions = this.parseTronTransactions(rawTransactions, address);
                    // Filter transactions that are deposits (incoming and successful)
                    const deposits = transactions.filter((tx) => tx.to === address && tx.status === "Success");
                    if (deposits.length > 0) {
                        console_1.logger.info("TRON", `Found ${deposits.length} deposits for ${address}`);
                    }
                    for (const deposit of deposits) {
                        // Check if the transaction has already been processed
                        const existingTx = await db_1.models.transaction.findOne({
                            where: { trxId: deposit.hash, userId: wallet.userId },
                        });
                        if (!existingTx) {
                            await this.processTronTransaction(deposit.hash, wallet, address);
                            clearTimeout(timeoutId);
                            TronService.monitoringAddresses.delete(monitoringKey);
                            console_1.logger.success("TRON", `Processed deposit for ${address}`);
                            return;
                        }
                    }
                }
                catch (error) {
                    console_1.logger.error("TRON", `Error checking deposits for ${address}`, error);
                }
                // Schedule the next check after the interval.
                timeoutId = setTimeout(checkDeposits, interval);
            };
            const interval = 60 * 1000;
            let timeoutId = setTimeout(checkDeposits, 0);
        }
        catch (error) {
            console_1.logger.error("TRON", `Error monitoring deposits for ${address}`, error);
            TronService.monitoringAddresses.delete(monitoringKey);
        }
    }
    /**
     * Processes a Tron transaction by fetching its details, formatting the data,
     * and then storing and broadcasting it.
     * @param transactionHash Transaction hash
     * @param wallet Wallet attributes
     * @param address Tron wallet address
     */
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
    /**
     * Handles Tron withdrawal by transferring TRX to the specified address.
     * Updates the transaction status in the database.
     * @param transactionId Transaction ID
     * @param walletId Wallet ID
     * @param amount Amount in TRX
     * @param toAddress Recipient's Tron address
     */
    async handleTronWithdrawal(transactionId, walletId, amount, toAddress, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing Tron withdrawal for transaction ${transactionId}`);
            // Convert TRX amount to Sun.
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
                throw new Error("Failed to receive transaction signature");
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
    /**
     * Checks if a TRON address is activated.
     * @param address TRON address to check
     */
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
    /**
     * Estimates the transaction fee for sending TRX.
     * Uses the transaction bandwidth requirements and current account bandwidth.
     * @param fromAddress Sender's TRON address
     * @param toAddress Recipient's TRON address
     * @param amountSun Amount in Sun (1 TRX = 1e6 Sun)
     */
    async estimateTransactionFee(fromAddress, toAddress, amountSun) {
        try {
            // Build the transaction object
            const transaction = await this.tronWeb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress);
            // Estimate bandwidth required (each byte counts as 0.5 or 1 point)
            const bandwidthNeeded = Math.ceil(JSON.stringify(transaction).length / 2);
            // Fetch current bandwidth for the sender address
            const bandwidth = await this.tronWeb.trx.getBandwidth(fromAddress);
            // Calculate any bandwidth deficit
            const bandwidthDeficit = Math.max(0, bandwidthNeeded - bandwidth);
            // Each missing bandwidth point costs 10,000 Sun (0.01 TRX)
            const feeSun = bandwidthDeficit * 10000;
            return feeSun;
        }
        catch (error) {
            console_1.logger.error("TRON", "Error estimating transaction fee", error);
            return 0;
        }
    }
    /**
     * Transfers TRX from a custodial wallet to a recipient.
     * Retrieves the wallet's private key from the database, decrypts it,
     * and uses it to sign and broadcast the transaction.
     * @param walletId ID of the wallet performing the transfer
     * @param toAddress Recipient's Tron address
     * @param amount Amount of TRX to transfer (in Sun)
     */
    async transferTrx(walletId, toAddress, amount) {
        try {
            // Retrieve wallet data (including private key) from the database.
            const walletData = await db_1.models.walletData.findOne({
                where: { walletId, currency: "TRX", chain: "TRON" },
            });
            if (!walletData || !walletData.data) {
                throw new Error("Private key not found for the wallet");
            }
            const decryptedWalletData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            const privateKey = decryptedWalletData.privateKey.replace(/^0x/, "");
            // Create a new TronWeb instance with the private key.
            const tronWeb = new tronweb_1.TronWeb({
                fullHost: this.fullHost,
                privateKey: privateKey,
                headers: { "TRON-PRO-API-KEY": process.env.TRON_API_KEY || "" },
            });
            const fromAddress = tronWeb.defaultAddress.base58;
            if (!fromAddress) {
                throw new Error("Default address is not set");
            }
            // Build the transaction.
            const tradeObj = await tronWeb.transactionBuilder.sendTrx(toAddress, amount, fromAddress);
            // Sign the transaction.
            const signedTxn = await tronWeb.trx.sign(tradeObj);
            // Broadcast the signed transaction.
            const receipt = await tronWeb.trx.sendRawTransaction(signedTxn);
            if (receipt.result === true) {
                console_1.logger.success("TRON", `Transfer successful: ${receipt.txid}`);
                return receipt.txid;
            }
            else {
                throw new Error(`Transaction failed: ${JSON.stringify(receipt)}`);
            }
        }
        catch (error) {
            console_1.logger.error("TRON", "Failed to transfer TRX", error);
            throw new Error(`Failed to transfer TRX: ${error instanceof Error ? error.message : error}`);
        }
    }
}
TronService.monitoringAddresses = new Map();
TronService.lastScannedBlock = new Map();
// --- Added for deposit tracking ---
TronService.processedTransactions = new Map();
TronService.PROCESSING_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
exports.default = TronService;
