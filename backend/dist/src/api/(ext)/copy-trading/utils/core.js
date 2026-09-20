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
exports.createAuditLog = exports.checkCopyTypeAvailability = exports.leaderOffersMarketType = exports.createCopyTradingTransaction = exports.getCopyTradingSettings = void 0;
exports.getLeaderById = getLeaderById;
exports.getLeaderByUserId = getLeaderByUserId;
exports.checkLeaderEligibility = checkLeaderEligibility;
exports.isLeaderKycVerified = isLeaderKycVerified;
exports.computeLeaderPerformanceRequirements = computeLeaderPerformanceRequirements;
exports.updateLeaderStats = updateLeaderStats;
exports.getFollowerById = getFollowerById;
exports.getFollowersByUserId = getFollowersByUserId;
exports.checkFollowEligibility = checkFollowEligibility;
exports.updateFollowerStats = updateFollowerStats;
exports.getUserWalletBalance = getUserWalletBalance;
exports.checkPlatformStatus = checkPlatformStatus;
exports.validateCopyMarketSymbol = validateCopyMarketSymbol;
exports.calculateProfitShare = calculateProfitShare;
exports.getLeaderRankings = getLeaderRankings;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const stats_calculator_1 = require("./stats-calculator");
const kyc_1 = require("@b/utils/kyc");
const settings_core_1 = require("./settings-core");
Object.defineProperty(exports, "getCopyTradingSettings", { enumerable: true, get: function () { return settings_core_1.getCopyTradingSettings; } });
Object.defineProperty(exports, "createCopyTradingTransaction", { enumerable: true, get: function () { return settings_core_1.createCopyTradingTransaction; } });
Object.defineProperty(exports, "leaderOffersMarketType", { enumerable: true, get: function () { return settings_core_1.leaderOffersMarketType; } });
Object.defineProperty(exports, "checkCopyTypeAvailability", { enumerable: true, get: function () { return settings_core_1.checkCopyTypeAvailability; } });
Object.defineProperty(exports, "createAuditLog", { enumerable: true, get: function () { return settings_core_1.createAuditLog; } });
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
async function checkLeaderEligibility(userId, tradingType = "SPOT") {
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
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
    if (settings.requireKYC && !(await isLeaderKycVerified(userId))) {
        return { eligible: false, reason: "KYC verification is required" };
    }
    const perf = await computeLeaderPerformanceRequirements(userId, tradingType, settings);
    if (!perf.minTrades.met) {
        return {
            eligible: false,
            reason: `At least ${settings.minLeaderTrades} completed trades are required to become a leader (you have ${perf.userTrades}).`,
        };
    }
    if (!perf.minWinRate.met) {
        return {
            eligible: false,
            reason: `A minimum win rate of ${settings.minLeaderWinRate}% is required (yours is ${perf.minWinRate.current}%).`,
        };
    }
    if (!perf.accountAge.met) {
        return {
            eligible: false,
            reason: `Your account must be at least ${settings.minLeaderAccountAge} days old (it is ${perf.accountAgeDays}).`,
        };
    }
    return { eligible: true };
}
async function isLeaderKycVerified(userId) {
    const applications = await db_1.models.kycApplication.findAll({
        where: { userId },
        include: [{ model: db_1.models.kycLevel, as: "level" }],
    });
    const status = (0, kyc_1.getEffectiveKycStatus)(applications);
    if (!status.isVerified)
        return false;
    if (!(await (0, kyc_1.isKycFeatureEnforcementEnabled)()))
        return true;
    return status.features.includes(kyc_1.KYC_FEATURES.BECOME_TRADER);
}
async function computeLeaderPerformanceRequirements(userId, tradingType, settings) {
    var _a;
    const userRecord = await db_1.models.user.findByPk(userId);
    const accountCreatedAt = (userRecord === null || userRecord === void 0 ? void 0 : userRecord.createdAt)
        ? new Date(userRecord.createdAt)
        : new Date();
    const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    let userTrades = 0;
    let winningTrades = 0;
    let judgeableTrades = 0;
    if (tradingType === "SPOT" || tradingType === "BOTH") {
        try {
            const cexCount = await ((_a = db_1.models.exchangeOrder) === null || _a === void 0 ? void 0 : _a.count({
                where: { userId, status: "CLOSED" },
            }));
            userTrades += cexCount || 0;
        }
        catch (_b) {
        }
        try {
            const { getEcosystemScyllaUtils } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
            const scylla = await getEcosystemScyllaUtils();
            if (scylla === null || scylla === void 0 ? void 0 : scylla.getOrdersByUserId) {
                const ecoOrders = await scylla.getOrdersByUserId(userId);
                if (Array.isArray(ecoOrders)) {
                    userTrades += ecoOrders.filter((o) => Number(o === null || o === void 0 ? void 0 : o.filled) > 0).length;
                }
            }
        }
        catch (_c) {
        }
    }
    if (tradingType === "BINARY" || tradingType === "BOTH") {
        try {
            const [total, wins] = await Promise.all([
                db_1.models.binaryOrder.count({
                    where: {
                        userId,
                        isDemo: false,
                        status: { [sequelize_1.Op.in]: ["WIN", "LOSS", "DRAW"] },
                    },
                }),
                db_1.models.binaryOrder.count({
                    where: { userId, isDemo: false, status: "WIN" },
                }),
            ]);
            userTrades += total;
            winningTrades += wins;
            judgeableTrades += total;
        }
        catch (_d) {
        }
    }
    const userWinRate = judgeableTrades > 0 ? (winningTrades / judgeableTrades) * 100 : 0;
    const minTrades = {
        required: settings.minLeaderTrades,
        current: userTrades,
        met: userTrades >= settings.minLeaderTrades,
    };
    const minWinRate = {
        required: settings.minLeaderWinRate,
        current: Math.round(userWinRate * 100) / 100,
        met: userWinRate >= settings.minLeaderWinRate || judgeableTrades === 0,
    };
    const accountAge = {
        required: settings.minLeaderAccountAge,
        current: accountAgeDays,
        met: accountAgeDays >= settings.minLeaderAccountAge,
    };
    return {
        accountAgeDays,
        userTrades,
        userWinRate,
        minTrades,
        minWinRate,
        accountAge,
        allMet: minTrades.met && minWinRate.met && accountAge.met,
    };
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
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
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
async function checkPlatformStatus() {
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
    if (!settings.enabled) {
        return { available: false, reason: "Copy trading is currently disabled" };
    }
    if (settings.maintenanceMode) {
        return { available: false, reason: "Copy trading is currently under maintenance" };
    }
    return { available: true };
}
async function validateCopyMarketSymbol(symbol, marketType) {
    const parts = typeof symbol === "string" ? symbol.split("/") : [];
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid symbol format: ${symbol}. Use BASE/QUOTE (e.g., BTC/USDT)`,
        });
    }
    const [baseCurrency, quoteCurrency] = parts;
    if (marketType === "BINARY") {
        const market = await db_1.models.binaryMarket.findOne({
            where: { currency: baseCurrency, pair: quoteCurrency, status: true },
        });
        if (!market) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid or inactive binary market: ${symbol}`,
            });
        }
    }
    else {
        const market = db_1.models.ecosystemMarket
            ? await db_1.models.ecosystemMarket.findOne({
                where: { currency: baseCurrency, pair: quoteCurrency, status: true },
            })
            : null;
        if (!market) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid or inactive market: ${symbol}`,
            });
        }
    }
    return { baseCurrency, quoteCurrency };
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
