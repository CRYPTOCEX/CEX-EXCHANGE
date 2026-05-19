"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Check Leader Eligibility",
    description: "Checks if the current user is eligible to become a copy trading leader.",
    operationId: "checkCopyTradingLeaderEligibility",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Check leader eligibility",
    responses: {
        200: {
            description: "Eligibility check completed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            isEligible: { type: "boolean" },
                            requirements: {
                                type: "object",
                                properties: {
                                    minTrades: {
                                        type: "object",
                                        properties: {
                                            required: { type: "number" },
                                            current: { type: "number" },
                                            met: { type: "boolean" },
                                        },
                                    },
                                    minWinRate: {
                                        type: "object",
                                        properties: {
                                            required: { type: "number" },
                                            current: { type: "number" },
                                            met: { type: "boolean" },
                                        },
                                    },
                                    accountAge: {
                                        type: "object",
                                        properties: {
                                            required: { type: "number" },
                                            current: { type: "number" },
                                            met: { type: "boolean" },
                                        },
                                    },
                                    kycVerified: {
                                        type: "object",
                                        properties: {
                                            required: { type: "boolean" },
                                            current: { type: "boolean" },
                                            met: { type: "boolean" },
                                        },
                                    },
                                },
                            },
                            existingApplication: { type: "object", nullable: true },
                            blockedReason: { type: "string", nullable: true },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching settings and existing application");
    const settings = await (0, utils_1.getCopyTradingSettings)();
    const existingLeader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
    });
    let blockedReason = null;
    if (existingLeader) {
        switch (existingLeader.status) {
            case "ACTIVE":
                blockedReason = "You are already an active leader";
                break;
            case "PENDING":
                blockedReason = "Your leader application is pending review";
                break;
            case "SUSPENDED":
                blockedReason = "Your leader account has been suspended";
                break;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user requirements");
    const userRecord = await db_1.models.user.findByPk(user.id);
    if (!userRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const accountCreatedAt = userRecord.createdAt ? new Date(userRecord.createdAt) : new Date();
    const now = new Date();
    const accountAgeDays = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const kycLevel = ((_a = userRecord.kyc) === null || _a === void 0 ? void 0 : _a.level) || 0;
    const kycVerified = kycLevel >= 2;
    let userTrades = 0;
    let userWinRate = 0;
    try {
        const orders = await ((_b = db_1.models.exchangeOrder) === null || _b === void 0 ? void 0 : _b.findAll({
            where: {
                userId: user.id,
                status: "CLOSED",
            },
            attributes: ["id", "profit"],
        }));
        if (orders && orders.length > 0) {
            userTrades = orders.length;
            const winningOrders = orders.filter((o) => (o.profit || 0) > 0).length;
            userWinRate = (winningOrders / userTrades) * 100;
        }
    }
    catch (_c) {
    }
    const requirements = {
        minTrades: {
            required: settings.minLeaderTrades,
            current: userTrades,
            met: userTrades >= settings.minLeaderTrades,
        },
        minWinRate: {
            required: settings.minLeaderWinRate,
            current: Math.round(userWinRate * 100) / 100,
            met: userWinRate >= settings.minLeaderWinRate || userTrades === 0,
        },
        accountAge: {
            required: settings.minLeaderAccountAge,
            current: accountAgeDays,
            met: accountAgeDays >= settings.minLeaderAccountAge,
        },
        kycVerified: {
            required: settings.requireKYC,
            current: kycVerified,
            met: !settings.requireKYC || kycVerified,
        },
    };
    const isEligible = !blockedReason &&
        requirements.minTrades.met &&
        requirements.minWinRate.met &&
        requirements.accountAge.met &&
        requirements.kycVerified.met;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Eligibility checked");
    return {
        isEligible,
        requirements,
        existingApplication: existingLeader
            ? {
                id: existingLeader.id,
                status: existingLeader.status,
                createdAt: existingLeader.createdAt,
                rejectionReason: existingLeader.rejectionReason,
            }
            : null,
        blockedReason,
    };
};
