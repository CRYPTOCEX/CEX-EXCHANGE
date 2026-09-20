"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolatilityEngine = void 0;
const PerlinNoise_1 = require("./PerlinNoise");
class VolatilityEngine {
    constructor() {
        this.noiseOffset = new Map();
        this.perlinNoise = new PerlinNoise_1.PerlinNoise();
    }
    calculatePriceMovement(marketId, currentPrice, config, phase, currentMomentum, externalGravity) {
        if (!this.noiseOffset.has(marketId)) {
            this.noiseOffset.set(marketId, Math.random() * 10000);
        }
        const noiseTime = this.noiseOffset.get(marketId);
        const macroComponent = this.calculateMacroComponent(currentPrice, phase, config.baseVolatility);
        const dailyComponent = this.calculateDailyComponent(config.baseVolatility, config.volatilityMultiplier);
        const microComponent = this.calculateMicroComponent(marketId, noiseTime, config.baseVolatility);
        let gravityComponent = 0;
        if (externalGravity && externalGravity.strength > 0) {
            gravityComponent = this.calculateGravityComponent(currentPrice, externalGravity);
        }
        const momentumInfluence = currentMomentum * config.baseVolatility * 0.3;
        let totalChange = macroComponent +
            dailyComponent +
            microComponent +
            gravityComponent +
            momentumInfluence;
        const drift = totalChange / 100;
        const volatility = (config.baseVolatility * config.volatilityMultiplier) / 100;
        const newPrice = this.applyGBM(currentPrice, drift, volatility);
        const priceChangePercent = ((newPrice - currentPrice) / currentPrice) * 100;
        let newMomentum = currentMomentum * config.momentumDecay;
        newMomentum += priceChangePercent * 0.1;
        newMomentum = Math.max(-1, Math.min(1, newMomentum));
        const direction = newPrice > currentPrice ? "BUY" : "SELL";
        this.noiseOffset.set(marketId, noiseTime + 0.01);
        return {
            newPrice: Math.max(0.00000001, newPrice),
            direction,
            magnitude: Math.abs(newPrice - currentPrice),
            percentChange: priceChangePercent,
            momentum: newMomentum,
        };
    }
    calculateMacroComponent(currentPrice, phase, baseVolatility) {
        const distanceToTarget = ((phase.targetPrice - currentPrice) / currentPrice) * 100;
        let driftStrength;
        switch (phase.phase) {
            case "ACCUMULATION":
                driftStrength = 0.1;
                break;
            case "MARKUP":
                driftStrength = 0.4;
                break;
            case "DISTRIBUTION":
                driftStrength = 0.15;
                break;
            case "MARKDOWN":
                driftStrength = 0.35;
                break;
        }
        const progressMultiplier = 0.5 + phase.progress * 0.5;
        const drift = distanceToTarget * driftStrength * progressMultiplier;
        const maxDrift = baseVolatility * 0.5;
        return Math.max(-maxDrift, Math.min(maxDrift, drift));
    }
    calculateDailyComponent(baseVolatility, multiplier) {
        const now = new Date();
        const hour = now.getUTCHours();
        let sessionMultiplier = 1.0;
        if ((hour >= 8 && hour <= 16) || (hour >= 13 && hour <= 17)) {
            sessionMultiplier = 1.3;
        }
        else if (hour >= 0 && hour <= 6) {
            sessionMultiplier = 0.7;
        }
        const randomComponent = (Math.random() - 0.5) * 2;
        return (randomComponent * baseVolatility * 0.2 * multiplier * sessionMultiplier);
    }
    calculateMicroComponent(marketId, noiseTime, baseVolatility) {
        const noise = this.perlinNoise.octaveNoise(noiseTime, 3, 0.5);
        return noise * baseVolatility * 0.15;
    }
    calculateGravityComponent(currentPrice, gravity) {
        const divergence = ((gravity.price - currentPrice) / currentPrice) * 100;
        return divergence * gravity.strength * 0.2;
    }
    applyGBM(currentPrice, drift, volatility) {
        const dt = 1 / 86400;
        const dW = this.randomNormal() * Math.sqrt(dt);
        const priceChange = currentPrice * (drift * dt + volatility * dW);
        return currentPrice + priceChange;
    }
    randomNormal() {
        let u = 0, v = 0;
        while (u === 0)
            u = Math.random();
        while (v === 0)
            v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    resetNoise(marketId) {
        this.noiseOffset.set(marketId, Math.random() * 10000);
    }
    getNoiseTime(marketId) {
        return this.noiseOffset.get(marketId) || 0;
    }
}
exports.VolatilityEngine = VolatilityEngine;
exports.default = VolatilityEngine;
