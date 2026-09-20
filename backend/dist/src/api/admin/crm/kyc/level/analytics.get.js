"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
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
    var _a;
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching analytics data");
        const [levels, userCount, statusCounts] = await Promise.all([
            db_1.models.kycLevel.findAll({
                attributes: ["id", "level", "name"],
                raw: true,
            }),
            db_1.models.user.count(),
            db_1.models.kycApplication.findAll({
                attributes: ["levelId", "status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
                group: ["levelId", "status"],
                raw: true,
            }),
        ]);
        const totalUsers = Number(userCount) || 0;
        let verifiedUsers = 0;
        let pendingVerifications = 0;
        let rejectedVerifications = 0;
        const byLevel = new Map();
        for (const row of statusCounts) {
            const count = Number(row.count) || 0;
            if (row.status === "APPROVED")
                verifiedUsers += count;
            else if (row.status === "PENDING")
                pendingVerifications += count;
            else if (row.status === "REJECTED")
                rejectedVerifications += count;
            const bucket = (_a = byLevel.get(row.levelId)) !== null && _a !== void 0 ? _a : { total: 0, approved: 0 };
            bucket.total += count;
            if (row.status === "APPROVED")
                bucket.approved += count;
            byLevel.set(row.levelId, bucket);
        }
        const completionRates = levels
            .map((level) => {
            var _a;
            const bucket = (_a = byLevel.get(level.id)) !== null && _a !== void 0 ? _a : { total: 0, approved: 0 };
            const rate = bucket.total > 0
                ? Math.round((bucket.approved / bucket.total) * 100)
                : 0;
            return {
                level: level.level,
                name: level.name,
                rate,
                users: bucket.approved,
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
