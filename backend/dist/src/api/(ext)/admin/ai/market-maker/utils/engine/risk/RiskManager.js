"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
const console_1 = require("@b/utils/console");
const VolatilityMonitor_1 = require("./VolatilityMonitor");
const LossProtection_1 = require("./LossProtection");
const CircuitBreaker_1 = require("./CircuitBreaker");
const cache_1 = require("@b/utils/cache");
class RiskManager {
    constructor(engine) {
        this.globalSettings = null;
        this.lastSettingsLoad = null;
        this.settingsRefreshIntervalMs = 60000;
        this.engine = engine;
        this.volatilityMonitor = new VolatilityMonitor_1.VolatilityMonitor();
        this.lossProtection = new LossProtection_1.LossProtection();
        this.circuitBreaker = new CircuitBreaker_1.CircuitBreaker();
    }
    async checkGlobalRisk() {
        var _a, _b, _c, _d;
        try {
            await this.refreshSettings();
            if (this.globalSettings && !this.globalSettings.tradingEnabled) {
                return {
                    canTrade: false,
                    reason: "Trading is disabled globally",
                    riskLevel: "CRITICAL",
                };
            }
            if ((_a = this.globalSettings) === null || _a === void 0 ? void 0 : _a.maintenanceMode) {
                return {
                    canTrade: false,
                    reason: "System is in maintenance mode",
                    riskLevel: "CRITICAL",
                };
            }
            if ((_b = this.globalSettings) === null || _b === void 0 ? void 0 : _b.globalPauseEnabled) {
                return {
                    canTrade: false,
                    reason: "Global pause is enabled",
                    riskLevel: "HIGH",
                };
            }
            if (this.circuitBreaker.isTripped()) {
                return {
                    canTrade: false,
                    reason: this.circuitBreaker.getTripReason(),
                    riskLevel: "CRITICAL",
                };
            }
            if (((_c = this.globalSettings) === null || _c === void 0 ? void 0 : _c.stopLossEnabled) !== false) {
                const lossCheck = await this.lossProtection.checkGlobalLoss(((_d = this.globalSettings) === null || _d === void 0 ? void 0 : _d.maxDailyLossPercent) || 10);
                if (!lossCheck.canTrade) {
                    return {
                        canTrade: false,
                        reason: lossCheck.reason,
                        riskLevel: "HIGH",
                    };
                }
            }
            return {
                canTrade: true,
                riskLevel: this.calculateOverallRiskLevel(),
            };
        }
        catch (error) {
            console_1.logger.error("RISK_MANAGER", "Risk check failed", error);
            return {
                canTrade: false,
                reason: "Risk check failed",
                riskLevel: "HIGH",
            };
        }
    }
    async assessTradeRisk(marketId, side, amount, price) {
        var _a;
        try {
            const volatility = await this.volatilityMonitor.getVolatility(marketId);
            const threshold = ((_a = this.globalSettings) === null || _a === void 0 ? void 0 : _a.defaultVolatilityThreshold) || 5;
            if (volatility > threshold * 2) {
                return {
                    approved: false,
                    reason: `Extreme volatility: ${volatility.toFixed(2)}%`,
                };
            }
            if (volatility > threshold) {
                const reductionFactor = Math.max(0.5, 1 - (volatility - threshold) / threshold);
                return {
                    approved: true,
                    adjustedAmount: BigInt(Math.floor(Number(amount) * reductionFactor)),
                    reason: `Reduced size due to volatility: ${volatility.toFixed(2)}%`,
                };
            }
            const marketLoss = await this.lossProtection.getMarketLoss(marketId);
            if (marketLoss > 5) {
                return {
                    approved: false,
                    reason: `Market loss limit exceeded: ${marketLoss.toFixed(2)}%`,
                };
            }
            return { approved: true };
        }
        catch (error) {
            console_1.logger.error("RISK_MANAGER", "Trade assessment failed", error);
            return {
                approved: false,
                reason: "Trade assessment failed",
            };
        }
    }
    async reportTradeResult(marketId, pnl, isLoss) {
        await this.lossProtection.recordTrade(marketId, pnl, isLoss);
        if (isLoss) {
            const consecutiveLosses = this.lossProtection.getConsecutiveLosses(marketId);
            if (consecutiveLosses >= 5) {
                this.circuitBreaker.trip(`5 consecutive losses on market ${marketId}`);
            }
        }
    }
    tripCircuitBreaker(reason) {
        this.circuitBreaker.trip(reason);
    }
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }
    getRiskLevel() {
        return this.calculateOverallRiskLevel();
    }
    getStats() {
        return {
            riskLevel: this.calculateOverallRiskLevel(),
            circuitBreakerStatus: this.circuitBreaker.isTripped() ? "TRIPPED" : "OK",
            globalVolatility: this.volatilityMonitor.getGlobalVolatility(),
            globalLossPercent: this.lossProtection.getGlobalLossPercent(),
        };
    }
    async refreshSettings() {
        if (this.lastSettingsLoad &&
            Date.now() - this.lastSettingsLoad.getTime() < this.settingsRefreshIntervalMs) {
            return;
        }
        try {
            const cacheManager = cache_1.CacheManager.getInstance();
            const [tradingEnabled, globalPauseEnabled, maintenanceMode, maxDailyLossPercent, defaultVolatilityThreshold, stopLossEnabled,] = await Promise.all([
                cacheManager.getSetting("aiMarketMakerEnabled"),
                cacheManager.getSetting("aiMarketMakerGlobalPauseEnabled"),
                cacheManager.getSetting("aiMarketMakerMaintenanceMode"),
                cacheManager.getSetting("aiMarketMakerMaxDailyLossPercent"),
                cacheManager.getSetting("aiMarketMakerDefaultVolatilityThreshold"),
                cacheManager.getSetting("aiMarketMakerStopLossEnabled"),
            ]);
            this.globalSettings = {
                maxDailyLossPercent: parseFloat(maxDailyLossPercent) || 5,
                defaultVolatilityThreshold: parseFloat(defaultVolatilityThreshold) || 10,
                tradingEnabled: tradingEnabled !== false,
                maintenanceMode: maintenanceMode === true,
                globalPauseEnabled: globalPauseEnabled === true,
                stopLossEnabled: stopLossEnabled !== false,
            };
            this.lastSettingsLoad = new Date();
        }
        catch (error) {
            if (!this.globalSettings) {
                this.globalSettings = {
                    maxDailyLossPercent: 5,
                    defaultVolatilityThreshold: 10,
                    tradingEnabled: true,
                    maintenanceMode: false,
                    globalPauseEnabled: false,
                    stopLossEnabled: true,
                };
            }
        }
    }
    calculateOverallRiskLevel() {
        if (this.circuitBreaker.isTripped()) {
            return "CRITICAL";
        }
        const globalLoss = this.lossProtection.getGlobalLossPercent();
        const globalVol = this.volatilityMonitor.getGlobalVolatility();
        if (globalLoss > 8 || globalVol > 15) {
            return "HIGH";
        }
        if (globalLoss > 4 || globalVol > 8) {
            return "MEDIUM";
        }
        return "LOW";
    }
}
exports.RiskManager = RiskManager;
exports.default = RiskManager;
