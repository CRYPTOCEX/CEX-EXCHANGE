"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get KYC Analytics Data",
    description: "Fetches analytics data for KYC including total users, verified users, pending verifications, rejected verifications, and completion rates for each level.",
    operationId: "getKycAnalyticsData",
    tags: ["KYC", "Analytics"],
    logModule: "ADMIN_CRM",
    logTitle: "Get KYC level analytics",
    responses: {
        200: {
            description: "KYC analytics data retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalUsers: { type: "number" },
                            verifiedUsers: { type: "number" },
                            pendingVerifications: { type: "number" },
                            rejectedVerifications: { type: "number" },
                            completionRates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        level: { type: "number" },
                                        name: { type: "string" },
                                        rate: { type: "number" },
                                        users: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
    permission: "view.kyc.level",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching analytics data");
        const applications = await db_1.models.kycApplication.findAll();
        const levels = await db_1.models.kycLevel.findAll();
        const users = await db_1.models.user.findAll();
        const totalUsers = users.length;
        const verifiedUsers = applications.filter((app) => app.status === "APPROVED").length;
        const pendingVerifications = applications.filter((app) => app.status === "PENDING").length;
        const rejectedVerifications = applications.filter((app) => app.status === "REJECTED").length;
        const completionRates = levels
            .map((level) => {
            const levelApps = applications.filter((app) => app.levelId === level.id);
            const approvedApps = levelApps.filter((app) => app.status === "APPROVED");
            const rate = levelApps.length > 0
                ? Math.round((approvedApps.length / levelApps.length) * 100)
                : 0;
            return {
                level: level.level,
                name: level.name,
                rate,
                users: approvedApps.length,
            };
        })
            .sort((a, b) => a.level - b.level);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level analytics generated successfully");
        return {
            totalUsers,
            verifiedUsers,
            pendingVerifications,
            rejectedVerifications,
            completionRates,
        };
    }
    catch (error) {
        console.error("Error in getKycAnalyticsData:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + error.message,
        });
    }
};
