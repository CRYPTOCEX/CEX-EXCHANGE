"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportResistanceStrategy = void 0;
class SupportResistanceStrategy {
    constructor() {
        this.name = "support_resistance";
        this.supportLevels = new Map();
        this.resistanceLevels = new Map();
    }
    calculate(currentPrice, targetPrice, config) {
        const current = Number(currentPrice) / 1e18;
        const target = Number(targetPrice) / 1e18;
        const levels = this.calculateLevels(target, config);
        const nearestSupport = this.findNearestBelow(current, levels.support);
        const nearestResistance = this.findNearestAbove(current, levels.resistance);
        const distToSupport = nearestSupport ? (current - nearestSupport) / current * 100 : 100;
        const distToResistance = nearestResistance ? (nearestResistance - current) / current * 100 : 100;
        if (distToSupport < 0.5) {
            return {
                shouldTrade: true,
                direction: "BUY",
                priceAdjustment: 0.05,
                sizeMultiplier: 1.5,
                confidence: 0.9,
                reason: `Defending support at ${nearestSupport === null || nearestSupport === void 0 ? void 0 : nearestSupport.toFixed(8)}`,
            };
        }
        if (distToResistance < 0.5) {
            return {
                shouldTrade: true,
                direction: "SELL",
                priceAdjustment: 0.05,
                sizeMultiplier: 1.5,
                confidence: 0.9,
                reason: `Defending resistance at ${nearestResistance === null || nearestResistance === void 0 ? void 0 : nearestResistance.toFixed(8)}`,
            };
        }
        const distToTarget = (target - current) / current * 100;
        if (Math.abs(distToTarget) < 0.5) {
            return {
                shouldTrade: Math.random() > 0.7,
                direction: Math.random() > 0.5 ? "BUY" : "SELL",
                priceAdjustment: 0.02,
                sizeMultiplier: 0.5,
                confidence: 0.3,
                reason: "Maintaining around target",
            };
        }
        const direction = distToTarget > 0 ? "BUY" : "SELL";
        return {
            shouldTrade: true,
            direction,
            priceAdjustment: Math.min(0.1, Math.abs(distToTarget) * 0.1),
            sizeMultiplier: 1,
            confidence: 0.6,
            reason: `Moving toward target (${distToTarget.toFixed(2)}% away)`,
        };
    }
    calculateLevels(target, config) {
        const support = [];
        const resistance = [];
        const spacing = this.getLevelSpacing(config.aggressionLevel);
        for (let i = 1; i <= 5; i++) {
            support.push(target * (1 - spacing * i));
            resistance.push(target * (1 + spacing * i));
        }
        support.push(config.priceRangeLow);
        resistance.push(config.priceRangeHigh);
        return {
            support: support.sort((a, b) => b - a),
            resistance: resistance.sort((a, b) => a - b),
        };
    }
    findNearestBelow(price, levels) {
        for (const level of levels) {
            if (level < price) {
                return level;
            }
        }
        return null;
    }
    findNearestAbove(price, levels) {
        for (const level of levels) {
            if (level > price) {
                return level;
            }
        }
        return null;
    }
    getLevelSpacing(aggression) {
        switch (aggression) {
            case "AGGRESSIVE":
                return 0.01;
            case "MODERATE":
                return 0.02;
            case "CONSERVATIVE":
            default:
                return 0.03;
        }
    }
}
exports.SupportResistanceStrategy = SupportResistanceStrategy;
exports.default = SupportResistanceStrategy;
