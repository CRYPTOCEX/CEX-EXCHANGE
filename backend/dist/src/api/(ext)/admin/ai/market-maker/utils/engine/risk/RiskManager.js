"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
const console_1 = require("@b/utils/console");
const VolatilityMonitor_1 = require("./VolatilityMonitor");
const LossProtection_1 = require("./LossProtection");
const CircuitBreaker_1 = require("./CircuitBreaker");
const cache_1 = require("@b/utils/cache");
function isSettingTrue(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string") {
        const v = value.trim().toLowerCase();
        return v === "true" || v === "1" || v === "yes" || v === "on";
    }
    return false;
}
function isSettingFalse(value) {
    if (value === null || value === undefined || value === "")
        return false;
    if (typeof value === "boolean")
        return !value;
    if (typeof value === "number")
        return value === 0;
    if (typeof value === "string") {
        const v = value.trim().toLowerCase();
        return v === "false" || v === "0" || v === "no" || v === "off";
    }
    return false;
}
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
                riskLevel: await this.calculateOverallRiskLevel(),
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
        var _a;
        var _b, _c;
        await this.lossProtection.recordTrade(marketId, pnl, isLoss);
        if (!isLoss)
            return;
        const maxDailyLossPercent = (_b = (_a = this.globalSettings) === null || _a === void 0 ? void 0 : _a.maxDailyLossPercent) !== null && _b !== void 0 ? _b : 10;
        const globalCheck = await this.lossProtection.checkGlobalLoss(maxDailyLossPercent);
        if (!globalCheck.canTrade) {
            this.circuitBreaker.trip((_c = globalCheck.reason) !== null && _c !== void 0 ? _c : "Global daily loss limit reached");
            return;
        }
        if (await this.lossProtection.shouldStopTrading(marketId)) {
            const lossPercent = await this.lossProtection.getMarketLoss(marketId);
            console_1.logger.warn("RISK_MANAGER", `Market ${marketId} down ${lossPercent.toFixed(2)}% today; requesting pause`);
            await this.pauseMarketForLoss(marketId, lossPercent);
        }
    }
    async pauseMarketForLoss(marketId, lossPercent) {
        try {
            const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
            const maker = await models.aiMarketMaker.findOne({ where: { marketId } });
            if (!maker)
                return;
            await models.aiMarketMaker.update({ status: "PAUSED" }, { where: { id: maker.id } });
            await models.aiMarketMakerHistory.create({
                marketMakerId: maker.id,
                action: "AUTO_PAUSE",
                details: {
                    reason: `Daily loss ${lossPercent.toFixed(2)}% exceeded market limit`,
                    triggeredBy: "SYSTEM",
                },
                priceAtAction: 0,
                poolValueAtAction: 0,
            });
        }
        catch (error) {
            console_1.logger.error("RISK_MANAGER", `Failed to pause market ${marketId} for loss`, error);
        }
    }
    tripCircuitBreaker(reason) {
        this.circuitBreaker.trip(reason);
    }
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }
    async getRiskLevel() {
        return this.calculateOverallRiskLevel();
    }
    async getStats() {
        return {
            riskLevel: await this.calculateOverallRiskLevel(),
            circuitBreakerStatus: this.circuitBreaker.isTripped() ? "TRIPPED" : "OK",
            globalVolatility: this.volatilityMonitor.getGlobalVolatility(),
            globalLossPercent: await this.lossProtection.getGlobalLossPercent(),
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
                tradingEnabled: !isSettingFalse(tradingEnabled),
                maintenanceMode: isSettingTrue(maintenanceMode),
                globalPauseEnabled: isSettingTrue(globalPauseEnabled),
                stopLossEnabled: !isSettingFalse(stopLossEnabled),
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
    async calculateOverallRiskLevel() {
        if (this.circuitBreaker.isTripped()) {
            return "CRITICAL";
        }
        const globalLoss = await this.lossProtection.getGlobalLossPercent();
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
