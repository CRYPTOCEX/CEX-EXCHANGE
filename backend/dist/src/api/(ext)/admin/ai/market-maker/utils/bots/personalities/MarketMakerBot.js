"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMakerBot = void 0;
const BaseBot_1 = require("../BaseBot");
class MarketMakerBot extends BaseBot_1.BaseBot {
    constructor(config) {
        super({
            ...config,
            personality: "MARKET_MAKER",
            tradeFrequency: "HIGH",
        });
        this.targetSpreadBps = 15;
        this.minSpreadBps = 5;
        this.maxInventoryImbalance = 0.3;
        this.baseInventory = BigInt(0);
        this.quoteInventory = BigInt(0);
        this.lastQuotedBid = BigInt(0);
        this.lastQuotedAsk = BigInt(0);
    }
    decideTrade(context) {
        if (!this.canTrade()) {
            return { shouldTrade: false, reason: "Cannot trade" };
        }
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const imbalance = this.calculateInventoryImbalance();
        if (Math.abs(imbalance) > this.maxInventoryImbalance) {
            return this.rebalanceInventory(context, imbalance);
        }
        const placeBid = Math.random() < 0.5;
        if (placeBid) {
            return this.placeBidOrder(context, currentPriceNum);
        }
        else {
            return this.placeAskOrder(context, currentPriceNum);
        }
    }
    placeBidOrder(context, currentPrice) {
        const spreadPercent = this.targetSpreadBps / 10000;
        const bidPrice = currentPrice * (1 - spreadPercent / 2);
        const randomOffset = (Math.random() - 0.5) * spreadPercent * 0.2;
        const finalBidPrice = bidPrice * (1 + randomOffset);
        const price = BigInt(Math.floor(finalBidPrice * 1e18));
        const amount = this.calculateOrderSize(context);
        this.lastQuotedBid = price;
        return {
            shouldTrade: true,
            side: "BUY",
            price,
            amount,
            purpose: "SPREAD_MAINTENANCE",
            confidence: 0.8,
            reason: `Market making: bid at ${finalBidPrice.toFixed(8)}`,
        };
    }
    placeAskOrder(context, currentPrice) {
        const spreadPercent = this.targetSpreadBps / 10000;
        const askPrice = currentPrice * (1 + spreadPercent / 2);
        const randomOffset = (Math.random() - 0.5) * spreadPercent * 0.2;
        const finalAskPrice = askPrice * (1 + randomOffset);
        const price = BigInt(Math.floor(finalAskPrice * 1e18));
        const amount = this.calculateOrderSize(context);
        this.lastQuotedAsk = price;
        return {
            shouldTrade: true,
            side: "SELL",
            price,
            amount,
            purpose: "SPREAD_MAINTENANCE",
            confidence: 0.8,
            reason: `Market making: ask at ${finalAskPrice.toFixed(8)}`,
        };
    }
    rebalanceInventory(context, imbalance) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const side = imbalance > 0 ? "SELL" : "BUY";
        const urgencyOffset = Math.abs(imbalance) * 0.001;
        let price;
        if (side === "BUY") {
            price = currentPriceNum * (1 + urgencyOffset);
        }
        else {
            price = currentPriceNum * (1 - urgencyOffset);
        }
        const amount = this.calculateOrderSize(context);
        const rebalanceAmount = BigInt(Math.floor(Number(amount) * Math.abs(imbalance)));
        return {
            shouldTrade: true,
            side,
            price: BigInt(Math.floor(price * 1e18)),
            amount: rebalanceAmount,
            purpose: "LIQUIDITY",
            confidence: 0.9,
            reason: `Rebalancing inventory (${(imbalance * 100).toFixed(1)}% imbalance)`,
        };
    }
    calculateInventoryImbalance() {
        const totalBase = Number(this.baseInventory);
        const totalQuote = Number(this.quoteInventory);
        if (totalBase === 0 && totalQuote === 0) {
            return 0;
        }
        const total = totalBase + totalQuote;
        if (total === 0)
            return 0;
        return (totalBase - totalQuote) / total;
    }
    calculateOrderSize(context) {
        const baseSize = this.config.avgOrderSize * 0.6;
        const variedSize = this.addVariance(baseSize, 0.2);
        return BigInt(Math.floor(variedSize * 1e18));
    }
    calculatePrice(context, side) {
        const currentPriceNum = Number(context.currentPrice) / 1e18;
        const spreadPercent = this.targetSpreadBps / 10000;
        let price;
        if (side === "BUY") {
            price = currentPriceNum * (1 - spreadPercent / 2);
        }
        else {
            price = currentPriceNum * (1 + spreadPercent / 2);
        }
        return BigInt(Math.floor(price * 1e18));
    }
    updateInventory(side, amount, cost) {
        if (side === "BUY") {
            this.baseInventory += amount;
            this.quoteInventory -= cost;
        }
        else {
            this.baseInventory -= amount;
            this.quoteInventory += cost;
        }
    }
    getCooldownTime() {
        return 5000;
    }
    getMarketMakingStats() {
        const bidNum = Number(this.lastQuotedBid) / 1e18;
        const askNum = Number(this.lastQuotedAsk) / 1e18;
        const spread = bidNum > 0 ? ((askNum - bidNum) / bidNum) * 10000 : 0;
        return {
            baseInventory: (Number(this.baseInventory) / 1e18).toFixed(8),
            quoteInventory: (Number(this.quoteInventory) / 1e18).toFixed(8),
            imbalance: this.calculateInventoryImbalance(),
            lastBid: bidNum.toFixed(8),
            lastAsk: askNum.toFixed(8),
            spread,
        };
    }
}
exports.MarketMakerBot = MarketMakerBot;
exports.default = MarketMakerBot;
