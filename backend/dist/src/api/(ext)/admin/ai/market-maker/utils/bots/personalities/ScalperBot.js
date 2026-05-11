"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScalperBot = void 0;
const BaseBot_1 = require("../BaseBot");
class ScalperBot extends BaseBot_1.BaseBot {
    constructor(config) {
        super({
            ...config,
            personality: "SCALPER",
            tradeFrequency: "HIGH",
        });
        this.minSpreadBps = 5;
        this.maxSpreadBps = 20;
        this.targetProfitBps = 3;
    }
    decideTrade(context) {
        if (!this.canTrade()) {
            return { shouldTrade: false, reason: "Cannot trade" };
        }
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        if (context.spreadBps > this.maxSpreadBps) {
            return {
                shouldTrade: false,
                reason: `Spread too wide: ${context.spreadBps}bps`,
            };
        }
        if (context.volatility > 3) {
            return {
                shouldTrade: false,
                reason: `Volatility too high: ${context.volatility}%`,
            };
        }
        const priceDiff = (targetPriceNum - currentPriceNum) / currentPriceNum;
        const side = priceDiff > 0 ? "BUY" : "SELL";
        const price = this.calculatePrice(context, side);
        const amount = this.calculateOrderSize(context);
        if (Math.random() > 0.6) {
            return { shouldTrade: false, reason: "Random skip for unpredictability" };
        }
        return {
            shouldTrade: true,
            side,
            price,
            amount,
            purpose: "SPREAD_MAINTENANCE",
            confidence: 0.7 + Math.random() * 0.2,
            reason: `Scalping ${side} for micro profit`,
        };
    }
    calculateOrderSize(context) {
        const baseSize = this.config.avgOrderSize * 0.5;
        const variedSize = this.addVariance(baseSize, 0.4);
        return BigInt(Math.floor(variedSize * 1e18));
    }
    calculatePrice(context, side) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const offsetPercent = (this.targetProfitBps / 10000) * (0.5 + Math.random() * 0.5);
        let price;
        if (side === "BUY") {
            price = currentPriceNum * (1 - offsetPercent);
        }
        else {
            price = currentPriceNum * (1 + offsetPercent);
        }
        return BigInt(Math.floor(price * 1e18));
    }
    getCooldownTime() {
        return 10000;
    }
}
exports.ScalperBot = ScalperBot;
exports.default = ScalperBot;
