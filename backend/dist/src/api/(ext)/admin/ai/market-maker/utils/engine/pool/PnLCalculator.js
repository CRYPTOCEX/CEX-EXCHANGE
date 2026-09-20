"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PnLCalculator = void 0;
const db_1 = require("@b/db");
const tvl_1 = require("../../helpers/tvl");
class PnLCalculator {
    constructor() {
        this.unrealizedPnL = new Map();
        this.realizedPnL = new Map();
        this.initialPrices = new Map();
        this.currentPrices = new Map();
        this.dailyPnL = new Map();
    }
    setInitialPrice(marketMakerId, price) {
        if (!this.initialPrices.has(marketMakerId)) {
            this.initialPrices.set(marketMakerId, price);
        }
    }
    async resolveInitialPrice(marketMakerId) {
        const cached = this.initialPrices.get(marketMakerId);
        if (cached !== undefined)
            return cached;
        let price = 0;
        try {
            const maker = await db_1.models.aiMarketMaker.findByPk(marketMakerId, {
                attributes: ["id", "targetPrice"],
            });
            price = Number(maker === null || maker === void 0 ? void 0 : maker.targetPrice) || 0;
        }
        catch (_a) {
            price = 0;
        }
        if (price > 0)
            this.initialPrices.set(marketMakerId, price);
        return price;
    }
    updateCurrentPrice(marketMakerId, price) {
        this.currentPrices.set(marketMakerId, price);
    }
    async calculatePnL(marketMakerId, balanceTracker) {
        try {
            const currentPrice = this.currentPrices.get(marketMakerId) ||
                (await this.resolveInitialPrice(marketMakerId));
            if (currentPrice > 0)
                balanceTracker.setCurrentPrice(currentPrice);
            const currentBalance = await balanceTracker.getBalance();
            const initialBalance = balanceTracker.getInitialBalances();
            const initialPrice = await this.resolveInitialPrice(marketMakerId);
            if (!(initialPrice > 0))
                return;
            const pnlResult = (0, tvl_1.calculatePnLFromTVL)(initialBalance.base, initialBalance.quote, currentBalance.baseCurrency, currentBalance.quoteCurrency, initialPrice, currentPrice);
            this.unrealizedPnL.set(marketMakerId, pnlResult.absolutePnL);
            await this.updatePnLInDatabase(marketMakerId);
        }
        catch (error) {
        }
    }
    recordPnL(marketMakerId, pnl, isRealized) {
        if (isRealized) {
            const current = this.realizedPnL.get(marketMakerId) || 0;
            this.realizedPnL.set(marketMakerId, current + pnl);
            this.recordDailyPnL(marketMakerId, pnl);
        }
        else {
            this.unrealizedPnL.set(marketMakerId, pnl);
        }
    }
    async getPnL(marketMakerId) {
        const unrealized = this.unrealizedPnL.get(marketMakerId) || 0;
        const realized = await this.getRealizedFromBots(marketMakerId);
        return {
            unrealized,
            realized,
            total: unrealized + realized,
        };
    }
    async getRealizedFromBots(marketMakerId) {
        try {
            const bots = await db_1.models.aiBot.findAll({
                where: { marketMakerId },
                attributes: ["id", "totalRealizedPnL"],
            });
            return bots.reduce((sum, b) => sum + (Number(b.totalRealizedPnL) || 0), 0);
        }
        catch (_a) {
            return 0;
        }
    }
    getDailyPnL(marketMakerId, days = 7) {
        const daily = this.dailyPnL.get(marketMakerId) || [];
        return daily.slice(-days);
    }
    getAggregatePnL(marketMakerId, period) {
        const daily = this.dailyPnL.get(marketMakerId) || [];
        let days;
        switch (period) {
            case "day":
                days = 1;
                break;
            case "week":
                days = 7;
                break;
            case "month":
                days = 30;
                break;
        }
        const recentPnL = daily.slice(-days);
        return recentPnL.reduce((sum, pnl) => sum + pnl, 0);
    }
    resetDaily() {
        for (const [marketMakerId] of this.realizedPnL) {
            const todayPnL = this.realizedPnL.get(marketMakerId) || 0;
            this.recordDailyPnL(marketMakerId, todayPnL);
        }
        this.realizedPnL.clear();
    }
    recordDailyPnL(marketMakerId, pnl) {
        const daily = this.dailyPnL.get(marketMakerId) || [];
        daily.push(pnl);
        if (daily.length > 30) {
            daily.shift();
        }
        this.dailyPnL.set(marketMakerId, daily);
    }
    async updatePnLInDatabase(marketMakerId) {
        try {
            const unrealizedValue = this.unrealizedPnL.get(marketMakerId) || 0;
            const realized = await this.getRealizedFromBots(marketMakerId);
            await db_1.models.aiMarketMakerPool.update({
                unrealizedPnL: unrealizedValue,
                realizedPnL: realized,
            }, { where: { marketMakerId } });
        }
        catch (error) {
        }
    }
}
exports.PnLCalculator = PnLCalculator;
exports.default = PnLCalculator;
