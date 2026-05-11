"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolatilityMonitor = void 0;
const queries_1 = require("../../scylla/queries");
class VolatilityMonitor {
    constructor() {
        this.volatilityCache = new Map();
        this.globalVolatility = 0;
        this.cacheTtlMs = 30000;
    }
    async getVolatility(marketId, minutesWindow = 60) {
        const cached = this.volatilityCache.get(marketId);
        if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTtlMs) {
            return cached.value;
        }
        try {
            const volatility = await (0, queries_1.calculateVolatility)(marketId, minutesWindow);
            this.volatilityCache.set(marketId, {
                value: volatility,
                timestamp: new Date(),
            });
            this.updateGlobalVolatility();
            return volatility;
        }
        catch (error) {
            return (cached === null || cached === void 0 ? void 0 : cached.value) || 0;
        }
    }
    getGlobalVolatility() {
        return this.globalVolatility;
    }
    async isVolatilityHigh(marketId, threshold) {
        const volatility = await this.getVolatility(marketId);
        return volatility > threshold;
    }
    async getMultiTimeframeVolatility(marketId) {
        const [min1, min5, min15, hour1] = await Promise.all([
            (0, queries_1.calculateVolatility)(marketId, 1),
            (0, queries_1.calculateVolatility)(marketId, 5),
            (0, queries_1.calculateVolatility)(marketId, 15),
            (0, queries_1.calculateVolatility)(marketId, 60),
        ]);
        return { min1, min5, min15, hour1 };
    }
    updateGlobalVolatility() {
        if (this.volatilityCache.size === 0) {
            this.globalVolatility = 0;
            return;
        }
        let sum = 0;
        let count = 0;
        for (const [, cached] of this.volatilityCache) {
            if (Date.now() - cached.timestamp.getTime() < this.cacheTtlMs * 2) {
                sum += cached.value;
                count++;
            }
        }
        this.globalVolatility = count > 0 ? sum / count : 0;
    }
    clearCache(marketId) {
        if (marketId) {
            this.volatilityCache.delete(marketId);
        }
        else {
            this.volatilityCache.clear();
        }
        this.updateGlobalVolatility();
    }
}
exports.VolatilityMonitor = VolatilityMonitor;
exports.default = VolatilityMonitor;
