"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCopyTradingTransaction = createCopyTradingTransaction;
exports.getCopyTradingSettings = getCopyTradingSettings;
exports.leaderOffersMarketType = leaderOffersMarketType;
exports.checkCopyTypeAvailability = checkCopyTypeAvailability;
exports.createAuditLog = createAuditLog;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
async function createCopyTradingTransaction(data, transaction) {
    if (!data.currency) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Currency is required for createCopyTradingTransaction" });
    }
    return db_1.models.copyTradingTransaction.create({
        userId: data.userId,
        leaderId: data.leaderId,
        followerId: data.followerId,
        tradeId: data.tradeId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        fee: data.fee || 0,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        description: data.description,
        status: "COMPLETED",
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    }, transaction ? { transaction } : undefined);
}
const DEFAULT_SETTINGS = {
    enabled: true,
    maintenanceMode: false,
    enableSpot: true,
    enableBinary: true,
    binaryMaxStake: 0,
    requireKYC: false,
    platformFeePercent: 2,
    minLeaderTrades: 0,
    minLeaderWinRate: 0,
    minLeaderAccountAge: 0,
    maxLeadersPerFollower: 10,
    minAllocationAmount: 50,
    maxAllocationPercent: 50,
    maxFollowersPerLeader: 1000,
    maxProfitSharePercent: 50,
    maxCopyLatencyMs: 5000,
    enableMarketOrders: true,
    enableLimitOrders: true,
    maxDailyLossDefault: 20,
    maxPositionDefault: 20,
    enableAutoRetry: true,
    maxRetryAttempts: 3,
    enableProfitShare: true,
    leaderApplicationRateLimit: 10,
};
function parseBool(value, defaultValue) {
    if (value === undefined || value === null)
        return defaultValue;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }
    return Boolean(value);
}
function parseNum(value, defaultValue) {
    if (value === undefined || value === null)
        return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
}
async function getCopyTradingSettings() {
    const cacheManager = cache_1.CacheManager.getInstance();
    const globalSettings = await cacheManager.getSettings();
    return {
        enabled: parseBool(globalSettings.get("copyTradingEnabled"), DEFAULT_SETTINGS.enabled),
        maintenanceMode: parseBool(globalSettings.get("copyTradingMaintenanceMode"), DEFAULT_SETTINGS.maintenanceMode),
        enableSpot: parseBool(globalSettings.get("copyTradingEnableSpot"), DEFAULT_SETTINGS.enableSpot),
        enableBinary: parseBool(globalSettings.get("copyTradingEnableBinary"), DEFAULT_SETTINGS.enableBinary),
        binaryMaxStake: parseNum(globalSettings.get("copyTradingBinaryMaxStake"), DEFAULT_SETTINGS.binaryMaxStake),
        requireKYC: parseBool(globalSettings.get("copyTradingRequireKYC"), DEFAULT_SETTINGS.requireKYC),
        platformFeePercent: parseNum(globalSettings.get("copyTradingPlatformFeePercent"), DEFAULT_SETTINGS.platformFeePercent),
        minLeaderTrades: parseNum(globalSettings.get("copyTradingMinLeaderTrades"), DEFAULT_SETTINGS.minLeaderTrades),
        minLeaderWinRate: parseNum(globalSettings.get("copyTradingMinLeaderWinRate"), DEFAULT_SETTINGS.minLeaderWinRate),
        minLeaderAccountAge: parseNum(globalSettings.get("copyTradingMinLeaderAccountAge"), DEFAULT_SETTINGS.minLeaderAccountAge),
        maxLeadersPerFollower: parseNum(globalSettings.get("copyTradingMaxLeadersPerFollower"), DEFAULT_SETTINGS.maxLeadersPerFollower),
        minAllocationAmount: parseNum(globalSettings.get("copyTradingMinAllocationAmount"), DEFAULT_SETTINGS.minAllocationAmount),
        maxAllocationPercent: parseNum(globalSettings.get("copyTradingMaxAllocationPercent"), DEFAULT_SETTINGS.maxAllocationPercent),
        maxFollowersPerLeader: parseNum(globalSettings.get("copyTradingMaxFollowersPerLeader"), DEFAULT_SETTINGS.maxFollowersPerLeader),
        maxProfitSharePercent: parseNum(globalSettings.get("copyTradingMaxProfitSharePercent"), DEFAULT_SETTINGS.maxProfitSharePercent),
        maxCopyLatencyMs: parseNum(globalSettings.get("copyTradingMaxCopyLatencyMs"), DEFAULT_SETTINGS.maxCopyLatencyMs),
        enableMarketOrders: parseBool(globalSettings.get("copyTradingEnableMarketOrders"), DEFAULT_SETTINGS.enableMarketOrders),
        enableLimitOrders: parseBool(globalSettings.get("copyTradingEnableLimitOrders"), DEFAULT_SETTINGS.enableLimitOrders),
        maxDailyLossDefault: parseNum(globalSettings.get("copyTradingMaxDailyLossDefault"), DEFAULT_SETTINGS.maxDailyLossDefault),
        maxPositionDefault: parseNum(globalSettings.get("copyTradingMaxPositionDefault"), DEFAULT_SETTINGS.maxPositionDefault),
        enableAutoRetry: parseBool(globalSettings.get("copyTradingEnableAutoRetry"), DEFAULT_SETTINGS.enableAutoRetry),
        maxRetryAttempts: parseNum(globalSettings.get("copyTradingMaxRetryAttempts"), DEFAULT_SETTINGS.maxRetryAttempts),
        enableProfitShare: parseBool(globalSettings.get("copyTradingEnableProfitShare"), DEFAULT_SETTINGS.enableProfitShare),
        leaderApplicationRateLimit: parseNum(globalSettings.get("copyTradingLeaderApplicationRateLimit"), DEFAULT_SETTINGS.leaderApplicationRateLimit),
    };
}
function leaderOffersMarketType(tradingType, marketType) {
    const t = tradingType || "SPOT";
    return t === "BOTH" || t === marketType;
}
async function checkCopyTypeAvailability(marketType) {
    const settings = await getCopyTradingSettings();
    if (marketType === "SPOT") {
        if (!settings.enableSpot) {
            return { available: false, reason: "Spot copy trading is currently disabled" };
        }
        return { available: true };
    }
    if (!settings.enableBinary) {
        return { available: false, reason: "Binary copy trading is currently disabled" };
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const binaryStatus = (await cacheManager.getSetting("binaryStatus")) === "true";
    if (!binaryStatus) {
        return {
            available: false,
            reason: "Binary trading is currently disabled on this platform",
        };
    }
    return { available: true };
}
async function createAuditLog(data, transaction) {
    return db_1.models.copyTradingAuditLog.create({
        ...data,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }, transaction ? { transaction } : undefined);
}
