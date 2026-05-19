"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyManager = void 0;
const GradualDriftStrategy_1 = require("./GradualDriftStrategy");
const OscillationStrategy_1 = require("./OscillationStrategy");
const SupportResistanceStrategy_1 = require("./SupportResistanceStrategy");
class StrategyManager {
    constructor() {
        this.strategies = new Map();
        this.activeStrategies = new Map();
        this.registerStrategy(new GradualDriftStrategy_1.GradualDriftStrategy());
        this.registerStrategy(new OscillationStrategy_1.OscillationStrategy());
        this.registerStrategy(new SupportResistanceStrategy_1.SupportResistanceStrategy());
    }
    registerStrategy(strategy) {
        this.strategies.set(strategy.name, strategy);
    }
    getStrategy(name) {
        return this.strategies.get(name);
    }
    getAvailableStrategies() {
        return Array.from(this.strategies.keys());
    }
    setActiveStrategies(marketId, strategyNames) {
        this.activeStrategies.set(marketId, strategyNames);
    }
    getActiveStrategies(marketId) {
        return this.activeStrategies.get(marketId) || ["gradual_drift"];
    }
    calculate(marketId, currentPrice, targetPrice, config) {
        const activeNames = this.getActiveStrategies(marketId);
        const results = [];
        for (const name of activeNames) {
            const strategy = this.strategies.get(name);
            if (strategy) {
                const result = strategy.calculate(currentPrice, targetPrice, config);
                results.push(result);
            }
        }
        if (results.length === 0) {
            return {
                shouldTrade: false,
                direction: "BUY",
                priceAdjustment: 0,
                sizeMultiplier: 1,
                confidence: 0,
            };
        }
        return this.combineResults(results);
    }
    selectStrategy(marketId, volatility, distanceFromTarget) {
        if (volatility > 5) {
            return "oscillation";
        }
        if (Math.abs(distanceFromTarget) > 5) {
            return "gradual_drift";
        }
        return "support_resistance";
    }
    autoSelectStrategies(marketId, volatility, distanceFromTarget) {
        const primary = this.selectStrategy(marketId, volatility, distanceFromTarget);
        const strategies = [primary];
        if (primary !== "oscillation" && volatility > 2) {
            strategies.push("oscillation");
        }
        this.setActiveStrategies(marketId, strategies);
    }
    combineResults(results) {
        if (results.length === 1) {
            return results[0];
        }
        let totalWeight = 0;
        let weightedPriceAdj = 0;
        let weightedSizeMultiplier = 0;
        let shouldTrade = false;
        let primaryDirection = "BUY";
        let buyVotes = 0;
        let sellVotes = 0;
        for (const result of results) {
            const weight = result.confidence;
            totalWeight += weight;
            weightedPriceAdj += result.priceAdjustment * weight;
            weightedSizeMultiplier += result.sizeMultiplier * weight;
            if (result.shouldTrade) {
                shouldTrade = true;
                if (result.direction === "BUY") {
                    buyVotes += weight;
                }
                else {
                    sellVotes += weight;
                }
            }
        }
        if (totalWeight === 0) {
            return {
                shouldTrade: false,
                direction: "BUY",
                priceAdjustment: 0,
                sizeMultiplier: 1,
                confidence: 0,
            };
        }
        primaryDirection = buyVotes >= sellVotes ? "BUY" : "SELL";
        return {
            shouldTrade,
            direction: primaryDirection,
            priceAdjustment: weightedPriceAdj / totalWeight,
            sizeMultiplier: weightedSizeMultiplier / totalWeight,
            confidence: totalWeight / results.length,
        };
    }
}
exports.StrategyManager = StrategyManager;
exports.default = StrategyManager;
