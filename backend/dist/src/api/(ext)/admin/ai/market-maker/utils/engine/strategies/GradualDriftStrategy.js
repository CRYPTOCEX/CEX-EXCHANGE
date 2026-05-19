"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradualDriftStrategy = void 0;
class GradualDriftStrategy {
    constructor() {
        this.name = "gradual_drift";
    }
    calculate(currentPrice, targetPrice, config) {
        const current = Number(currentPrice) / 1e18;
        const target = Number(targetPrice) / 1e18;
        const distance = target - current;
        const distancePercent = (distance / current) * 100;
        const absDistance = Math.abs(distancePercent);
        if (absDistance < 0.1) {
            return {
                shouldTrade: false,
                direction: "BUY",
                priceAdjustment: 0,
                sizeMultiplier: 1,
                confidence: 0.5,
                reason: "Already at target price",
            };
        }
        const direction = distance > 0 ? "BUY" : "SELL";
        const maxStep = this.getMaxStep(config.aggressionLevel);
        let stepSize = Math.min(absDistance * 0.1, maxStep);
        const randomFactor = 0.8 + Math.random() * 0.4;
        stepSize *= randomFactor;
        if (config.currentVolatility > config.volatilityThreshold) {
            stepSize *= 0.5;
        }
        let sizeMultiplier = 1;
        if (absDistance > 5) {
            sizeMultiplier = 1.5;
        }
        else if (absDistance < 1) {
            sizeMultiplier = 0.5;
        }
        const confidence = Math.min(1, absDistance / 10);
        return {
            shouldTrade: true,
            direction,
            priceAdjustment: direction === "BUY" ? stepSize : -stepSize,
            sizeMultiplier,
            confidence,
            reason: `Moving ${direction} toward target (${distancePercent.toFixed(2)}% away)`,
        };
    }
    getMaxStep(aggression) {
        switch (aggression) {
            case "AGGRESSIVE":
                return 0.5;
            case "MODERATE":
                return 0.2;
            case "CONSERVATIVE":
            default:
                return 0.1;
        }
    }
}
exports.GradualDriftStrategy = GradualDriftStrategy;
exports.default = GradualDriftStrategy;
