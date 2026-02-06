"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get KYC Applications Analytics Data",
    description: "Fetches analytics data for KYC applications including total applications, pending, approved, rejected, additional info required, completion rate, and average processing time.",
    operationId: "getKycApplicationsAnalyticsData",
    tags: ["KYC", "Analytics"],
    logModule: "ADMIN_CRM",
    logTitle: "Get KYC applications analytics",
    responses: {
        200: {
            description: "KYC applications analytics data retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            pending: { type: "number" },
                            approved: { type: "number" },
                            rejected: { type: "number" },
                            infoRequired: { type: "number" },
                            completionRate: { type: "number" },
                            averageProcessingTime: { type: "number" },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
    requiresAuth: true,
    permission: "view.kyc.application",
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all KYC applications");
        const applications = await db_1.models.kycApplication.findAll();
        const total = applications.length;
        const pending = applications.filter((app) => app.status === "PENDING").length;
        const approved = applications.filter((app) => app.status === "APPROVED").length;
        const rejected = applications.filter((app) => app.status === "REJECTED").length;
        const infoRequired = applications.filter((app) => app.status === "ADDITIONAL_INFO_REQUIRED").length;
        const completionRate = total > 0 ? ((approved + rejected) / total) * 100 : 0;
        const reviewedApps = applications.filter((app) => app.reviewedAt);
        const totalProcessingTime = reviewedApps.reduce((sum, app) => {
            const submittedAt = new Date(app.createdAt).getTime();
            const reviewedAt = new Date(app.reviewedAt).getTime();
            return sum + (reviewedAt - submittedAt) / (1000 * 60 * 60);
        }, 0);
        const averageProcessingTime = reviewedApps.length > 0 ? totalProcessingTime / reviewedApps.length : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC applications analytics generated successfully");
        return {
            total,
            pending,
            approved,
            rejected,
            infoRequired,
            completionRate,
            averageProcessingTime,
        };
    }
    catch (error) {
        console.error("Error in getKycApplicationsAnalyticsData:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + error.message,
        });
    }
};
