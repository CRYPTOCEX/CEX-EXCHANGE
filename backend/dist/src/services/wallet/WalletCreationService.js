"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCreationService = exports.WalletCreationService = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const errors_1 = require("./errors");
const AddressGenerationService_1 = require("./AddressGenerationService");
const WalletDataService_1 = require("./WalletDataService");
const AuditLogger_1 = require("./audit/AuditLogger");
class WalletCreationService {
    constructor() {
        this.addressGenService = AddressGenerationService_1.AddressGenerationService.getInstance();
        this.walletDataService = WalletDataService_1.WalletDataService.getInstance();
    }
    static getInstance() {
        if (!WalletCreationService.instance) {
            WalletCreationService.instance = new WalletCreationService();
        }
        return WalletCreationService.instance;
    }
    async createWallet(request) {
        const { userId, type, currency, generateAddresses = true } = request;
        return await db_1.sequelize.transaction(async (t) => {
            const existing = await db_1.models.wallet.findOne({
                where: { userId, type, currency },
                transaction: t,
            });
            if (existing) {
                if (type === "ECO" && generateAddresses) {
                    return await this.ensureEcoWalletComplete(existing, t);
                }
                return this.buildResult(this.toWalletAttributes(existing));
            }
            switch (type) {
                case "FIAT":
                    return await this.createFiatWallet(userId, currency, t);
                case "SPOT":
                    return await this.createSpotWallet(userId, currency, t);
                case "ECO":
                    return await this.createEcoWallet(userId, currency, generateAddresses, t);
                case "FUTURES":
                    return await this.createFuturesWallet(userId, currency, t);
                case "COPY_TRADING":
                    return await this.createCopyTradingWallet(userId, currency, t);
                default:
                    throw new errors_1.WalletError(`Unknown wallet type: ${type}`, "INVALID_WALLET_TYPE", 400);
            }
        });
    }
    async createFiatWallet(userId, currency, transaction) {
        const wallet = await db_1.models.wallet.create({
            userId,
            type: "FIAT",
            currency: currency.toUpperCase(),
            balance: 0,
            inOrder: 0,
            status: true,
        }, { transaction });
        await AuditLogger_1.auditLogger.logWalletCreated(wallet.id, userId, "FIAT", currency);
        return this.buildResult(this.toWalletAttributes(wallet));
    }
    async createSpotWallet(userId, currency, transaction) {
        const wallet = await db_1.models.wallet.create({
            userId,
            type: "SPOT",
            currency: currency.toUpperCase(),
            balance: 0,
            inOrder: 0,
            status: true,
        }, { transaction });
        await AuditLogger_1.auditLogger.logWalletCreated(wallet.id, userId, "SPOT", currency);
        return this.buildResult(this.toWalletAttributes(wallet));
    }
    async createEcoWallet(userId, currency, generateAddresses, transaction) {
        const wallet = await db_1.models.wallet.create({
            userId,
            type: "ECO",
            currency: currency.toUpperCase(),
            balance: 0,
            inOrder: 0,
            status: true,
            address: {},
        }, { transaction });
        let addresses = {};
        const walletDataRecords = [];
        if (generateAddresses) {
            const tokens = await this.getActiveTokens(currency);
            if (tokens.length === 0) {
                console_1.logger.warn("WALLET_CREATION", `No active tokens found for currency: ${currency}, creating wallet without addresses`);
            }
            for (const token of tokens) {
                try {
                    const generated = await this.addressGenService.generateAddress({
                        walletId: wallet.id,
                        currency,
                        chain: token.chain,
                        contractType: token.contractType,
                        network: token.network,
                        transaction,
                    });
                    addresses[token.chain] = {
                        address: generated.address,
                        network: generated.network,
                        balance: 0,
                    };
                    const walletData = await this.walletDataService.create({
                        walletId: wallet.id,
                        currency,
                        chain: token.chain,
                        address: generated.address,
                        index: generated.index,
                        encryptedData: generated.encryptedData,
                        transaction,
                    });
                    walletDataRecords.push(walletData);
                }
                catch (error) {
                    console_1.logger.error("WALLET_CREATION", `Failed to generate address for ${token.chain}: ${error.message}`);
                }
            }
            if (Object.keys(addresses).length > 0) {
                await db_1.models.wallet.update({ address: addresses }, { where: { id: wallet.id }, transaction });
            }
        }
        await AuditLogger_1.auditLogger.logWalletCreated(wallet.id, userId, "ECO", currency, Object.keys(addresses));
        const updatedWallet = await db_1.models.wallet.findByPk(wallet.id, { transaction });
        return this.buildResult(this.toWalletAttributes(updatedWallet), walletDataRecords, addresses);
    }
    async createFuturesWallet(userId, currency, transaction) {
        const wallet = await db_1.models.wallet.create({
            userId,
            type: "FUTURES",
            currency: currency.toUpperCase(),
            balance: 0,
            inOrder: 0,
            status: true,
        }, { transaction });
        await AuditLogger_1.auditLogger.logWalletCreated(wallet.id, userId, "FUTURES", currency);
        return this.buildResult(this.toWalletAttributes(wallet));
    }
    async createCopyTradingWallet(userId, currency, transaction) {
        const wallet = await db_1.models.wallet.create({
            userId,
            type: "COPY_TRADING",
            currency: currency.toUpperCase(),
            balance: 0,
            inOrder: 0,
            status: true,
        }, { transaction });
        await AuditLogger_1.auditLogger.logWalletCreated(wallet.id, userId, "COPY_TRADING", currency);
        return this.buildResult(this.toWalletAttributes(wallet));
    }
    async ensureEcoWalletComplete(wallet, transaction) {
        const tokens = await this.getActiveTokens(wallet.currency);
        let addresses = this.parseAddresses(wallet.address);
        const walletDataRecords = [];
        let updated = false;
        for (const token of tokens) {
            if (!addresses[token.chain]) {
                try {
                    const generated = await this.addressGenService.generateAddress({
                        walletId: wallet.id,
                        currency: wallet.currency,
                        chain: token.chain,
                        contractType: token.contractType,
                        network: token.network,
                        transaction,
                    });
                    addresses[token.chain] = {
                        address: generated.address,
                        network: generated.network,
                        balance: 0,
                    };
                    const walletData = await this.walletDataService.create({
                        walletId: wallet.id,
                        currency: wallet.currency,
                        chain: token.chain,
                        address: generated.address,
                        index: generated.index,
                        encryptedData: generated.encryptedData,
                        transaction,
                    });
                    walletDataRecords.push(walletData);
                    updated = true;
                    console_1.logger.info("WALLET_CREATION", `Added missing address for ${token.chain} to wallet ${wallet.id}`);
                }
                catch (error) {
                    console_1.logger.error("WALLET_CREATION", `Failed to add missing address for ${token.chain}: ${error.message}`);
                }
            }
        }
        if (updated) {
            await db_1.models.wallet.update({ address: addresses }, { where: { id: wallet.id }, transaction });
        }
        const updatedWallet = await db_1.models.wallet.findByPk(wallet.id, { transaction });
        return this.buildResult(this.toWalletAttributes(updatedWallet), walletDataRecords, addresses);
    }
    async getActiveTokens(currency) {
        if (!db_1.models.ecosystemToken) {
            console_1.logger.warn("WALLET_CREATION", "EcosystemToken model not available");
            return [];
        }
        const tokens = await db_1.models.ecosystemToken.findAll({
            where: { currency, status: true },
        });
        return tokens.filter((token) => {
            const specialChains = ["XMR", "TON", "SOL", "TRON", "BTC", "LTC", "DOGE", "DASH"];
            if (specialChains.includes(token.chain))
                return true;
            const chainEnvVar = `${token.chain.toUpperCase()}_NETWORK`;
            const expectedNetwork = process.env[chainEnvVar];
            if (!expectedNetwork)
                return false;
            return (token.network === expectedNetwork ||
                (token.network === token.chain && expectedNetwork === "mainnet"));
        });
    }
    parseAddresses(address) {
        if (!address)
            return {};
        if (typeof address === "string") {
            try {
                return JSON.parse(address);
            }
            catch (_a) {
                return {};
            }
        }
        return address;
    }
    async getOrCreateWallet(userId, type, currency, transaction) {
        const existing = await db_1.models.wallet.findOne({
            where: { userId, type, currency },
            ...(transaction && { transaction }),
        });
        if (existing) {
            if (type === "ECO") {
                if (transaction) {
                    return await this.ensureEcoWalletComplete(existing, transaction);
                }
                return await db_1.sequelize.transaction(async (t) => {
                    return await this.ensureEcoWalletComplete(existing, t);
                });
            }
            return this.buildResult(this.toWalletAttributes(existing));
        }
        if (transaction) {
            return await this.createWalletWithTransaction({ userId, type, currency }, transaction);
        }
        return await this.createWallet({ userId, type, currency });
    }
    async createWalletWithTransaction(request, transaction) {
        const { userId, type, currency, generateAddresses = true } = request;
        const existing = await db_1.models.wallet.findOne({
            where: { userId, type, currency },
            transaction,
        });
        if (existing) {
            if (type === "ECO" && generateAddresses) {
                return await this.ensureEcoWalletComplete(existing, transaction);
            }
            return this.buildResult(this.toWalletAttributes(existing));
        }
        switch (type) {
            case "FIAT":
                return await this.createFiatWallet(userId, currency, transaction);
            case "SPOT":
                return await this.createSpotWallet(userId, currency, transaction);
            case "ECO":
                return await this.createEcoWallet(userId, currency, generateAddresses, transaction);
            case "FUTURES":
                return await this.createFuturesWallet(userId, currency, transaction);
            case "COPY_TRADING":
                return await this.createCopyTradingWallet(userId, currency, transaction);
            default:
                throw new errors_1.WalletError(`Unknown wallet type: ${type}`, "INVALID_WALLET_TYPE", 400);
        }
    }
    async getWalletById(walletId) {
        const wallet = await db_1.models.wallet.findByPk(walletId);
        return wallet ? this.toWalletAttributes(wallet) : null;
    }
    async getWallet(userId, type, currency) {
        const wallet = await db_1.models.wallet.findOne({
            where: { userId, type, currency },
        });
        return wallet ? this.toWalletAttributes(wallet) : null;
    }
    async getUserWallets(userId, type) {
        const where = { userId };
        if (type) {
            where.type = type;
        }
        const wallets = await db_1.models.wallet.findAll({ where });
        return wallets.map((w) => this.toWalletAttributes(w));
    }
    toWalletAttributes(wallet) {
        var _a, _b;
        const plain = wallet.get ? wallet.get({ plain: true }) : wallet;
        return {
            ...plain,
            balance: parseFloat(((_a = plain.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
            inOrder: parseFloat(((_b = plain.inOrder) === null || _b === void 0 ? void 0 : _b.toString()) || "0"),
        };
    }
    buildResult(wallet, walletData, addresses) {
        return {
            wallet,
            walletData,
            addresses,
            id: wallet.id,
            balance: wallet.balance,
        };
    }
}
exports.WalletCreationService = WalletCreationService;
exports.walletCreationService = WalletCreationService.getInstance();
