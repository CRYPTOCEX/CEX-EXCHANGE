"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LossProtection = void 0;
const db_1 = require("@b/db");
class LossProtection {
    constructor() {
        this.marketDailyLoss = new Map();
        this.consecutiveLosses = new Map();
        this.globalDailyLoss = 0;
        this.globalDailyProfit = 0;
        this.lastResetDate = new Date();
    }
    async checkGlobalLoss(maxDailyLossPercent) {
        this.checkDayReset();
        const totalCapital = await this.getTotalCapital();
        if (totalCapital <= 0) {
            return { canTrade: true };
        }
        const lossPercent = (this.globalDailyLoss / totalCapital) * 100;
        if (lossPercent >= maxDailyLossPercent) {
            return {
                canTrade: false,
                reason: `Daily loss limit reached: ${lossPercent.toFixed(2)}% (max: ${maxDailyLossPercent}%)`,
            };
        }
        return { canTrade: true };
    }
    async getMarketLoss(marketId) {
        this.checkDayReset();
        const marketLoss = this.marketDailyLoss.get(marketId) || 0;
        const marketCapital = await this.getMarketCapital(marketId);
        if (marketCapital <= 0) {
            return 0;
        }
        return (marketLoss / marketCapital) * 100;
    }
    async recordTrade(marketId, pnl, isLoss) {
        this.checkDayReset();
        if (isLoss) {
            const currentLoss = this.marketDailyLoss.get(marketId) || 0;
            this.marketDailyLoss.set(marketId, currentLoss + Math.abs(pnl));
            this.globalDailyLoss += Math.abs(pnl);
            const consecutive = this.consecutiveLosses.get(marketId) || 0;
            this.consecutiveLosses.set(marketId, consecutive + 1);
        }
        else {
            this.globalDailyProfit += pnl;
            this.consecutiveLosses.set(marketId, 0);
        }
    }
    getConsecutiveLosses(marketId) {
        return this.consecutiveLosses.get(marketId) || 0;
    }
    async getGlobalLossPercent() {
        const netPnl = this.globalDailyProfit - this.globalDailyLoss;
        if (netPnl >= 0)
            return 0;
        const totalCapital = await this.getTotalCapital();
        if (!(totalCapital > 0))
            return 0;
        return (Math.abs(netPnl) / totalCapital) * 100;
    }
    async shouldStopTrading(marketId, maxLossPercent = 5) {
        const lossPercent = await this.getMarketLoss(marketId);
        return lossPercent >= maxLossPercent;
    }
    resetDaily() {
        this.marketDailyLoss.clear();
        this.consecutiveLosses.clear();
        this.globalDailyLoss = 0;
        this.globalDailyProfit = 0;
        this.lastResetDate = new Date();
    }
    checkDayReset() {
        const now = new Date();
        if (now.getDate() !== this.lastResetDate.getDate() ||
            now.getMonth() !== this.lastResetDate.getMonth() ||
            now.getFullYear() !== this.lastResetDate.getFullYear()) {
            this.resetDaily();
        }
    }
    async getTotalCapital() {
        try {
            const pools = await db_1.models.aiMarketMakerPool.findAll();
            let total = 0;
            for (const pool of pools) {
                total += Number(pool.totalValueLocked) || 0;
            }
            return total;
        }
        catch (error) {
            return 0;
        }
    }
    async getMarketCapital(marketId) {
        try {
            const maker = await db_1.models.aiMarketMaker.findOne({
                where: { marketId },
                include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
            });
            if (maker === null || maker === void 0 ? void 0 : maker.pool) {
                return Number(maker.pool.totalValueLocked) || 0;
            }
            return 0;
        }
        catch (error) {
            return 0;
        }
    }
}
exports.LossProtection = LossProtection;
exports.default = LossProtection;
