"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccumulatorBot = void 0;
const BaseBot_1 = require("../BaseBot");
class AccumulatorBot extends BaseBot_1.BaseBot {
    constructor(config) {
        super({
            ...config,
            personality: "ACCUMULATOR",
            tradeFrequency: "LOW",
        });
        this.buyBias = 0.9;
        this.maxAccumulationPercent = 2;
        this.supportBuildingStrength = 1.5;
        this.totalAccumulated = BigInt(0);
        this.accumulationSessions = 0;
    }
    decideTrade(context) {
        if (!this.canTrade()) {
            return { shouldTrade: false, reason: "Cannot trade" };
        }
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;
        const isBelowTarget = currentPriceNum < targetPriceNum;
        if (priceDiff < -this.maxAccumulationPercent) {
            return {
                shouldTrade: false,
                reason: `Price too far above target (${priceDiff.toFixed(2)}%)`,
            };
        }
        const shouldBuy = Math.random() < this.buyBias;
        if (!shouldBuy) {
            if (this.totalAccumulated > BigInt(0) && Math.random() < 0.1) {
                return this.createSellOrder(context, "Rebalancing small amount");
            }
            return { shouldTrade: false, reason: "Skipping - accumulator prefers buying" };
        }
        const nearSupport = currentPriceNum <= context.priceRangeLow * 1.05;
        const sizeMultiplier = nearSupport ? this.supportBuildingStrength : 1;
        const price = this.calculatePrice(context, "BUY");
        const baseAmount = this.calculateOrderSize(context);
        const amount = BigInt(Math.floor(Number(baseAmount) * sizeMultiplier));
        this.accumulationSessions++;
        return {
            shouldTrade: true,
            side: "BUY",
            price,
            amount,
            purpose: isBelowTarget ? "PRICE_PUSH" : "LIQUIDITY",
            confidence: 0.7 + (isBelowTarget ? 0.2 : 0),
            reason: nearSupport
                ? "Building support level"
                : `Accumulating (session ${this.accumulationSessions})`,
        };
    }
    createSellOrder(context, reason) {
        const price = this.calculatePrice(context, "SELL");
        const amount = this.calculateOrderSize(context);
        const sellAmount = BigInt(Math.floor(Number(amount) * 0.3));
        return {
            shouldTrade: true,
            side: "SELL",
            price,
            amount: sellAmount,
            purpose: "LIQUIDITY",
            confidence: 0.4,
            reason,
        };
    }
    calculateOrderSize(context) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        let sizeMultiplier = 1;
        if (currentPriceNum < targetPriceNum * 0.98) {
            sizeMultiplier = 1.3;
        }
        const baseSize = this.config.avgOrderSize * sizeMultiplier;
        const variedSize = this.addVariance(baseSize, 0.25);
        return BigInt(Math.floor(variedSize * 1e18));
    }
    calculatePrice(context, side) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        if (side === "BUY") {
            const offset = 0.001 + Math.random() * 0.002;
            const price = currentPriceNum * (1 - offset);
            return BigInt(Math.floor(price * 1e18));
        }
        else {
            const offset = Math.random() * 0.002;
            const price = currentPriceNum * (1 + offset);
            return BigInt(Math.floor(price * 1e18));
        }
    }
    recordTradeResult(pnl) {
        super.recordTradeResult(pnl);
        if (pnl > 0) {
            this.totalAccumulated += BigInt(Math.floor(pnl * 1e18));
        }
    }
    getCooldownTime() {
        return 120000;
    }
    getAccumulationStats() {
        return {
            totalAccumulated: (Number(this.totalAccumulated) / 1e18).toFixed(8),
            sessions: this.accumulationSessions,
        };
    }
}
exports.AccumulatorBot = AccumulatorBot;
exports.default = AccumulatorBot;
