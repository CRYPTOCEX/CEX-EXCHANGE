"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributorBot = void 0;
const BaseBot_1 = require("../BaseBot");
class DistributorBot extends BaseBot_1.BaseBot {
    constructor(config) {
        super({
            ...config,
            personality: "DISTRIBUTOR",
            tradeFrequency: "LOW",
        });
        this.sellBias = 0.9;
        this.maxDistributionPercent = 2;
        this.resistanceBuildingStrength = 1.5;
        this.totalDistributed = BigInt(0);
        this.distributionSessions = 0;
    }
    decideTrade(context) {
        if (!this.canTrade()) {
            return { shouldTrade: false, reason: "Cannot trade" };
        }
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;
        const isAboveTarget = currentPriceNum > targetPriceNum;
        if (priceDiff > this.maxDistributionPercent) {
            return {
                shouldTrade: false,
                reason: `Price too far below target (${priceDiff.toFixed(2)}%)`,
            };
        }
        const shouldSell = Math.random() < this.sellBias;
        if (!shouldSell) {
            if (this.totalDistributed > BigInt(0) && Math.random() < 0.1) {
                return this.createBuyOrder(context, "Rebalancing small amount");
            }
            return { shouldTrade: false, reason: "Skipping - distributor prefers selling" };
        }
        const nearResistance = currentPriceNum >= context.priceRangeHigh * 0.95;
        const sizeMultiplier = nearResistance ? this.resistanceBuildingStrength : 1;
        const price = this.calculatePrice(context, "SELL");
        const baseAmount = this.calculateOrderSize(context);
        const amount = BigInt(Math.floor(Number(baseAmount) * sizeMultiplier));
        this.distributionSessions++;
        return {
            shouldTrade: true,
            side: "SELL",
            price,
            amount,
            purpose: isAboveTarget ? "PRICE_PUSH" : "LIQUIDITY",
            confidence: 0.7 + (isAboveTarget ? 0.2 : 0),
            reason: nearResistance
                ? "Building resistance level"
                : `Distributing (session ${this.distributionSessions})`,
        };
    }
    createBuyOrder(context, reason) {
        const price = this.calculatePrice(context, "BUY");
        const amount = this.calculateOrderSize(context);
        const buyAmount = BigInt(Math.floor(Number(amount) * 0.3));
        return {
            shouldTrade: true,
            side: "BUY",
            price,
            amount: buyAmount,
            purpose: "LIQUIDITY",
            confidence: 0.4,
            reason,
        };
    }
    calculateOrderSize(context) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        let sizeMultiplier = 1;
        if (currentPriceNum > targetPriceNum * 1.02) {
            sizeMultiplier = 1.3;
        }
        const baseSize = this.config.avgOrderSize * sizeMultiplier;
        const variedSize = this.addVariance(baseSize, 0.25);
        return BigInt(Math.floor(variedSize * 1e18));
    }
    calculatePrice(context, side) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        if (side === "SELL") {
            const offset = 0.001 + Math.random() * 0.002;
            const price = currentPriceNum * (1 + offset);
            return BigInt(Math.floor(price * 1e18));
        }
        else {
            const offset = Math.random() * 0.002;
            const price = currentPriceNum * (1 - offset);
            return BigInt(Math.floor(price * 1e18));
        }
    }
    recordTradeResult(pnl) {
        super.recordTradeResult(pnl);
        if (pnl > 0) {
            this.totalDistributed += BigInt(Math.floor(pnl * 1e18));
        }
    }
    getCooldownTime() {
        return 120000;
    }
    getDistributionStats() {
        return {
            totalDistributed: (Number(this.totalDistributed) / 1e18).toFixed(8),
            sessions: this.distributionSessions,
        };
    }
}
exports.DistributorBot = DistributorBot;
exports.default = DistributorBot;
