"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = exports.LedgerService = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const precision_1 = require("./utils/precision");
const constants_1 = require("./constants");
class LedgerService {
    constructor() { }
    static getInstance() {
        if (!LedgerService.instance) {
            LedgerService.instance = new LedgerService();
        }
        return LedgerService.instance;
    }
    async updateLedger(request) {
        var _a, _b, _c;
        const { walletId, index, currency, chain, amount, transaction } = request;
        const network = this.getNetworkForChain(chain);
        const uniqueIdentifier = {
            walletId,
            index,
            currency,
            chain,
            network,
        };
        const queryOptions = transaction ? { transaction } : {};
        const existingLedger = await ((_a = db_1.models.ecosystemPrivateLedger) === null || _a === void 0 ? void 0 : _a.findOne({
            where: uniqueIdentifier,
            ...queryOptions,
        }));
        if (existingLedger) {
            const currentDifference = parseFloat(((_b = existingLedger.offchainDifference) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
            const newDifference = (0, precision_1.safeAdd)(currentDifference, amount, currency);
            await db_1.models.ecosystemPrivateLedger.update({ offchainDifference: newDifference }, { where: uniqueIdentifier, ...queryOptions });
            console_1.logger.debug("LEDGER", `Updated ledger for ${walletId}/${chain}: ${currentDifference} -> ${newDifference}`);
            return {
                ...this.toAttributes(existingLedger),
                offchainDifference: newDifference,
            };
        }
        else {
            const newEntry = await ((_c = db_1.models.ecosystemPrivateLedger) === null || _c === void 0 ? void 0 : _c.create({
                ...uniqueIdentifier,
                offchainDifference: amount,
            }, transaction ? { transaction } : undefined));
            console_1.logger.debug("LEDGER", `Created ledger entry for ${walletId}/${chain}: ${amount}`);
            return this.toAttributes(newEntry);
        }
    }
    async credit(walletId, index, currency, chain, amount, transaction) {
        return this.updateLedger({
            walletId,
            index,
            currency,
            chain,
            amount: Math.abs(amount),
            transaction,
        });
    }
    async debit(walletId, index, currency, chain, amount, transaction) {
        return this.updateLedger({
            walletId,
            index,
            currency,
            chain,
            amount: -Math.abs(amount),
            transaction,
        });
    }
    async getLedgerEntry(walletId, index, currency, chain) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return null;
        }
        const network = this.getNetworkForChain(chain);
        const entry = await db_1.models.ecosystemPrivateLedger.findOne({
            where: { walletId, index, currency, chain, network },
        });
        return entry ? this.toAttributes(entry) : null;
    }
    async getOffchainDifference(walletId, index, currency, chain) {
        const entry = await this.getLedgerEntry(walletId, index, currency, chain);
        return (entry === null || entry === void 0 ? void 0 : entry.offchainDifference) || 0;
    }
    async getTotalAvailable(walletId, index, currency, chain, onChainBalance) {
        const offchainDiff = await this.getOffchainDifference(walletId, index, currency, chain);
        return (0, precision_1.safeAdd)(onChainBalance, offchainDiff, currency);
    }
    async getWalletLedgerEntries(walletId) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return [];
        }
        const entries = await db_1.models.ecosystemPrivateLedger.findAll({
            where: { walletId },
        });
        return entries.map((e) => this.toAttributes(e));
    }
    async getChainLedgerEntries(chain) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return [];
        }
        const network = this.getNetworkForChain(chain);
        const entries = await db_1.models.ecosystemPrivateLedger.findAll({
            where: { chain, network },
        });
        return entries.map((e) => this.toAttributes(e));
    }
    async reconcileLedger(walletId, chain, actualOnChainBalance, expectedBalance) {
        const discrepancy = actualOnChainBalance - expectedBalance;
        if (Math.abs(discrepancy) < 0.00000001) {
            return { discrepancy: 0, adjusted: false };
        }
        console_1.logger.warn("LEDGER", `Discrepancy detected for ${walletId}/${chain}: ${discrepancy}`);
        return { discrepancy, adjusted: false };
    }
    async resetLedger(walletId, index, currency, chain, transaction) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return;
        }
        const network = this.getNetworkForChain(chain);
        await db_1.models.ecosystemPrivateLedger.update({ offchainDifference: 0 }, {
            where: { walletId, index, currency, chain, network },
            ...(transaction && { transaction }),
        });
        console_1.logger.info("LEDGER", `Reset ledger for ${walletId}/${chain}`);
    }
    getNetworkForChain(chain) {
        if ((0, constants_1.isSpecialChain)(chain)) {
            const envVar = `${chain.toUpperCase()}_NETWORK`;
            return process.env[envVar] || "mainnet";
        }
        const envVar = `${chain.toUpperCase()}_NETWORK`;
        const network = process.env[envVar];
        if (!network) {
            return "mainnet";
        }
        return network;
    }
    async exists(walletId, index, currency, chain) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return false;
        }
        const network = this.getNetworkForChain(chain);
        const count = await db_1.models.ecosystemPrivateLedger.count({
            where: { walletId, index, currency, chain, network },
        });
        return count > 0;
    }
    async delete(walletId, index, currency, chain, transaction) {
        if (!db_1.models.ecosystemPrivateLedger) {
            return;
        }
        const network = this.getNetworkForChain(chain);
        await db_1.models.ecosystemPrivateLedger.destroy({
            where: { walletId, index, currency, chain, network },
            ...(transaction && { transaction }),
        });
    }
    toAttributes(entry) {
        var _a;
        const plain = (entry === null || entry === void 0 ? void 0 : entry.get) ? entry.get({ plain: true }) : entry;
        return {
            ...plain,
            offchainDifference: parseFloat(((_a = plain === null || plain === void 0 ? void 0 : plain.offchainDifference) === null || _a === void 0 ? void 0 : _a.toString()) || "0"),
        };
    }
}
exports.LedgerService = LedgerService;
exports.ledgerService = LedgerService.getInstance();
