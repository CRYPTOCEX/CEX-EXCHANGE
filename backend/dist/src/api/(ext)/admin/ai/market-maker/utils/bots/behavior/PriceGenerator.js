"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceGenerator = void 0;
class PriceGenerator {
    constructor() {
        this.psychologicalEndings = {
            "0.00": 0.25,
            "0.50": 0.15,
            "0.25": 0.08,
            "0.75": 0.08,
            "0.99": 0.10,
            "0.01": 0.08,
            "0.95": 0.06,
            "0.05": 0.06,
            random: 0.14,
        };
        this.keyLevels = new Map();
        this.priceHistory = [];
    }
    generateBuyPrice(currentPrice, options = {}) {
        const { aggressiveness = 0.5, preferPsychological = true, nearSupport } = options;
        const baseDiscount = 0.001 + (1 - aggressiveness) * 0.005;
        let price = currentPrice * (1 - baseDiscount);
        if (nearSupport && Math.abs(price - nearSupport) / price < 0.02) {
            price = nearSupport * (1 + Math.random() * 0.002);
        }
        if (preferPsychological) {
            price = this.applyPsychologicalPricing(price);
        }
        price = this.addImprecision(price);
        return price;
    }
    generateSellPrice(currentPrice, options = {}) {
        const { aggressiveness = 0.5, preferPsychological = true, nearResistance } = options;
        const basePremium = 0.001 + (1 - aggressiveness) * 0.005;
        let price = currentPrice * (1 + basePremium);
        if (nearResistance && Math.abs(price - nearResistance) / price < 0.02) {
            price = nearResistance * (1 - Math.random() * 0.002);
        }
        if (preferPsychological) {
            price = this.applyPsychologicalPricing(price);
        }
        price = this.addImprecision(price);
        return price;
    }
    generateStopLossPrice(entryPrice, side, riskPercent = 0.02) {
        let stopPrice;
        if (side === "BUY") {
            stopPrice = entryPrice * (1 - riskPercent);
        }
        else {
            stopPrice = entryPrice * (1 + riskPercent);
        }
        return this.roundToPsychologicalLevel(stopPrice);
    }
    generateTakeProfitPrice(entryPrice, side, rewardPercent = 0.04) {
        let targetPrice;
        if (side === "BUY") {
            targetPrice = entryPrice * (1 + rewardPercent);
        }
        else {
            targetPrice = entryPrice * (1 - rewardPercent);
        }
        return this.roundToPsychologicalLevel(targetPrice);
    }
    isPsychologicalLevel(price) {
        const decimals = price % 1;
        const psychLevels = [0, 0.25, 0.5, 0.75, 0.99, 0.01, 0.05, 0.95];
        for (const level of psychLevels) {
            if (Math.abs(decimals - level) < 0.01) {
                return true;
            }
        }
        const nearestRound = Math.round(price);
        if (Math.abs(price - nearestRound) / price < 0.005) {
            return true;
        }
        return false;
    }
    findNearestPsychLevel(price, direction) {
        const whole = Math.floor(price);
        const decimal = price - whole;
        const levels = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1.0];
        let nearest = levels[0];
        let minDiff = Math.abs(decimal - nearest);
        for (const level of levels) {
            const diff = Math.abs(decimal - level);
            if (direction === "NEAREST" && diff < minDiff) {
                nearest = level;
                minDiff = diff;
            }
            else if (direction === "UP" && level > decimal && diff < minDiff) {
                nearest = level;
                minDiff = diff;
            }
            else if (direction === "DOWN" && level < decimal && diff < minDiff) {
                nearest = level;
                minDiff = diff;
            }
        }
        return whole + nearest;
    }
    addKeyLevel(symbol, price) {
        if (!this.keyLevels.has(symbol)) {
            this.keyLevels.set(symbol, []);
        }
        const levels = this.keyLevels.get(symbol);
        if (!levels.includes(price)) {
            levels.push(price);
            levels.sort((a, b) => a - b);
        }
        if (levels.length > 20) {
            levels.shift();
        }
    }
    getNearestKeyLevel(symbol, currentPrice, direction) {
        const levels = this.keyLevels.get(symbol) || [];
        if (direction === "SUPPORT") {
            const supports = levels.filter((l) => l < currentPrice);
            return supports.length > 0 ? Math.max(...supports) : null;
        }
        else {
            const resistances = levels.filter((l) => l > currentPrice);
            return resistances.length > 0 ? Math.min(...resistances) : null;
        }
    }
    recordPrice(price) {
        this.priceHistory.push({ price, timestamp: Date.now() });
        if (this.priceHistory.length > 1000) {
            this.priceHistory.shift();
        }
        this.detectKeyLevels();
    }
    applyPsychologicalPricing(price) {
        const random = Math.random();
        let cumulative = 0;
        for (const [ending, weight] of Object.entries(this.psychologicalEndings)) {
            cumulative += weight;
            if (random < cumulative) {
                if (ending === "random") {
                    return price;
                }
                return this.applyEnding(price, ending);
            }
        }
        return price;
    }
    applyEnding(price, ending) {
        const whole = Math.floor(price);
        const targetDecimal = parseFloat(ending);
        const currentDecimal = price - whole;
        if (currentDecimal < targetDecimal) {
            return whole + targetDecimal;
        }
        else if (ending === "0.00") {
            return currentDecimal < 0.5 ? whole : whole + 1;
        }
        else {
            return whole + targetDecimal;
        }
    }
    roundToPsychologicalLevel(price) {
        const levels = [0, 0.25, 0.5, 0.75, 1.0];
        const whole = Math.floor(price);
        const decimal = price - whole;
        let nearest = levels[0];
        let minDiff = Math.abs(decimal - nearest);
        for (const level of levels) {
            const diff = Math.abs(decimal - level);
            if (diff < minDiff) {
                nearest = level;
                minDiff = diff;
            }
        }
        return whole + nearest;
    }
    addImprecision(price) {
        const imprecision = (Math.random() - 0.5) * 0.001;
        return price * (1 + imprecision);
    }
    detectKeyLevels() {
        if (this.priceHistory.length < 100)
            return;
        const recentPrices = this.priceHistory.slice(-100).map((p) => p.price);
        const bucketSize = (Math.max(...recentPrices) - Math.min(...recentPrices)) / 20;
        if (bucketSize <= 0)
            return;
        const buckets = new Map();
        for (const price of recentPrices) {
            const bucket = Math.floor(price / bucketSize) * bucketSize;
            buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
        }
        const threshold = recentPrices.length / 10;
        for (const [level, count] of buckets.entries()) {
            if (count >= threshold) {
                this.addKeyLevel("default", level + bucketSize / 2);
            }
        }
    }
    getStats() {
        const recent = this.priceHistory.slice(-100);
        return {
            priceCount: this.priceHistory.length,
            keyLevelCount: Array.from(this.keyLevels.values()).flat().length,
            recentRange: recent.length > 0
                ? {
                    high: Math.max(...recent.map((p) => p.price)),
                    low: Math.min(...recent.map((p) => p.price)),
                }
                : null,
        };
    }
}
exports.PriceGenerator = PriceGenerator;
exports.default = PriceGenerator;
