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
exports.copyTradingRateLimiters = void 0;
exports.isValidUUID = isValidUUID;
exports.sanitizeString = sanitizeString;
exports.validateNumber = validateNumber;
exports.validateLeaderApplication = validateLeaderApplication;
exports.validateFollowRequest = validateFollowRequest;
exports.validateFundOperation = validateFundOperation;
exports.validateSubscriptionUpdate = validateSubscriptionUpdate;
exports.validateLeaderUpdate = validateLeaderUpdate;
exports.validatePagination = validatePagination;
exports.validateSort = validateSort;
exports.checkMarketConflict = checkMarketConflict;
exports.throwValidationError = throwValidationError;
const Middleware_1 = require("@b/handler/Middleware");
const error_1 = require("@b/utils/error");
const index_1 = require("./index");
const redis_1 = require("@b/utils/redis");
async function leaderApplyRateLimiter(data) {
    var _a, _b, _c;
    const { user } = data;
    const settings = await (0, index_1.getCopyTradingSettings)();
    const limit = settings.leaderApplicationRateLimit || 10;
    const window = 86400;
    const keyPrefix = "copytrading:leader:apply";
    const message = "Too many leader applications. Please wait 24 hours before trying again.";
    let key;
    if (user === null || user === void 0 ? void 0 : user.id) {
        key = `${keyPrefix}:user:${user.id}`;
    }
    else {
        const clientIp = ((_a = data.req) === null || _a === void 0 ? void 0 : _a.ip) || ((_c = (_b = data.req) === null || _b === void 0 ? void 0 : _b.connection) === null || _c === void 0 ? void 0 : _c.remoteAddress) || "unknown";
        key = `${keyPrefix}:ip:${clientIp}`;
    }
    const redis = redis_1.RedisSingleton.getInstance();
    const current = await redis.get(key);
    if (current !== null && parseInt(current, 10) >= limit) {
        throw (0, error_1.createError)({ statusCode: 429, message });
    }
    if (current === null) {
        await redis.set(key, "1", "EX", window);
    }
    else {
        await redis.incr(key);
    }
}
exports.copyTradingRateLimiters = {
    leaderApply: leaderApplyRateLimiter,
    leaderUpdate: (0, Middleware_1.createRateLimiter)({
        limit: 10,
        window: 3600,
        keyPrefix: "copytrading:leader:update",
        message: "Too many profile updates. Please wait before making more changes.",
    }),
    followerFollow: (0, Middleware_1.createRateLimiter)({
        limit: 10,
        window: 3600,
        keyPrefix: "copytrading:follower:follow",
        message: "Too many follow requests. Please wait before following more leaders.",
    }),
    followerAction: (0, Middleware_1.createRateLimiter)({
        limit: 30,
        window: 3600,
        keyPrefix: "copytrading:follower:action",
        message: "Too many subscription actions. Please slow down.",
    }),
    fundManagement: (0, Middleware_1.createRateLimiter)({
        limit: 20,
        window: 3600,
        keyPrefix: "copytrading:funds",
        message: "Too many fund operations. Please wait before making more changes.",
    }),
    tradeQuery: (0, Middleware_1.createRateLimiter)({
        limit: 100,
        window: 60,
        keyPrefix: "copytrading:trade:query",
        message: "Too many requests. Please slow down.",
    }),
    analyticsQuery: (0, Middleware_1.createRateLimiter)({
        limit: 30,
        window: 60,
        keyPrefix: "copytrading:analytics",
        message: "Too many analytics requests. Please wait.",
    }),
    wsSubscribe: (0, Middleware_1.createRateLimiter)({
        limit: 50,
        window: 60,
        keyPrefix: "copytrading:ws:subscribe",
        message: "Too many WebSocket subscriptions. Please wait.",
    }),
    adminAction: (0, Middleware_1.createRateLimiter)({
        limit: 50,
        window: 3600,
        keyPrefix: "copytrading:admin",
        message: "Too many admin actions. Please wait.",
    }),
};
function isValidUUID(value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof value === "string" && uuidRegex.test(value);
}
function sanitizeString(value, maxLength = 1000) {
    if (typeof value !== "string")
        return "";
    return value
        .trim()
        .slice(0, maxLength)
        .replace(/[<>]/g, "")
        .replace(/'/g, "''")
        .replace(/\\/g, "\\\\");
}
function validateNumber(value, options = {}) {
    const { min, max, allowZero = true, allowNegative = false } = options;
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, value: 0, error: "Invalid number" };
    }
    if (!allowZero && num === 0) {
        return { valid: false, value: 0, error: "Zero is not allowed" };
    }
    if (!allowNegative && num < 0) {
        return { valid: false, value: 0, error: "Negative values are not allowed" };
    }
    if (min !== undefined && num < min) {
        return { valid: false, value: num, error: `Value must be at least ${min}` };
    }
    if (max !== undefined && num > max) {
        return {
            valid: false,
            value: num,
            error: `Value must not exceed ${max}`,
        };
    }
    return { valid: true, value: num };
}
function validateLeaderApplication(body) {
    const errors = [];
    const sanitized = {};
    if (!body.displayName || typeof body.displayName !== "string") {
        errors.push("Display name is required");
    }
    else {
        const displayName = sanitizeString(body.displayName, 100);
        if (displayName.length < 2) {
            errors.push("Display name must be at least 2 characters");
        }
        else if (displayName.length > 100) {
            errors.push("Display name must not exceed 100 characters");
        }
        else if (!/^[a-zA-Z0-9\s\-_]+$/.test(displayName)) {
            errors.push("Display name can only contain letters, numbers, spaces, hyphens, and underscores");
        }
        else {
            sanitized.displayName = displayName;
        }
    }
    if (body.bio) {
        sanitized.bio = sanitizeString(body.bio, 1000);
    }
    const validTradingStyles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];
    if (!body.tradingStyle || !validTradingStyles.includes(body.tradingStyle)) {
        errors.push(`Trading style must be one of: ${validTradingStyles.join(", ")}`);
    }
    else {
        sanitized.tradingStyle = body.tradingStyle;
    }
    const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
    if (!body.riskLevel || !validRiskLevels.includes(body.riskLevel)) {
        errors.push(`Risk level must be one of: ${validRiskLevels.join(", ")}`);
    }
    else {
        sanitized.riskLevel = body.riskLevel;
    }
    if (body.profitSharePercent !== undefined) {
        const profitShare = validateNumber(body.profitSharePercent, {
            min: 0,
            max: 50,
        });
        if (!profitShare.valid) {
            errors.push(`Profit share: ${profitShare.error}`);
        }
        else {
            sanitized.profitSharePercent = profitShare.value;
        }
    }
    if (body.minFollowAmount !== undefined) {
        const minAmount = validateNumber(body.minFollowAmount, {
            min: 0,
            max: 1000000,
        });
        if (!minAmount.valid) {
            errors.push(`Minimum follow amount: ${minAmount.error}`);
        }
        else {
            sanitized.minFollowAmount = minAmount.value;
        }
    }
    if (body.applicationNote) {
        sanitized.applicationNote = sanitizeString(body.applicationNote, 2000);
    }
    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
}
function validateFollowRequest(body) {
    const errors = [];
    const sanitized = {};
    if (!body.leaderId) {
        errors.push("Leader ID is required");
    }
    else if (!isValidUUID(body.leaderId)) {
        errors.push("Invalid leader ID format");
    }
    else {
        sanitized.leaderId = body.leaderId;
    }
    const validCopyModes = ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"];
    if (body.copyMode && !validCopyModes.includes(body.copyMode)) {
        errors.push(`Copy mode must be one of: ${validCopyModes.join(", ")}`);
    }
    else {
        sanitized.copyMode = body.copyMode || "PROPORTIONAL";
    }
    if (sanitized.copyMode === "FIXED_AMOUNT") {
        if (!body.fixedAmount) {
            errors.push("Fixed amount is required for FIXED_AMOUNT mode");
        }
        else {
            const fixedAmount = validateNumber(body.fixedAmount, {
                min: 0.01,
                max: 100000,
                allowZero: false,
            });
            if (!fixedAmount.valid) {
                errors.push(`Fixed amount: ${fixedAmount.error}`);
            }
            else {
                sanitized.fixedAmount = fixedAmount.value;
            }
        }
    }
    if (sanitized.copyMode === "FIXED_RATIO") {
        if (!body.fixedRatio) {
            errors.push("Fixed ratio is required for FIXED_RATIO mode");
        }
        else {
            const fixedRatio = validateNumber(body.fixedRatio, {
                min: 0.01,
                max: 10,
                allowZero: false,
            });
            if (!fixedRatio.valid) {
                errors.push(`Fixed ratio: ${fixedRatio.error}`);
            }
            else {
                sanitized.fixedRatio = fixedRatio.value;
            }
        }
    }
    if (body.maxDailyLoss !== undefined) {
        const maxLoss = validateNumber(body.maxDailyLoss, { min: 0, max: 100 });
        if (!maxLoss.valid) {
            errors.push(`Max daily loss: ${maxLoss.error}`);
        }
        else {
            sanitized.maxDailyLoss = maxLoss.value;
        }
    }
    if (body.maxPositionSize !== undefined) {
        const maxPos = validateNumber(body.maxPositionSize, { min: 0, max: 100 });
        if (!maxPos.valid) {
            errors.push(`Max position size: ${maxPos.error}`);
        }
        else {
            sanitized.maxPositionSize = maxPos.value;
        }
    }
    if (body.stopLossPercent !== undefined) {
        const stopLoss = validateNumber(body.stopLossPercent, { min: 0, max: 100 });
        if (!stopLoss.valid) {
            errors.push(`Stop loss: ${stopLoss.error}`);
        }
        else {
            sanitized.stopLossPercent = stopLoss.value;
        }
    }
    if (body.takeProfitPercent !== undefined) {
        const takeProfit = validateNumber(body.takeProfitPercent, {
            min: 0,
            max: 1000,
        });
        if (!takeProfit.valid) {
            errors.push(`Take profit: ${takeProfit.error}`);
        }
        else {
            sanitized.takeProfitPercent = takeProfit.value;
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
}
function validateFundOperation(body) {
    const errors = [];
    const sanitized = {};
    if (!body.amount) {
        errors.push("Amount is required");
    }
    else {
        const amount = validateNumber(body.amount, {
            min: 0.01,
            max: 10000000,
            allowZero: false,
        });
        if (!amount.valid) {
            errors.push(`Amount: ${amount.error}`);
        }
        else {
            sanitized.amount = amount.value;
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
}
function validateSubscriptionUpdate(body) {
    const errors = [];
    const sanitized = {};
    if (body.copyMode) {
        const validCopyModes = ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"];
        if (!validCopyModes.includes(body.copyMode)) {
            errors.push(`Copy mode must be one of: ${validCopyModes.join(", ")}`);
        }
        else {
            sanitized.copyMode = body.copyMode;
        }
    }
    if (body.fixedAmount !== undefined) {
        const fixedAmount = validateNumber(body.fixedAmount, {
            min: 0.01,
            max: 100000,
        });
        if (!fixedAmount.valid) {
            errors.push(`Fixed amount: ${fixedAmount.error}`);
        }
        else {
            sanitized.fixedAmount = fixedAmount.value;
        }
    }
    if (body.fixedRatio !== undefined) {
        const fixedRatio = validateNumber(body.fixedRatio, { min: 0.01, max: 10 });
        if (!fixedRatio.valid) {
            errors.push(`Fixed ratio: ${fixedRatio.error}`);
        }
        else {
            sanitized.fixedRatio = fixedRatio.value;
        }
    }
    if (body.maxDailyLoss !== undefined) {
        const maxLoss = validateNumber(body.maxDailyLoss, { min: 0, max: 100 });
        if (!maxLoss.valid) {
            errors.push(`Max daily loss: ${maxLoss.error}`);
        }
        else {
            sanitized.maxDailyLoss = maxLoss.value;
        }
    }
    if (body.maxPositionSize !== undefined) {
        const maxPos = validateNumber(body.maxPositionSize, { min: 0, max: 100 });
        if (!maxPos.valid) {
            errors.push(`Max position size: ${maxPos.error}`);
        }
        else {
            sanitized.maxPositionSize = maxPos.value;
        }
    }
    if (body.stopLossPercent !== undefined) {
        const stopLoss = validateNumber(body.stopLossPercent, { min: 0, max: 100 });
        if (!stopLoss.valid) {
            errors.push(`Stop loss: ${stopLoss.error}`);
        }
        else {
            sanitized.stopLossPercent = stopLoss.value;
        }
    }
    if (body.takeProfitPercent !== undefined) {
        const takeProfit = validateNumber(body.takeProfitPercent, {
            min: 0,
            max: 1000,
        });
        if (!takeProfit.valid) {
            errors.push(`Take profit: ${takeProfit.error}`);
        }
        else {
            sanitized.takeProfitPercent = takeProfit.value;
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
}
function validateLeaderUpdate(body) {
    const errors = [];
    const sanitized = {};
    if (body.displayName !== undefined) {
        if (typeof body.displayName !== "string") {
            errors.push("Display name must be a string");
        }
        else {
            const displayName = sanitizeString(body.displayName, 100);
            if (displayName.length < 2) {
                errors.push("Display name must be at least 2 characters");
            }
            else if (!/^[a-zA-Z0-9\s\-_]+$/.test(displayName)) {
                errors.push("Display name can only contain letters, numbers, spaces, hyphens, and underscores");
            }
            else {
                sanitized.displayName = displayName;
            }
        }
    }
    if (body.bio !== undefined) {
        sanitized.bio = sanitizeString(body.bio, 1000);
    }
    if (body.tradingStyle !== undefined) {
        const validTradingStyles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];
        if (!validTradingStyles.includes(body.tradingStyle)) {
            errors.push(`Trading style must be one of: ${validTradingStyles.join(", ")}`);
        }
        else {
            sanitized.tradingStyle = body.tradingStyle;
        }
    }
    if (body.riskLevel !== undefined) {
        const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
        if (!validRiskLevels.includes(body.riskLevel)) {
            errors.push(`Risk level must be one of: ${validRiskLevels.join(", ")}`);
        }
        else {
            sanitized.riskLevel = body.riskLevel;
        }
    }
    if (body.profitSharePercent !== undefined) {
        const profitShare = validateNumber(body.profitSharePercent, {
            min: 0,
            max: 50,
        });
        if (!profitShare.valid) {
            errors.push(`Profit share: ${profitShare.error}`);
        }
        else {
            sanitized.profitSharePercent = profitShare.value;
        }
    }
    if (body.minFollowAmount !== undefined) {
        const minAmount = validateNumber(body.minFollowAmount, {
            min: 0,
            max: 1000000,
        });
        if (!minAmount.valid) {
            errors.push(`Minimum follow amount: ${minAmount.error}`);
        }
        else {
            sanitized.minFollowAmount = minAmount.value;
        }
    }
    if (body.maxFollowers !== undefined) {
        const maxFollowers = validateNumber(body.maxFollowers, {
            min: 1,
            max: 10000,
        });
        if (!maxFollowers.valid) {
            errors.push(`Max followers: ${maxFollowers.error}`);
        }
        else {
            sanitized.maxFollowers = maxFollowers.value;
        }
    }
    if (body.isPublic !== undefined) {
        sanitized.isPublic = Boolean(body.isPublic);
    }
    return {
        valid: errors.length === 0,
        errors,
        sanitized,
    };
}
function validatePagination(query) {
    let page = parseInt(query.page || "1", 10);
    let limit = parseInt(query.limit || "20", 10);
    page = Math.max(1, Math.min(page, 1000));
    limit = Math.max(1, Math.min(limit, 100));
    return {
        page,
        limit,
        offset: (page - 1) * limit,
    };
}
function validateSort(query, allowedFields) {
    let sortBy = query.sortBy || allowedFields[0];
    let sortOrder = (query.sortOrder || "DESC").toUpperCase();
    if (!allowedFields.includes(sortBy)) {
        sortBy = allowedFields[0];
    }
    if (!["ASC", "DESC"].includes(sortOrder)) {
        sortOrder = "DESC";
    }
    return { sortBy, sortOrder: sortOrder };
}
async function checkMarketConflict(userId, leaderId, symbols) {
    const { models } = await Promise.resolve().then(() => __importStar(require("@b/db")));
    const { Op } = await Promise.resolve().then(() => __importStar(require("sequelize")));
    const activeSubscriptions = await models.copyTradingFollower.findAll({
        where: {
            userId,
            leaderId: { [Op.ne]: leaderId },
            status: { [Op.in]: ["ACTIVE", "PAUSED"] },
        },
        include: [
            {
                model: models.copyTradingFollowerAllocation,
                as: "allocations",
                where: {
                    symbol: { [Op.in]: symbols },
                    isActive: true,
                },
                required: false,
            },
            {
                model: models.copyTradingLeader,
                as: "leader",
                attributes: ["displayName"],
            },
        ],
    });
    const conflicts = [];
    for (const sub of activeSubscriptions) {
        if (sub.allocations && sub.allocations.length > 0) {
            conflicts.push({
                leaderName: sub.leader.displayName,
                markets: sub.allocations.map((a) => a.symbol),
            });
        }
    }
    if (conflicts.length > 0) {
        return {
            hasConflict: true,
            conflictDetails: conflicts,
        };
    }
    return { hasConflict: false };
}
function throwValidationError(result) {
    throw (0, error_1.createError)({
        statusCode: 400,
        message: result.errors.join("; "),
    });
}
