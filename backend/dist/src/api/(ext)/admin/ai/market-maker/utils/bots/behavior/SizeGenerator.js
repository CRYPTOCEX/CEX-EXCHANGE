"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SizeGenerator = void 0;
class SizeGenerator {
    constructor(baseSize, minSize = 0.01, maxSize = 1000) {
        this.roundNumberWeights = {
            1: 0.15,
            5: 0.25,
            10: 0.30,
            25: 0.10,
            50: 0.10,
            100: 0.08,
            1000: 0.02,
        };
        this.positionHistory = [];
        this.baseSize = baseSize;
        this.minSize = minSize;
        this.maxSize = maxSize;
    }
    generateSize(options = {}) {
        const { confidence = 0.5, urgency = 0.5, preferRound = true } = options;
        let size = this.baseSize;
        size *= 0.5 + confidence;
        if (urgency > 0.7) {
            size *= 1 + (urgency - 0.7) * 2;
        }
        size *= 0.7 + Math.random() * 0.6;
        if (preferRound) {
            size = this.roundToHumanNumber(size);
        }
        size = Math.max(this.minSize, Math.min(this.maxSize, size));
        return size;
    }
    generateScalingSize(targetTotalSize, currentPosition, direction) {
        const remaining = Math.abs(targetTotalSize - currentPosition);
        if (remaining <= 0) {
            return 0;
        }
        let sizeFraction;
        if (direction === "IN") {
            const progress = currentPosition / targetTotalSize;
            sizeFraction = 0.1 + progress * 0.2 + Math.random() * 0.1;
        }
        else {
            const progress = 1 - currentPosition / targetTotalSize;
            sizeFraction = 0.3 - progress * 0.15 + Math.random() * 0.1;
        }
        let size = remaining * sizeFraction;
        size = this.roundToHumanNumber(size);
        return Math.max(this.minSize, size);
    }
    generateMarketAwareSize(volatility, volume, spread) {
        let size = this.baseSize;
        if (volatility > 0.5) {
            size *= 1 - (volatility - 0.5) * 0.5;
        }
        const volumeRatio = volume / (this.baseSize * 100);
        if (volumeRatio < 1) {
            size *= Math.max(0.5, volumeRatio);
        }
        if (spread > 0.001) {
            size *= Math.max(0.6, 1 - spread * 50);
        }
        size *= 0.8 + Math.random() * 0.4;
        return this.roundToHumanNumber(Math.max(this.minSize, size));
    }
    generateIcebergSizes(totalSize, visiblePercentage = 0.1) {
        const visible = totalSize * visiblePercentage;
        const hidden = totalSize - visible;
        const chunks = [];
        let remaining = hidden;
        while (remaining > this.minSize) {
            let chunk = remaining * (0.1 + Math.random() * 0.2);
            chunk = this.roundToHumanNumber(chunk);
            chunk = Math.min(chunk, remaining);
            if (chunk >= this.minSize) {
                chunks.push(chunk);
                remaining -= chunk;
            }
            else {
                break;
            }
        }
        if (remaining > 0 && chunks.length > 0) {
            chunks[chunks.length - 1] += remaining;
        }
        return {
            visible: this.roundToHumanNumber(visible),
            hidden,
            chunks,
        };
    }
    getSizeForBalance(balance, riskPercent = 0.02) {
        const maxRiskSize = balance * riskPercent;
        let size = maxRiskSize * (0.3 + Math.random() * 0.4);
        return this.roundToHumanNumber(Math.min(size, this.maxSize));
    }
    recordTrade(size, side) {
        this.positionHistory.push({
            size,
            side,
            timestamp: Date.now(),
        });
        if (this.positionHistory.length > 100) {
            this.positionHistory.shift();
        }
    }
    getAverageRecentSize(windowMs = 3600000) {
        const cutoff = Date.now() - windowMs;
        const recent = this.positionHistory.filter((t) => t.timestamp > cutoff);
        if (recent.length === 0) {
            return this.baseSize;
        }
        return recent.reduce((sum, t) => sum + t.size, 0) / recent.length;
    }
    roundToHumanNumber(size) {
        const magnitude = Math.floor(Math.log10(size));
        const base = Math.pow(10, magnitude);
        const normalized = size / base;
        const roundTargets = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10];
        let closest = roundTargets[0];
        let minDiff = Math.abs(normalized - closest);
        for (const target of roundTargets) {
            const diff = Math.abs(normalized - target);
            if (diff < minDiff) {
                minDiff = diff;
                closest = target;
            }
        }
        if (Math.random() < 0.2) {
            return size;
        }
        return closest * base;
    }
    generateWithDistribution(distribution) {
        let size;
        switch (distribution) {
            case "UNIFORM":
                size = this.minSize + Math.random() * (this.maxSize - this.minSize);
                break;
            case "NORMAL":
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                size = this.baseSize + z * (this.baseSize * 0.3);
                break;
            case "SKEWED_SMALL":
                size = this.minSize + Math.pow(Math.random(), 2) * (this.maxSize - this.minSize);
                break;
            case "SKEWED_LARGE":
                size = this.minSize + Math.pow(Math.random(), 0.5) * (this.maxSize - this.minSize);
                break;
            default:
                size = this.baseSize;
        }
        return this.roundToHumanNumber(Math.max(this.minSize, Math.min(this.maxSize, size)));
    }
    getStats() {
        const buyTrades = this.positionHistory.filter((t) => t.side === "BUY");
        const sellTrades = this.positionHistory.filter((t) => t.side === "SELL");
        return {
            baseSize: this.baseSize,
            averageRecent: this.getAverageRecentSize(),
            tradeCount: this.positionHistory.length,
            buyVolume: buyTrades.reduce((sum, t) => sum + t.size, 0),
            sellVolume: sellTrades.reduce((sum, t) => sum + t.size, 0),
        };
    }
}
exports.SizeGenerator = SizeGenerator;
exports.default = SizeGenerator;
