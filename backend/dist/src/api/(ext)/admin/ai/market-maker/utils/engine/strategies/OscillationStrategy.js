"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OscillationStrategy = void 0;
class OscillationStrategy {
    constructor() {
        this.name = "oscillation";
        this.phases = new Map();
        this.lastUpdate = new Map();
    }
    calculate(currentPrice, targetPrice, config) {
        const current = Number(currentPrice) / 1e18;
        const target = Number(targetPrice) / 1e18;
        const phaseKey = `${current}_${target}`;
        let phase = this.phases.get(phaseKey) || Math.random() * Math.PI * 2;
        const lastTime = this.lastUpdate.get(phaseKey) || Date.now();
        const elapsed = Date.now() - lastTime;
        const phaseIncrement = this.getPhaseIncrement(config.aggressionLevel);
        phase += (elapsed / 1000) * phaseIncrement;
        this.phases.set(phaseKey, phase);
        this.lastUpdate.set(phaseKey, Date.now());
        const amplitude = this.getAmplitude(config.aggressionLevel);
        const oscillation = Math.sin(phase) * amplitude;
        const noise = (Math.random() - 0.5) * amplitude * 0.2;
        const direction = oscillation + noise > 0 ? "BUY" : "SELL";
        const priceAdjustment = Math.abs(oscillation + noise);
        const rangeLow = config.priceRangeLow;
        const rangeHigh = config.priceRangeHigh;
        if (current <= rangeLow * 1.02 && direction === "SELL") {
            return {
                shouldTrade: true,
                direction: "BUY",
                priceAdjustment: amplitude,
                sizeMultiplier: 1.2,
                confidence: 0.8,
                reason: "Near lower range boundary, pushing up",
            };
        }
        if (current >= rangeHigh * 0.98 && direction === "BUY") {
            return {
                shouldTrade: true,
                direction: "SELL",
                priceAdjustment: amplitude,
                sizeMultiplier: 1.2,
                confidence: 0.8,
                reason: "Near upper range boundary, pushing down",
            };
        }
        const confidence = Math.abs(Math.sin(phase)) * 0.8;
        return {
            shouldTrade: true,
            direction,
            priceAdjustment,
            sizeMultiplier: 0.8,
            confidence,
            reason: `Oscillation ${direction} (phase: ${(phase % (Math.PI * 2)).toFixed(2)})`,
        };
    }
    getAmplitude(aggression) {
        switch (aggression) {
            case "AGGRESSIVE":
                return 0.3;
            case "MODERATE":
                return 0.15;
            case "CONSERVATIVE":
            default:
                return 0.08;
        }
    }
    getPhaseIncrement(aggression) {
        switch (aggression) {
            case "AGGRESSIVE":
                return 0.5;
            case "MODERATE":
                return 0.3;
            case "CONSERVATIVE":
            default:
                return 0.15;
        }
    }
}
exports.OscillationStrategy = OscillationStrategy;
exports.default = OscillationStrategy;
