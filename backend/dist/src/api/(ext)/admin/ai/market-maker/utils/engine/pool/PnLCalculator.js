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
    updateCurrentPrice(marketMakerId, price) {
        this.currentPrices.set(marketMakerId, price);
    }
    async calculatePnL(marketMakerId, balanceTracker) {
        try {
            const currentBalance = await balanceTracker.getBalance();
            const initialBalance = balanceTracker.getInitialBalances();
            const initialPrice = this.initialPrices.get(marketMakerId) || 1;
            const currentPrice = this.currentPrices.get(marketMakerId) || initialPrice;
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
        const realized = this.realizedPnL.get(marketMakerId) || 0;
        return {
            unrealized,
            realized,
            total: unrealized + realized,
        };
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
            const unrealized = this.unrealizedPnL.get(marketMakerId) || 0;
            const realized = this.realizedPnL.get(marketMakerId) || 0;
            await db_1.models.aiMarketMakerPool.update({
                unrealizedPnL: unrealized,
                realizedPnL: realized,
            }, { where: { marketMakerId } });
        }
        catch (error) {
        }
    }
}
exports.PnLCalculator = PnLCalculator;
exports.default = PnLCalculator;
