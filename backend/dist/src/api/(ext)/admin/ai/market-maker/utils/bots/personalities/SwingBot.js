"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwingBot = void 0;
const BaseBot_1 = require("../BaseBot");
class SwingBot extends BaseBot_1.BaseBot {
    constructor(config) {
        super({
            ...config,
            personality: "SWING",
            tradeFrequency: "MEDIUM",
        });
        this.minSwingPercent = 0.5;
        this.maxSwingPercent = 3;
        this.holdTimeMs = 300000;
        this.currentPosition = "NEUTRAL";
        this.entryPrice = 0;
        this.positionOpenTime = null;
    }
    decideTrade(context) {
        if (!this.canTrade()) {
            return { shouldTrade: false, reason: "Cannot trade" };
        }
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const targetPriceNum = Number(context.targetPrice) / 1e18;
        const priceDiff = ((targetPriceNum - currentPriceNum) / currentPriceNum) * 100;
        if (this.currentPosition !== "NEUTRAL") {
            return this.managePosition(context, currentPriceNum, priceDiff);
        }
        return this.findEntry(context, currentPriceNum, priceDiff);
    }
    managePosition(context, currentPriceNum, priceDiff) {
        if (!this.positionOpenTime) {
            this.currentPosition = "NEUTRAL";
            return { shouldTrade: false };
        }
        const holdTime = Date.now() - this.positionOpenTime.getTime();
        const priceChange = ((currentPriceNum - this.entryPrice) / this.entryPrice) * 100;
        const profitTarget = this.minSwingPercent + Math.random() * (this.maxSwingPercent - this.minSwingPercent);
        const shouldClose = (this.currentPosition === "LONG" && priceChange >= profitTarget) ||
            (this.currentPosition === "SHORT" && priceChange <= -profitTarget) ||
            holdTime > this.holdTimeMs * 2 ||
            Math.abs(priceDiff) > this.maxSwingPercent;
        if (shouldClose) {
            const closeSide = this.currentPosition === "LONG" ? "SELL" : "BUY";
            const price = this.calculatePrice(context, closeSide);
            const amount = this.calculateOrderSize(context);
            this.currentPosition = "NEUTRAL";
            this.entryPrice = 0;
            this.positionOpenTime = null;
            return {
                shouldTrade: true,
                side: closeSide,
                price,
                amount,
                purpose: "PRICE_PUSH",
                confidence: 0.8,
                reason: `Closing ${this.currentPosition} position (${priceChange.toFixed(2)}% P&L)`,
            };
        }
        return { shouldTrade: false, reason: "Holding position" };
    }
    findEntry(context, currentPriceNum, priceDiff) {
        if (Math.abs(priceDiff) < this.minSwingPercent) {
            return { shouldTrade: false, reason: "Price too close to target" };
        }
        if (context.volatility > 5) {
            return { shouldTrade: false, reason: "Volatility too high for swing entry" };
        }
        const nearSupport = currentPriceNum <= context.priceRangeLow * 1.02;
        const nearResistance = currentPriceNum >= context.priceRangeHigh * 0.98;
        let side;
        let reason;
        if (nearSupport && priceDiff > 0) {
            side = "BUY";
            reason = "Long entry near support";
        }
        else if (nearResistance && priceDiff < 0) {
            side = "SELL";
            reason = "Short entry near resistance";
        }
        else if (priceDiff > this.minSwingPercent) {
            side = "BUY";
            reason = "Long entry to push price up";
        }
        else {
            side = "SELL";
            reason = "Short entry to push price down";
        }
        if (Math.random() > 0.4) {
            return { shouldTrade: false, reason: "Waiting for better entry" };
        }
        const price = this.calculatePrice(context, side);
        const amount = this.calculateOrderSize(context);
        this.currentPosition = side === "BUY" ? "LONG" : "SHORT";
        this.entryPrice = currentPriceNum;
        this.positionOpenTime = new Date();
        return {
            shouldTrade: true,
            side,
            price,
            amount,
            purpose: "PRICE_PUSH",
            confidence: 0.6 + Math.abs(priceDiff) * 0.1,
            reason,
        };
    }
    calculateOrderSize(context) {
        const baseSize = this.config.avgOrderSize;
        const variedSize = this.addVariance(baseSize, 0.3);
        return BigInt(Math.floor(variedSize * 1e18));
    }
    calculatePrice(context, side) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const offsetPercent = 0.001 + Math.random() * 0.003;
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
        return 60000;
    }
}
exports.SwingBot = SwingBot;
exports.default = SwingBot;
