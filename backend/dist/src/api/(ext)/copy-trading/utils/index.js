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
exports.copyTradingRateLimiters = exports.calculateRiskAdjustedReturn = exports.calculateAlpha = exports.calculateMonthlyPerformance = exports.calculateDailyReturns = exports.calculatePerformanceMetrics = exports.calculateExpectancy = exports.calculateProfitFactor = exports.calculateRollingVolatility = exports.calculateVolatility = exports.calculateStdDev = exports.calculateCurrentDrawdown = exports.calculateMaxDrawdown = exports.calculateSortinoRatio = exports.calculateSharpeRatio = exports.checkAutoActions = exports.getFollowerLimitStatus = exports.updateFollowerLimits = exports.resetFollowerDailyLimits = exports.recordLoss = exports.recordTrade = exports.getDailyStats = exports.checkDailyLimits = exports.previewProfitShare = exports.getFollowerProfitSharePayments = exports.getLeaderEarnings = exports.processPendingProfitDistributions = exports.calculateProfitShareBreakdown = exports.distributeProfitShare = exports.calculateUnrealizedPnL = exports.calculatePnL = exports.checkSlippageLimit = exports.calculateExpectedSlippage = exports.monitorTradeStopLevels = exports.checkStopLevels = exports.checkPositionSize = exports.cancelCopyOrder = exports.executeOrder = exports.handleOrderFilled = exports.closeLeaderTrade = exports.closeTrade = exports.FillMonitor = exports.calculateFollowerCopyAmount = exports.processCopyOrderWithRetry = exports.processCopyOrdersBatch = exports.processCopyOrder = exports.getLeaderInfo = exports.isActiveLeader = exports.handleOrderCreated = exports.LeaderTradeListener = void 0;
exports.notifyCopyTradingAdmins = exports.notifyProfitShareEvent = exports.notifyFollowerRiskEvent = exports.notifyFollowerTradeEvent = exports.notifyFollowerAllocationEvent = exports.notifyFollowerSubscriptionEvent = exports.notifyLeaderFollowerStopped = exports.notifyLeaderNewFollower = exports.notifyLeaderApplicationEvent = exports.throwValidationError = exports.validateSort = exports.validatePagination = exports.validateLeaderUpdate = exports.validateSubscriptionUpdate = exports.validateFundOperation = exports.validateFollowRequest = exports.validateLeaderApplication = exports.validateNumber = exports.sanitizeString = exports.isValidUUID = void 0;
exports.getLeaderById = getLeaderById;
exports.getLeaderByUserId = getLeaderByUserId;
exports.checkLeaderEligibility = checkLeaderEligibility;
exports.updateLeaderStats = updateLeaderStats;
exports.getFollowerById = getFollowerById;
exports.getFollowersByUserId = getFollowersByUserId;
exports.checkFollowEligibility = checkFollowEligibility;
exports.updateFollowerStats = updateFollowerStats;
exports.getUserWalletBalance = getUserWalletBalance;
exports.createCopyTradingTransaction = createCopyTradingTransaction;
exports.getCopyTradingSettings = getCopyTradingSettings;
exports.checkPlatformStatus = checkPlatformStatus;
exports.createAuditLog = createAuditLog;
exports.calculateProfitShare = calculateProfitShare;
exports.getLeaderRankings = getLeaderRankings;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const stats_calculator_1 = require("./stats-calculator");
async function getLeaderById(leaderId, includes = []) {
    const includeOptions = [];
    if (includes.includes("user")) {
        includeOptions.push({
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        });
    }
    if (includes.includes("followers")) {
        includeOptions.push({
            model: db_1.models.copyTradingFollower,
            as: "followers",
            where: { status: "ACTIVE" },
            required: false,
        });
    }
    return db_1.models.copyTradingLeader.findByPk(leaderId, {
        include: includeOptions,
    });
}
async function getLeaderByUserId(userId) {
    return db_1.models.copyTradingLeader.findOne({
        where: { userId },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
}
async function checkLeaderEligibility(userId) {
    var _a;
    const platformStatus = await checkPlatformStatus();
    if (!platformStatus.available) {
        return { eligible: false, reason: platformStatus.reason };
    }
    const existingLeader = await db_1.models.copyTradingLeader.findOne({
        where: { userId },
    });
    if (existingLeader) {
        if (existingLeader.status === "ACTIVE") {
            return { eligible: false, reason: "You are already an active leader" };
        }
        if (existingLeader.status === "PENDING") {
            return {
                eligible: false,
                reason: "Your leader application is pending review",
            };
        }
        if (existingLeader.status === "SUSPENDED") {
            return {
                eligible: false,
                reason: "Your leader account has been suspended",
            };
        }
    }
    const settings = await getCopyTradingSettings();
    if (settings.requireKYC) {
        const user = await db_1.models.user.findByPk(userId, {
            include: [
                {
                    model: db_1.models.kycApplication,
                    as: "kycApplications",
                    required: false,
                    include: [
                        {
                            model: db_1.models.kycLevel,
                            as: "level",
                        },
                    ],
                },
            ],
        });
        const approvedApps = ((_a = user === null || user === void 0 ? void 0 : user.kycApplications) === null || _a === void 0 ? void 0 : _a.filter((app) => app.status === "APPROVED")) || [];
        const hasApprovedKyc = approvedApps.length > 0;
        const kycLevel = hasApprovedKyc
            ? Math.max(...approvedApps.map((app) => { var _a, _b; return (_b = (_a = app.level) === null || _a === void 0 ? void 0 : _a.level) !== null && _b !== void 0 ? _b : 0; }))
            : 0;
        if (!hasApprovedKyc || kycLevel < 2) {
            return { eligible: false, reason: "KYC verification is required" };
        }
    }
    return { eligible: true };
}
async function updateLeaderStats(leaderId) {
    const { invalidateLeaderStatsCache } = await Promise.resolve().then(() => __importStar(require("./stats-calculator")));
    await invalidateLeaderStatsCache(leaderId);
}
async function getFollowerById(followerId, includes = []) {
    const includeOptions = [];
    if (includes.includes("user")) {
        includeOptions.push({
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        });
    }
    if (includes.includes("leader")) {
        includeOptions.push({
            model: db_1.models.copyTradingLeader,
            as: "leader",
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
            ],
        });
    }
    return db_1.models.copyTradingFollower.findByPk(followerId, {
        include: includeOptions,
    });
}
async function getFollowersByUserId(userId) {
    return db_1.models.copyTradingFollower.findAll({
        where: { userId },
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
        ],
    });
}
async function checkFollowEligibility(userId, leaderId, amount) {
    const platformStatus = await checkPlatformStatus();
    if (!platformStatus.available) {
        return { eligible: false, reason: platformStatus.reason };
    }
    const leader = await db_1.models.copyTradingLeader.findByPk(leaderId);
    if (!leader) {
        return { eligible: false, reason: "Leader not found" };
    }
    if (leader.status !== "ACTIVE") {
        return { eligible: false, reason: "Leader is not active" };
    }
    if (leader.userId === userId) {
        return { eligible: false, reason: "You cannot follow yourself" };
    }
    const existingFollow = await db_1.models.copyTradingFollower.findOne({
        where: { userId, leaderId, status: { [sequelize_1.Op.ne]: "STOPPED" } },
    });
    if (existingFollow) {
        return { eligible: false, reason: "You are already following this leader" };
    }
    const settings = await getCopyTradingSettings();
    const followerCount = await db_1.models.copyTradingFollower.count({
        where: { leaderId, status: "ACTIVE" },
    });
    const effectiveMaxFollowers = Math.min(leader.maxFollowers || settings.maxFollowersPerLeader, settings.maxFollowersPerLeader);
    if (followerCount >= effectiveMaxFollowers) {
        return { eligible: false, reason: "Leader has reached maximum followers" };
    }
    const userFollowCount = await db_1.models.copyTradingFollower.count({
        where: { userId, status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] } },
    });
    if (userFollowCount >= settings.maxLeadersPerFollower) {
        return {
            eligible: false,
            reason: `You can only follow up to ${settings.maxLeadersPerFollower} leaders`,
        };
    }
    return { eligible: true };
}
async function updateFollowerStats(followerId) {
    const { invalidateFollowerStatsCache } = await Promise.resolve().then(() => __importStar(require("./stats-calculator")));
    await invalidateFollowerStatsCache(followerId);
}
async function getUserWalletBalance(userId, currency) {
    var _a;
    if (!currency) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Currency is required for getUserWalletBalance" });
    }
    const wallet = await db_1.models.wallet.findOne({
        where: {
            userId,
            currency,
            type: "ECO",
        },
    });
    if (!wallet)
        return 0;
    return parseFloat(((_a = wallet.balance) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
}
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
    requireKYC: false,
    platformFeePercent: 2,
    minLeaderTrades: 10,
    minLeaderWinRate: 50,
    minLeaderAccountAge: 30,
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
async function checkPlatformStatus() {
    const settings = await getCopyTradingSettings();
    if (!settings.enabled) {
        return { available: false, reason: "Copy trading is currently disabled" };
    }
    if (settings.maintenanceMode) {
        return { available: false, reason: "Copy trading is currently under maintenance" };
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
function calculateProfitShare(profit, profitSharePercent, platformFeePercent) {
    if (profit <= 0) {
        return { leaderShare: 0, platformFee: 0, followerNet: profit };
    }
    const platformFee = profit * (platformFeePercent / 100);
    const afterPlatformFee = profit - platformFee;
    const leaderShare = afterPlatformFee * (profitSharePercent / 100);
    const followerNet = afterPlatformFee - leaderShare;
    return { leaderShare, platformFee, followerNet };
}
async function getLeaderRankings(period = "30d", limit = 50) {
    const leaders = await db_1.models.copyTradingLeader.findAll({
        where: {
            status: "ACTIVE",
            isPublic: true,
        },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
        ],
    });
    const leaderIds = leaders.map((l) => l.id);
    const statsMap = leaderIds.length > 0
        ? await (0, stats_calculator_1.calculateBatchLeaderStats)(leaderIds)
        : new Map();
    const leadersWithStats = leaders.map((l) => {
        const stats = statsMap.get(l.id) || { roi: 0, winRate: 0, totalFollowers: 0, totalProfit: 0, totalTrades: 0, totalVolume: 0 };
        return {
            ...l.toJSON(),
            roi: stats.roi,
            winRate: stats.winRate,
            totalFollowers: stats.totalFollowers,
            totalProfit: stats.totalProfit,
            totalTrades: stats.totalTrades,
            totalVolume: stats.totalVolume,
        };
    });
    leadersWithStats.sort((a, b) => b.roi - a.roi);
    return leadersWithStats.slice(0, limit);
}
var tradeListener_1 = require("./tradeListener");
Object.defineProperty(exports, "LeaderTradeListener", { enumerable: true, get: function () { return tradeListener_1.LeaderTradeListener; } });
Object.defineProperty(exports, "handleOrderCreated", { enumerable: true, get: function () { return tradeListener_1.handleOrderCreated; } });
Object.defineProperty(exports, "isActiveLeader", { enumerable: true, get: function () { return tradeListener_1.isActiveLeader; } });
Object.defineProperty(exports, "getLeaderInfo", { enumerable: true, get: function () { return tradeListener_1.getLeaderInfo; } });
var copyProcessor_1 = require("./copyProcessor");
Object.defineProperty(exports, "processCopyOrder", { enumerable: true, get: function () { return copyProcessor_1.processCopyOrder; } });
Object.defineProperty(exports, "processCopyOrdersBatch", { enumerable: true, get: function () { return copyProcessor_1.processCopyOrdersBatch; } });
Object.defineProperty(exports, "processCopyOrderWithRetry", { enumerable: true, get: function () { return copyProcessor_1.processCopyOrderWithRetry; } });
Object.defineProperty(exports, "calculateFollowerCopyAmount", { enumerable: true, get: function () { return copyProcessor_1.calculateCopyAmount; } });
var fillMonitor_1 = require("./fillMonitor");
Object.defineProperty(exports, "FillMonitor", { enumerable: true, get: function () { return fillMonitor_1.FillMonitor; } });
Object.defineProperty(exports, "closeTrade", { enumerable: true, get: function () { return fillMonitor_1.closeTrade; } });
Object.defineProperty(exports, "closeLeaderTrade", { enumerable: true, get: function () { return fillMonitor_1.closeLeaderTrade; } });
Object.defineProperty(exports, "handleOrderFilled", { enumerable: true, get: function () { return fillMonitor_1.handleOrderFilled; } });
var execution_1 = require("./execution");
Object.defineProperty(exports, "executeOrder", { enumerable: true, get: function () { return execution_1.executeOrder; } });
Object.defineProperty(exports, "cancelCopyOrder", { enumerable: true, get: function () { return execution_1.cancelCopyOrder; } });
Object.defineProperty(exports, "checkPositionSize", { enumerable: true, get: function () { return execution_1.checkPositionSize; } });
Object.defineProperty(exports, "checkStopLevels", { enumerable: true, get: function () { return execution_1.checkStopLevels; } });
Object.defineProperty(exports, "monitorTradeStopLevels", { enumerable: true, get: function () { return execution_1.monitorStopLevels; } });
Object.defineProperty(exports, "calculateExpectedSlippage", { enumerable: true, get: function () { return execution_1.calculateExpectedSlippage; } });
Object.defineProperty(exports, "checkSlippageLimit", { enumerable: true, get: function () { return execution_1.checkSlippageLimit; } });
var profitShare_1 = require("./profitShare");
Object.defineProperty(exports, "calculatePnL", { enumerable: true, get: function () { return profitShare_1.calculatePnL; } });
Object.defineProperty(exports, "calculateUnrealizedPnL", { enumerable: true, get: function () { return profitShare_1.calculateUnrealizedPnL; } });
Object.defineProperty(exports, "distributeProfitShare", { enumerable: true, get: function () { return profitShare_1.distributeProfitShare; } });
Object.defineProperty(exports, "calculateProfitShareBreakdown", { enumerable: true, get: function () { return profitShare_1.calculateProfitShareBreakdown; } });
Object.defineProperty(exports, "processPendingProfitDistributions", { enumerable: true, get: function () { return profitShare_1.processPendingProfitDistributions; } });
Object.defineProperty(exports, "getLeaderEarnings", { enumerable: true, get: function () { return profitShare_1.getLeaderEarnings; } });
Object.defineProperty(exports, "getFollowerProfitSharePayments", { enumerable: true, get: function () { return profitShare_1.getFollowerProfitSharePayments; } });
Object.defineProperty(exports, "previewProfitShare", { enumerable: true, get: function () { return profitShare_1.previewProfitShare; } });
var dailyLimits_1 = require("./dailyLimits");
Object.defineProperty(exports, "checkDailyLimits", { enumerable: true, get: function () { return dailyLimits_1.checkDailyLimits; } });
Object.defineProperty(exports, "getDailyStats", { enumerable: true, get: function () { return dailyLimits_1.getDailyStats; } });
Object.defineProperty(exports, "recordTrade", { enumerable: true, get: function () { return dailyLimits_1.recordTrade; } });
Object.defineProperty(exports, "recordLoss", { enumerable: true, get: function () { return dailyLimits_1.recordLoss; } });
Object.defineProperty(exports, "resetFollowerDailyLimits", { enumerable: true, get: function () { return dailyLimits_1.resetDailyLimits; } });
Object.defineProperty(exports, "updateFollowerLimits", { enumerable: true, get: function () { return dailyLimits_1.updateFollowerLimits; } });
Object.defineProperty(exports, "getFollowerLimitStatus", { enumerable: true, get: function () { return dailyLimits_1.getFollowerLimitStatus; } });
Object.defineProperty(exports, "checkAutoActions", { enumerable: true, get: function () { return dailyLimits_1.checkAutoActions; } });
var calculations_1 = require("./calculations");
Object.defineProperty(exports, "calculateSharpeRatio", { enumerable: true, get: function () { return calculations_1.calculateSharpeRatio; } });
Object.defineProperty(exports, "calculateSortinoRatio", { enumerable: true, get: function () { return calculations_1.calculateSortinoRatio; } });
Object.defineProperty(exports, "calculateMaxDrawdown", { enumerable: true, get: function () { return calculations_1.calculateMaxDrawdown; } });
Object.defineProperty(exports, "calculateCurrentDrawdown", { enumerable: true, get: function () { return calculations_1.calculateCurrentDrawdown; } });
Object.defineProperty(exports, "calculateStdDev", { enumerable: true, get: function () { return calculations_1.calculateStdDev; } });
Object.defineProperty(exports, "calculateVolatility", { enumerable: true, get: function () { return calculations_1.calculateVolatility; } });
Object.defineProperty(exports, "calculateRollingVolatility", { enumerable: true, get: function () { return calculations_1.calculateRollingVolatility; } });
Object.defineProperty(exports, "calculateProfitFactor", { enumerable: true, get: function () { return calculations_1.calculateProfitFactor; } });
Object.defineProperty(exports, "calculateExpectancy", { enumerable: true, get: function () { return calculations_1.calculateExpectancy; } });
Object.defineProperty(exports, "calculatePerformanceMetrics", { enumerable: true, get: function () { return calculations_1.calculatePerformanceMetrics; } });
Object.defineProperty(exports, "calculateDailyReturns", { enumerable: true, get: function () { return calculations_1.calculateDailyReturns; } });
Object.defineProperty(exports, "calculateMonthlyPerformance", { enumerable: true, get: function () { return calculations_1.calculateMonthlyPerformance; } });
Object.defineProperty(exports, "calculateAlpha", { enumerable: true, get: function () { return calculations_1.calculateAlpha; } });
Object.defineProperty(exports, "calculateRiskAdjustedReturn", { enumerable: true, get: function () { return calculations_1.calculateRiskAdjustedReturn; } });
var security_1 = require("./security");
Object.defineProperty(exports, "copyTradingRateLimiters", { enumerable: true, get: function () { return security_1.copyTradingRateLimiters; } });
Object.defineProperty(exports, "isValidUUID", { enumerable: true, get: function () { return security_1.isValidUUID; } });
Object.defineProperty(exports, "sanitizeString", { enumerable: true, get: function () { return security_1.sanitizeString; } });
Object.defineProperty(exports, "validateNumber", { enumerable: true, get: function () { return security_1.validateNumber; } });
Object.defineProperty(exports, "validateLeaderApplication", { enumerable: true, get: function () { return security_1.validateLeaderApplication; } });
Object.defineProperty(exports, "validateFollowRequest", { enumerable: true, get: function () { return security_1.validateFollowRequest; } });
Object.defineProperty(exports, "validateFundOperation", { enumerable: true, get: function () { return security_1.validateFundOperation; } });
Object.defineProperty(exports, "validateSubscriptionUpdate", { enumerable: true, get: function () { return security_1.validateSubscriptionUpdate; } });
Object.defineProperty(exports, "validateLeaderUpdate", { enumerable: true, get: function () { return security_1.validateLeaderUpdate; } });
Object.defineProperty(exports, "validatePagination", { enumerable: true, get: function () { return security_1.validatePagination; } });
Object.defineProperty(exports, "validateSort", { enumerable: true, get: function () { return security_1.validateSort; } });
Object.defineProperty(exports, "throwValidationError", { enumerable: true, get: function () { return security_1.throwValidationError; } });
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "notifyLeaderApplicationEvent", { enumerable: true, get: function () { return notifications_1.notifyLeaderApplicationEvent; } });
Object.defineProperty(exports, "notifyLeaderNewFollower", { enumerable: true, get: function () { return notifications_1.notifyLeaderNewFollower; } });
Object.defineProperty(exports, "notifyLeaderFollowerStopped", { enumerable: true, get: function () { return notifications_1.notifyLeaderFollowerStopped; } });
Object.defineProperty(exports, "notifyFollowerSubscriptionEvent", { enumerable: true, get: function () { return notifications_1.notifyFollowerSubscriptionEvent; } });
Object.defineProperty(exports, "notifyFollowerAllocationEvent", { enumerable: true, get: function () { return notifications_1.notifyFollowerAllocationEvent; } });
Object.defineProperty(exports, "notifyFollowerTradeEvent", { enumerable: true, get: function () { return notifications_1.notifyFollowerTradeEvent; } });
Object.defineProperty(exports, "notifyFollowerRiskEvent", { enumerable: true, get: function () { return notifications_1.notifyFollowerRiskEvent; } });
Object.defineProperty(exports, "notifyProfitShareEvent", { enumerable: true, get: function () { return notifications_1.notifyProfitShareEvent; } });
Object.defineProperty(exports, "notifyCopyTradingAdmins", { enumerable: true, get: function () { return notifications_1.notifyCopyTradingAdmins; } });
