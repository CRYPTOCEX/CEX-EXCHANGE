"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanSimulator = void 0;
const TimingGenerator_1 = require("./TimingGenerator");
const SizeGenerator_1 = require("./SizeGenerator");
const PriceGenerator_1 = require("./PriceGenerator");
class HumanSimulator {
    constructor(baseOrderSize, traits = {}) {
        this.emotionalState = {
            fear: 0.3,
            greed: 0.3,
            confidence: 0.5,
            frustration: 0.2,
        };
        this.recentTrades = [];
        this.traits = {
            patience: 0.5,
            riskTolerance: 0.5,
            precision: 0.5,
            consistency: 0.5,
            emotionality: 0.5,
            ...traits,
        };
        this.timingGenerator = new TimingGenerator_1.TimingGenerator(this.calculateBaseDelay(), this.calculateMaxDelay());
        this.sizeGenerator = new SizeGenerator_1.SizeGenerator(baseOrderSize, baseOrderSize * 0.1, baseOrderSize * 5);
        this.priceGenerator = new PriceGenerator_1.PriceGenerator();
    }
    generateOrder(side, currentPrice, baseSize, options = {}) {
        const { urgency = 0.5, marketVolatility = 0.3, recentVolume = 1, nearSupport, nearResistance, } = options;
        const emotionalUrgency = this.calculateEmotionalUrgency(urgency);
        const emotionalConfidence = this.calculateEmotionalConfidence();
        const delay = this.generateDelay(emotionalUrgency);
        const size = this.generateSize(baseSize, emotionalConfidence, marketVolatility);
        const price = this.generatePrice(side, currentPrice, emotionalUrgency, side === "BUY" ? nearSupport : nearResistance);
        const shouldSplit = this.shouldSplitOrder(size, baseSize, emotionalConfidence);
        const splitCount = shouldSplit ? this.calculateSplitCount(size, baseSize) : undefined;
        return {
            price,
            size,
            delay,
            shouldSplit,
            splitCount,
            urgency: emotionalUrgency,
            confidence: emotionalConfidence,
        };
    }
    processMarketEvent(event, magnitude = 0.5) {
        const emotionalResponse = magnitude * this.traits.emotionality;
        switch (event) {
            case "PRICE_SPIKE_UP":
                this.emotionalState.greed += emotionalResponse * 0.3;
                this.emotionalState.fear -= emotionalResponse * 0.1;
                break;
            case "PRICE_SPIKE_DOWN":
                this.emotionalState.fear += emotionalResponse * 0.3;
                this.emotionalState.greed -= emotionalResponse * 0.1;
                break;
            case "HIGH_VOLUME":
                this.emotionalState.confidence += emotionalResponse * 0.2;
                break;
            case "LOW_VOLUME":
                this.emotionalState.confidence -= emotionalResponse * 0.2;
                break;
            case "SPREAD_WIDENING":
                this.emotionalState.fear += emotionalResponse * 0.2;
                this.emotionalState.frustration += emotionalResponse * 0.1;
                break;
            case "TREND_REVERSAL":
                this.emotionalState.fear += emotionalResponse * 0.2;
                this.emotionalState.confidence -= emotionalResponse * 0.2;
                break;
            case "BREAKOUT":
                this.emotionalState.greed += emotionalResponse * 0.2;
                this.emotionalState.confidence += emotionalResponse * 0.1;
                break;
            case "RANGE_BOUND":
                this.emotionalState.frustration += emotionalResponse * 0.1;
                break;
        }
        this.normalizeEmotions();
        this.decayEmotions();
    }
    recordTradeResult(side, success, pnl) {
        this.recentTrades.push({
            side,
            success,
            pnl,
            timestamp: Date.now(),
        });
        if (this.recentTrades.length > 50) {
            this.recentTrades.shift();
        }
        if (success && pnl > 0) {
            this.emotionalState.confidence += 0.05 * this.traits.emotionality;
            this.emotionalState.greed += 0.03 * this.traits.emotionality;
        }
        else {
            this.emotionalState.fear += 0.05 * this.traits.emotionality;
            this.emotionalState.frustration += 0.03 * this.traits.emotionality;
        }
        this.normalizeEmotions();
        this.sizeGenerator.recordTrade(Math.abs(pnl), side);
    }
    wouldTradeNow() {
        if (!this.timingGenerator.isGoodTimeToTrade()) {
            return Math.random() < 0.1;
        }
        if (this.emotionalState.fear > 0.7) {
            return Math.random() < 0.3;
        }
        if (this.emotionalState.frustration > 0.8) {
            return Math.random() < 0.2;
        }
        const tradeProb = 0.5 + (1 - this.traits.patience) * 0.3;
        return Math.random() < tradeProb;
    }
    getEmotionalState() {
        return { ...this.emotionalState };
    }
    getTraits() {
        return { ...this.traits };
    }
    getRecentWinRate() {
        if (this.recentTrades.length === 0)
            return 0.5;
        const wins = this.recentTrades.filter((t) => t.success).length;
        return wins / this.recentTrades.length;
    }
    resetEmotions() {
        this.emotionalState = {
            fear: 0.3,
            greed: 0.3,
            confidence: 0.5,
            frustration: 0.2,
        };
        this.timingGenerator.resetSession();
    }
    calculateBaseDelay() {
        const base = 1000;
        return base * (0.5 + this.traits.patience);
    }
    calculateMaxDelay() {
        return this.calculateBaseDelay() * 10;
    }
    generateDelay(urgency) {
        const baseDelay = this.timingGenerator.getNextDelay();
        const urgencyMultiplier = 1 - urgency * 0.5;
        let fearMultiplier = 1;
        if (this.emotionalState.fear > 0.6) {
            fearMultiplier = Math.random() < 0.5 ? 0.5 : 2;
        }
        const greedMultiplier = 1 - this.emotionalState.greed * 0.3;
        return Math.floor(baseDelay * urgencyMultiplier * fearMultiplier * greedMultiplier);
    }
    generateSize(baseSize, confidence, volatility) {
        let size = this.sizeGenerator.generateSize({
            confidence,
            urgency: this.emotionalState.greed,
            preferRound: this.traits.precision < 0.5,
        });
        size *= 0.7 + this.traits.riskTolerance * 0.6;
        size *= 1 - this.emotionalState.fear * 0.3;
        size *= 1 + this.emotionalState.greed * 0.2;
        if (volatility > 0.5 && this.traits.riskTolerance < 0.5) {
            size *= 0.7;
        }
        return Math.max(baseSize * 0.1, size);
    }
    generatePrice(side, currentPrice, urgency, keyLevel) {
        const preferPsychological = this.traits.precision < 0.5;
        if (side === "BUY") {
            return this.priceGenerator.generateBuyPrice(currentPrice, {
                aggressiveness: urgency * (1 + this.emotionalState.greed * 0.5),
                preferPsychological,
                nearSupport: keyLevel,
            });
        }
        else {
            return this.priceGenerator.generateSellPrice(currentPrice, {
                aggressiveness: urgency * (1 + this.emotionalState.fear * 0.5),
                preferPsychological,
                nearResistance: keyLevel,
            });
        }
    }
    shouldSplitOrder(size, baseSize, confidence) {
        if (size > baseSize * 3) {
            return Math.random() < 0.7;
        }
        if (confidence < 0.3) {
            return Math.random() < 0.5;
        }
        if (this.traits.patience > 0.7) {
            return Math.random() < 0.4;
        }
        return Math.random() < 0.2;
    }
    calculateSplitCount(size, baseSize) {
        const ratio = size / baseSize;
        if (ratio > 5)
            return Math.floor(3 + Math.random() * 3);
        if (ratio > 3)
            return Math.floor(2 + Math.random() * 2);
        return 2;
    }
    calculateEmotionalUrgency(baseUrgency) {
        let urgency = baseUrgency;
        urgency += this.emotionalState.greed * 0.2;
        if (this.emotionalState.fear > 0.5) {
            urgency += (Math.random() - 0.5) * 0.4;
        }
        urgency += this.emotionalState.frustration * 0.15;
        return Math.max(0, Math.min(1, urgency));
    }
    calculateEmotionalConfidence() {
        let confidence = this.emotionalState.confidence;
        const winRate = this.getRecentWinRate();
        confidence = confidence * 0.7 + winRate * 0.3;
        confidence -= this.emotionalState.fear * 0.3;
        confidence += this.emotionalState.greed * 0.1;
        return Math.max(0, Math.min(1, confidence));
    }
    normalizeEmotions() {
        this.emotionalState.fear = Math.max(0, Math.min(1, this.emotionalState.fear));
        this.emotionalState.greed = Math.max(0, Math.min(1, this.emotionalState.greed));
        this.emotionalState.confidence = Math.max(0, Math.min(1, this.emotionalState.confidence));
        this.emotionalState.frustration = Math.max(0, Math.min(1, this.emotionalState.frustration));
    }
    decayEmotions() {
        const decayRate = 0.95;
        const baseline = 0.3;
        this.emotionalState.fear =
            baseline + (this.emotionalState.fear - baseline) * decayRate;
        this.emotionalState.greed =
            baseline + (this.emotionalState.greed - baseline) * decayRate;
        this.emotionalState.confidence =
            0.5 + (this.emotionalState.confidence - 0.5) * decayRate;
        this.emotionalState.frustration =
            0.2 + (this.emotionalState.frustration - 0.2) * decayRate;
    }
    getStats() {
        return {
            traits: this.traits,
            emotions: this.getEmotionalState(),
            recentTrades: this.recentTrades.length,
            winRate: this.getRecentWinRate(),
            timing: this.timingGenerator.getStats(),
            sizing: this.sizeGenerator.getStats(),
            pricing: this.priceGenerator.getStats(),
        };
    }
}
exports.HumanSimulator = HumanSimulator;
exports.default = HumanSimulator;
