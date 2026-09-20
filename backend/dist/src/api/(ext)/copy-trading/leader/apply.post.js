"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const core_1 = require("@b/api/(ext)/copy-trading/utils/core");
const notifications_1 = require("@b/api/(ext)/copy-trading/utils/notifications");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const transaction_1 = require("@b/utils/transaction");
const native_binary_1 = require("../utils/native-binary");
exports.metadata = {
    summary: "Apply to Become a Copy Trading Leader",
    description: "Submit an application to become a copy trading leader. Requires approval from admin.",
    operationId: "applyToBecomeLeader",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Apply as leader",
    middleware: ["copyTradingLeaderApply"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        displayName: {
                            type: "string",
                            minLength: 2,
                            maxLength: 100,
                            description: "Public display name",
                        },
                        bio: {
                            type: "string",
                            maxLength: 1000,
                            description: "Short biography",
                        },
                        tradingStyle: {
                            type: "string",
                            enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"],
                            description: "Primary trading style",
                        },
                        riskLevel: {
                            type: "string",
                            enum: ["LOW", "MEDIUM", "HIGH"],
                            description: "Risk level of trading strategy",
                        },
                        tradingType: {
                            type: "string",
                            enum: ["SPOT", "BINARY", "BOTH"],
                            default: "SPOT",
                            description: "Instrument class(es) offered for copying: spot trading, binary options, or both",
                        },
                        profitSharePercent: {
                            type: "number",
                            minimum: 0,
                            maximum: 50,
                            description: "Percentage of profit to share with leader",
                        },
                        applicationNote: {
                            type: "string",
                            maxLength: 2000,
                            description: "Additional notes for the application",
                        },
                        markets: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    symbol: { type: "string" },
                                    type: {
                                        type: "string",
                                        enum: ["SPOT", "BINARY"],
                                        default: "SPOT",
                                        description: "Instrument class of this market entry",
                                    },
                                    minBase: { type: "number", minimum: 0 },
                                    minQuote: {
                                        type: "number",
                                        minimum: 0,
                                        description: "Minimum quote allocation; for BINARY markets this is the minimum stake budget",
                                    },
                                },
                                required: ["symbol"],
                            },
                            minItems: 1,
                            description: "Array of market objects with symbol and optional min allocations",
                        },
                    },
                    required: ["displayName", "tradingStyle", "riskLevel", "markets"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Application submitted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            leader: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, body === null || body === void 0 ? void 0 : body.tradingType, "apply to lead binary markets");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating application");
    const validation = (0, security_1.validateLeaderApplication)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    const { displayName, bio, tradingStyle, riskLevel, profitSharePercent = 10, applicationNote, } = validation.sanitized;
    const { markets } = body;
    if (!markets || !Array.isArray(markets) || markets.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one trading market is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating trading type");
    const rawTradingType = body.tradingType || "SPOT";
    if (!["SPOT", "BINARY", "BOTH"].includes(rawTradingType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "tradingType must be SPOT, BINARY or BOTH",
        });
    }
    const tradingType = rawTradingType;
    const requestedTypes = tradingType === "BOTH" ? ["SPOT", "BINARY"] : [tradingType];
    for (const t of requestedTypes) {
        const availability = await (0, core_1.checkCopyTypeAvailability)(t);
        if (!availability.available) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: availability.reason || `${t} copy trading is not available`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating markets");
    const validatedMarkets = [];
    for (const marketItem of markets) {
        const symbol = typeof marketItem === "string" ? marketItem : marketItem.symbol;
        const minBase = typeof marketItem === "object" ? (marketItem.minBase || 0) : 0;
        const minQuote = typeof marketItem === "object" ? (marketItem.minQuote || 0) : 0;
        const marketType = typeof marketItem === "object" && marketItem.type === "BINARY"
            ? "BINARY"
            : "SPOT";
        if (typeof symbol !== "string") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid market symbol format",
            });
        }
        if (!requestedTypes.includes(marketType)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Market ${symbol} is ${marketType} but the application is for ${tradingType}`,
            });
        }
        const { baseCurrency, quoteCurrency } = await (0, core_1.validateCopyMarketSymbol)(symbol, marketType);
        if (validatedMarkets.some((m) => m.symbol === symbol && m.marketType === marketType)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Duplicate market entry: ${symbol} (${marketType})`,
            });
        }
        validatedMarkets.push({
            symbol,
            marketType,
            baseCurrency,
            quoteCurrency,
            minBase,
            minQuote,
        });
    }
    for (const t of requestedTypes) {
        if (!validatedMarkets.some((m) => m.marketType === t)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `At least one ${t} market is required for a ${tradingType} application`,
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking eligibility");
    const eligibility = await (0, core_1.checkLeaderEligibility)(user.id, tradingType);
    if (!eligibility.eligible) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: eligibility.reason || "Eligibility check failed",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking existing application");
    const existingLeader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
        paranoid: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking auto-approve setting");
    const autoApproveSetting = await db_1.models.settings.findOne({
        where: { key: "copyTradingAutoApproveLeaders" },
    });
    const autoApprove = (autoApproveSetting === null || autoApproveSetting === void 0 ? void 0 : autoApproveSetting.value) === "true";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating application");
    const t = await db_1.sequelize.transaction();
    try {
        let leader;
        if (existingLeader && existingLeader.status === "REJECTED") {
            leader = await existingLeader.update({
                displayName,
                bio,
                tradingStyle,
                riskLevel,
                tradingType,
                profitSharePercent,
                applicationNote,
                status: autoApprove ? "ACTIVE" : "PENDING",
                rejectionReason: null,
                deletedAt: null,
            }, { transaction: t });
            await db_1.models.copyTradingLeaderMarket.destroy({
                where: { leaderId: leader.id },
                transaction: t,
            });
        }
        else if (existingLeader) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "You already have an active leader application",
            });
        }
        else {
            leader = await db_1.models.copyTradingLeader.create({
                userId: user.id,
                displayName,
                bio,
                tradingStyle,
                riskLevel,
                tradingType,
                profitSharePercent,
                minFollowAmount: 100,
                maxFollowers: 100,
                applicationNote,
                status: autoApprove ? "ACTIVE" : "PENDING",
                isPublic: true,
            }, { transaction: t });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating leader markets");
        for (const marketData of validatedMarkets) {
            await db_1.models.copyTradingLeaderMarket.create({
                leaderId: leader.id,
                symbol: marketData.symbol,
                marketType: marketData.marketType,
                baseCurrency: marketData.baseCurrency,
                quoteCurrency: marketData.quoteCurrency,
                minBase: marketData.minBase,
                minQuote: marketData.minQuote,
                isActive: true,
            }, { transaction: t });
        }
        await (0, core_1.createAuditLog)({
            entityType: "LEADER",
            entityId: leader.id,
            action: "CREATE",
            newValue: { ...leader.toJSON(), markets: validatedMarkets },
            userId: user.id,
        }, t);
        await t.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending application notification");
        if (autoApprove) {
            await (0, notifications_1.notifyLeaderApplicationEvent)(user.id, leader.id, "APPROVED", undefined, ctx);
        }
        else {
            await (0, notifications_1.notifyLeaderApplicationEvent)(user.id, leader.id, "APPLIED", undefined, ctx);
        }
        if (!autoApprove) {
            await (0, notifications_1.notifyCopyTradingAdmins)("LEADER_APPLICATION", {
                leaderId: leader.id,
                userName: `${user.firstName} ${user.lastName}`,
            }, ctx);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(autoApprove ? "Application auto-approved" : "Application submitted");
        return {
            message: autoApprove
                ? "Application approved successfully. You can now accept followers."
                : "Application submitted successfully. Pending admin approval.",
            leader: { ...leader.toJSON(), markets: validatedMarkets },
        };
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
        throw error;
    }
};
