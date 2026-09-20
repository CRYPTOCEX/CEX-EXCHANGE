"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const core_1 = require("../../utils/core");
const settings_core_1 = require("../../utils/settings-core");
const native_binary_1 = require("../../utils/native-binary");
exports.metadata = {
    summary: "Check Leader Eligibility",
    description: "Checks if the current user is eligible to become a copy trading leader. Pass ?type=SPOT|BINARY|BOTH to evaluate the trade-history requirements against the matching order history (spot exchange orders, settled live binary orders, or both).",
    operationId: "checkCopyTradingLeaderEligibility",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Check leader eligibility",
    parameters: [
        {
            name: "type",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["SPOT", "BINARY", "BOTH"] },
            description: "Instrument class the applicant intends to offer (default SPOT)",
        },
    ],
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
    var _a;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, (_a = data.query) === null || _a === void 0 ? void 0 : _a.type, "check eligibility to lead binary markets");
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const rawType = typeof (query === null || query === void 0 ? void 0 : query.type) === "string" ? query.type.toUpperCase() : "SPOT";
    const tradingType = ["SPOT", "BINARY", "BOTH"].includes(rawType)
        ? rawType
        : "SPOT";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching settings and existing application");
    const settings = await (0, settings_core_1.getCopyTradingSettings)();
    let typeUnavailableReason = null;
    const requestedTypes = tradingType === "BOTH" ? ["SPOT", "BINARY"] : [tradingType];
    for (const t of requestedTypes) {
        const availability = await (0, settings_core_1.checkCopyTypeAvailability)(t);
        if (!availability.available) {
            typeUnavailableReason =
                availability.reason || `${t} copy trading is not available`;
            break;
        }
    }
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
    const kycVerified = await (0, core_1.isLeaderKycVerified)(user.id);
    const perf = await (0, core_1.computeLeaderPerformanceRequirements)(user.id, tradingType, settings);
    const requirements = {
        minTrades: perf.minTrades,
        minWinRate: perf.minWinRate,
        accountAge: perf.accountAge,
        kycVerified: {
            required: settings.requireKYC,
            current: kycVerified,
            met: !settings.requireKYC || kycVerified,
        },
    };
    const isEligible = !blockedReason &&
        !typeUnavailableReason &&
        requirements.minTrades.met &&
        requirements.minWinRate.met &&
        requirements.accountAge.met &&
        requirements.kycVerified.met;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Eligibility checked");
    return {
        isEligible,
        tradingType,
        typeUnavailableReason,
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
