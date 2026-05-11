"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolManager = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const BalanceTracker_1 = require("./BalanceTracker");
const PnLCalculator_1 = require("./PnLCalculator");
class PoolManager {
    constructor() {
        this.balanceTrackers = new Map();
        this.pnlCalculator = new PnLCalculator_1.PnLCalculator();
    }
    getBalanceTracker(marketMakerId) {
        let tracker = this.balanceTrackers.get(marketMakerId);
        if (!tracker) {
            tracker = new BalanceTracker_1.BalanceTracker(marketMakerId);
            this.balanceTrackers.set(marketMakerId, tracker);
        }
        return tracker;
    }
    async getBalance(marketMakerId) {
        const tracker = this.getBalanceTracker(marketMakerId);
        return tracker.getBalance();
    }
    async deposit(marketMakerId, currency, amount) {
        try {
            const tracker = this.getBalanceTracker(marketMakerId);
            await tracker.deposit(currency, amount);
            await this.updatePoolInDatabase(marketMakerId);
            await this.logPoolAction(marketMakerId, "DEPOSIT", {
                currency,
                amount,
            });
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM_POOL", "Failed to deposit to pool", error);
            return false;
        }
    }
    async withdraw(marketMakerId, currency, amount) {
        try {
            const tracker = this.getBalanceTracker(marketMakerId);
            if (!await tracker.canWithdraw(currency, amount)) {
                console_1.logger.warn("AI_MM", "Insufficient balance for withdrawal");
                return false;
            }
            await tracker.withdraw(currency, amount);
            await this.updatePoolInDatabase(marketMakerId);
            await this.logPoolAction(marketMakerId, "WITHDRAW", {
                currency,
                amount,
            });
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM_POOL", "Failed to withdraw from pool", error);
            return false;
        }
    }
    async canWithdraw(marketMakerId, currency, amount) {
        const tracker = this.getBalanceTracker(marketMakerId);
        const maker = await db_1.models.aiMarketMaker.findByPk(marketMakerId);
        if (maker && maker.status === "ACTIVE") {
            return {
                allowed: false,
                reason: "Cannot withdraw while market maker is active. Please pause first.",
            };
        }
        if (!await tracker.canWithdraw(currency, amount)) {
            return {
                allowed: false,
                reason: "Insufficient available balance",
            };
        }
        return { allowed: true };
    }
    async rebalance(marketMakerId, targetRatio) {
        try {
            const tracker = this.getBalanceTracker(marketMakerId);
            await tracker.rebalance(targetRatio);
            await this.updatePoolInDatabase(marketMakerId);
            await this.logPoolAction(marketMakerId, "REBALANCE", {
                targetRatio,
            });
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM_POOL", "Failed to rebalance pool", error);
            return false;
        }
    }
    async updateAllBalances() {
        for (const [marketMakerId, tracker] of this.balanceTrackers) {
            try {
                await tracker.syncFromDatabase();
                await this.pnlCalculator.calculatePnL(marketMakerId, tracker);
            }
            catch (error) {
            }
        }
    }
    async getPnL(marketMakerId) {
        return this.pnlCalculator.getPnL(marketMakerId);
    }
    async recordTradePnL(marketMakerId, pnl, isRealized) {
        this.pnlCalculator.recordPnL(marketMakerId, pnl, isRealized);
    }
    async getAllPoolStats() {
        const stats = new Map();
        for (const [marketMakerId, tracker] of this.balanceTrackers) {
            stats.set(marketMakerId, {
                balance: await tracker.getBalance(),
                pnl: await this.getPnL(marketMakerId),
            });
        }
        return stats;
    }
    async updatePoolInDatabase(marketMakerId) {
        try {
            const tracker = this.getBalanceTracker(marketMakerId);
            const balance = await tracker.getBalance();
            await db_1.models.aiMarketMakerPool.update({
                baseCurrencyBalance: balance.baseCurrency,
                quoteCurrencyBalance: balance.quoteCurrency,
                totalValueLocked: balance.totalValueLocked,
            }, { where: { marketMakerId } });
        }
        catch (error) {
            console_1.logger.error("AI_MM_POOL", "Failed to update pool in database", error);
        }
    }
    async logPoolAction(marketMakerId, action, details) {
        try {
            const tracker = this.getBalanceTracker(marketMakerId);
            const balance = await tracker.getBalance();
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId,
                action,
                details,
                priceAtAction: 0,
                poolValueAtAction: balance.totalValueLocked,
            });
        }
        catch (error) {
        }
    }
}
exports.PoolManager = PoolManager;
exports.default = PoolManager;
