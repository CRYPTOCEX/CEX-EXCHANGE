"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotCoordinator = void 0;
const BotManager_1 = require("./BotManager");
const console_1 = require("@b/utils/console");
class BotCoordinator {
    constructor() {
        this.marketRules = new Map();
        this.recentTrades = new Map();
        this.marketPressure = new Map();
        this.antiCollisionWindowMs = 5000;
        this.maxPressureImbalance = 0.3;
        this.recentTradeRetentionMs = 60000;
        this.botManager = BotManager_1.BotManager.getInstance();
    }
    static getInstance() {
        if (!BotCoordinator.instance) {
            BotCoordinator.instance = new BotCoordinator();
        }
        return BotCoordinator.instance;
    }
    setMarketRules(marketId, rules) {
        this.marketRules.set(marketId, new Set(rules));
        (0, console_1.logInfo)("bot-coordinator", `Set rules for market ${marketId}: ${rules.join(", ")}`);
    }
    getMarketRules(marketId) {
        return Array.from(this.marketRules.get(marketId) || []);
    }
    enableDefaultRules(marketId) {
        this.setMarketRules(marketId, [
            "ANTI_COLLISION",
            "VOLUME_BALANCING",
            "SPREAD_MAINTENANCE",
        ]);
    }
    coordinateTrade(marketId, botId, decision, context) {
        const rules = this.marketRules.get(marketId);
        if (!rules || rules.size === 0 || !decision.shouldTrade) {
            return { approved: true };
        }
        for (const rule of rules) {
            const result = this.applyRule(rule, marketId, botId, decision, context);
            if (!result.approved) {
                return result;
            }
            if (result.adjustedDecision) {
                decision = result.adjustedDecision;
            }
        }
        return { approved: true, adjustedDecision: decision };
    }
    recordTrade(marketId, botId, side, price, amount) {
        if (!this.recentTrades.has(marketId)) {
            this.recentTrades.set(marketId, []);
        }
        const trades = this.recentTrades.get(marketId);
        trades.push({
            botId,
            side,
            price,
            amount,
            timestamp: Date.now(),
        });
        this.updateMarketPressure(marketId, side, amount);
        this.cleanOldTrades(marketId);
    }
    getMarketPressure(marketId) {
        return this.marketPressure.get(marketId);
    }
    getRecommendedSide(marketId) {
        const pressure = this.marketPressure.get(marketId);
        if (!pressure)
            return null;
        if (pressure.netPressure > this.maxPressureImbalance) {
            return "SELL";
        }
        else if (pressure.netPressure < -this.maxPressureImbalance) {
            return "BUY";
        }
        return null;
    }
    isSideAllowed(marketId, side) {
        const pressure = this.marketPressure.get(marketId);
        if (!pressure)
            return true;
        if (side === "BUY" && pressure.netPressure > this.maxPressureImbalance * 1.5) {
            return false;
        }
        if (side === "SELL" && pressure.netPressure < -this.maxPressureImbalance * 1.5) {
            return false;
        }
        return true;
    }
    getCoordinationStats(marketId) {
        const rules = this.getMarketRules(marketId);
        const trades = this.recentTrades.get(marketId) || [];
        const pressure = this.marketPressure.get(marketId) || null;
        const recommendations = [];
        if (pressure) {
            if (pressure.netPressure > this.maxPressureImbalance) {
                recommendations.push("High buy pressure - prioritize sell orders");
            }
            else if (pressure.netPressure < -this.maxPressureImbalance) {
                recommendations.push("High sell pressure - prioritize buy orders");
            }
            else {
                recommendations.push("Market pressure balanced");
            }
        }
        return {
            activeRules: rules,
            recentTradeCount: trades.length,
            pressure,
            recommendations,
        };
    }
    applyRule(rule, marketId, botId, decision, context) {
        switch (rule) {
            case "ANTI_COLLISION":
                return this.applyAntiCollision(marketId, botId, decision);
            case "PRICE_COORDINATION":
                return this.applyPriceCoordination(marketId, decision, context);
            case "VOLUME_BALANCING":
                return this.applyVolumeBalancing(marketId, decision);
            case "SPREAD_MAINTENANCE":
                return this.applySpreadMaintenance(marketId, decision, context);
            default:
                return { approved: true };
        }
    }
    applyAntiCollision(marketId, botId, decision) {
        const trades = this.recentTrades.get(marketId) || [];
        const now = Date.now();
        const recentOpposite = trades.filter((t) => t.botId !== botId &&
            t.side !== decision.side &&
            now - t.timestamp < this.antiCollisionWindowMs);
        if (recentOpposite.length > 0) {
            const wouldCollide = recentOpposite.some((t) => {
                if (decision.side === "BUY") {
                    return decision.price >= t.price;
                }
                else {
                    return decision.price <= t.price;
                }
            });
            if (wouldCollide) {
                return {
                    approved: false,
                    reason: "Would collide with recent bot trade",
                };
            }
        }
        return { approved: true };
    }
    applyPriceCoordination(marketId, decision, context) {
        if (!decision.price)
            return { approved: true };
        const currentPrice = Number(context.currentPrice) / 1e18;
        const decisionPrice = Number(decision.price) / 1e18;
        const priceDiff = Math.abs((decisionPrice - currentPrice) / currentPrice);
        if (priceDiff > 0.01) {
            const maxMove = currentPrice * 0.01;
            let adjustedPrice;
            if (decision.side === "BUY") {
                adjustedPrice = BigInt(Math.floor((currentPrice - maxMove) * 1e18));
            }
            else {
                adjustedPrice = BigInt(Math.floor((currentPrice + maxMove) * 1e18));
            }
            return {
                approved: true,
                adjustedDecision: {
                    ...decision,
                    price: adjustedPrice,
                },
                reason: "Price adjusted to stay within coordination bounds",
            };
        }
        return { approved: true };
    }
    applyVolumeBalancing(marketId, decision) {
        const pressure = this.marketPressure.get(marketId);
        if (!pressure)
            return { approved: true };
        const wouldWorsen = (decision.side === "BUY" && pressure.netPressure > this.maxPressureImbalance) ||
            (decision.side === "SELL" && pressure.netPressure < -this.maxPressureImbalance);
        if (wouldWorsen) {
            const reducedAmount = decision.amount
                ? BigInt(Math.floor(Number(decision.amount) * 0.5))
                : undefined;
            return {
                approved: true,
                adjustedDecision: {
                    ...decision,
                    amount: reducedAmount,
                },
                reason: "Order size reduced for volume balancing",
            };
        }
        return { approved: true };
    }
    applySpreadMaintenance(marketId, decision, context) {
        var _a, _b;
        if (!decision.price)
            return { approved: true };
        const minSpreadBps = 10;
        const bestBid = ((_a = context.orderbook) === null || _a === void 0 ? void 0 : _a.bestBid) || BigInt(0);
        const bestAsk = ((_b = context.orderbook) === null || _b === void 0 ? void 0 : _b.bestAsk) || BigInt(0);
        if (bestBid === BigInt(0) || bestAsk === BigInt(0)) {
            return { approved: true };
        }
        const bidNum = Number(bestBid);
        const askNum = Number(bestAsk);
        const decisionPriceNum = Number(decision.price);
        if (decision.side === "BUY") {
            const maxBid = askNum * (1 - minSpreadBps / 10000);
            if (decisionPriceNum > maxBid) {
                return {
                    approved: true,
                    adjustedDecision: {
                        ...decision,
                        price: BigInt(Math.floor(maxBid)),
                    },
                    reason: "Bid adjusted to maintain minimum spread",
                };
            }
        }
        else {
            const minAsk = bidNum * (1 + minSpreadBps / 10000);
            if (decisionPriceNum < minAsk) {
                return {
                    approved: true,
                    adjustedDecision: {
                        ...decision,
                        price: BigInt(Math.floor(minAsk)),
                    },
                    reason: "Ask adjusted to maintain minimum spread",
                };
            }
        }
        return { approved: true };
    }
    updateMarketPressure(marketId, side, amount) {
        let pressure = this.marketPressure.get(marketId);
        if (!pressure) {
            pressure = {
                buyVolume: BigInt(0),
                sellVolume: BigInt(0),
                netPressure: 0,
                lastUpdate: Date.now(),
            };
        }
        if (side === "BUY") {
            pressure.buyVolume += amount;
        }
        else {
            pressure.sellVolume += amount;
        }
        const total = Number(pressure.buyVolume) + Number(pressure.sellVolume);
        if (total > 0) {
            pressure.netPressure =
                (Number(pressure.buyVolume) - Number(pressure.sellVolume)) / total;
        }
        pressure.lastUpdate = Date.now();
        this.marketPressure.set(marketId, pressure);
    }
    cleanOldTrades(marketId) {
        const trades = this.recentTrades.get(marketId);
        if (!trades)
            return;
        const cutoff = Date.now() - this.recentTradeRetentionMs;
        const filtered = trades.filter((t) => t.timestamp > cutoff);
        this.recentTrades.set(marketId, filtered);
    }
    resetMarketPressure(marketId) {
        this.marketPressure.set(marketId, {
            buyVolume: BigInt(0),
            sellVolume: BigInt(0),
            netPressure: 0,
            lastUpdate: Date.now(),
        });
    }
    clearMarket(marketId) {
        this.marketRules.delete(marketId);
        this.recentTrades.delete(marketId);
        this.marketPressure.delete(marketId);
    }
}
exports.BotCoordinator = BotCoordinator;
exports.default = BotCoordinator;
