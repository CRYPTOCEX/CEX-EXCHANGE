"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Get KYC Applications Analytics Data",
    description: "Fetches analytics data for KYC applications including total applications, pending, approved, rejected, additional info required, completion rate, and average processing time. Accepts the same scope filters as the list endpoint so the figures always describe the population the operator is looking at.",
    operationId: "getKycApplicationsAnalyticsData",
    tags: ["KYC", "Analytics"],
    logModule: "ADMIN_CRM",
    logTitle: "Get KYC applications analytics",
    parameters: [
        {
            name: "levelId",
            in: "query",
            description: "Restrict the figures to a single KYC level",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "verification",
            in: "query",
            description: "Restrict to levels handled by a verification service or reviewed manually",
            required: false,
            schema: { type: "string", enum: ["service", "manual"] },
        },
        {
            name: "search",
            in: "query",
            description: "Free-text match across application id, applicant name, applicant email and level name",
            required: false,
            schema: { type: "string" },
        },
    ],
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
    var _a, _b, _c, _d;
    const { query, ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching KYC applications");
        const searchWhere = (0, utils_1.buildKycApplicationSearchWhere)(query.search);
        const scopeWhere = (0, utils_1.buildKycApplicationScopeWhere)(query);
        const where = searchWhere || scopeWhere
            ? { ...(scopeWhere !== null && scopeWhere !== void 0 ? scopeWhere : {}), ...(searchWhere !== null && searchWhere !== void 0 ? searchWhere : {}) }
            : undefined;
        const rows = await db_1.models.kycApplication.findAll({
            attributes: [
                "status",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("kycApplication.id")), "count"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN `kycApplication`.`reviewedAt` IS NOT NULL THEN 1 ELSE 0 END")),
                    "reviewed",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN `kycApplication`.`reviewedAt` IS NOT NULL THEN TIMESTAMPDIFF(SECOND, `kycApplication`.`createdAt`, `kycApplication`.`reviewedAt`) ELSE 0 END")),
                    "processingSeconds",
                ],
            ],
            where,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: [],
                    required: false,
                },
                {
                    model: db_1.models.kycLevel,
                    as: "level",
                    attributes: [],
                    required: false,
                    paranoid: false,
                },
            ],
            group: [(0, sequelize_1.col)("kycApplication.status")],
            raw: true,
        });
        let total = 0;
        let reviewedCount = 0;
        let processingSeconds = 0;
        const byStatus = new Map();
        for (const row of rows) {
            const count = Number(row.count) || 0;
            total += count;
            reviewedCount += Number(row.reviewed) || 0;
            processingSeconds += Number(row.processingSeconds) || 0;
            byStatus.set(row.status, count);
        }
        const pending = (_a = byStatus.get("PENDING")) !== null && _a !== void 0 ? _a : 0;
        const approved = (_b = byStatus.get("APPROVED")) !== null && _b !== void 0 ? _b : 0;
        const rejected = (_c = byStatus.get("REJECTED")) !== null && _c !== void 0 ? _c : 0;
        const infoRequired = (_d = byStatus.get("ADDITIONAL_INFO_REQUIRED")) !== null && _d !== void 0 ? _d : 0;
        const completionRate = total > 0 ? ((approved + rejected) / total) * 100 : 0;
        const averageProcessingTime = reviewedCount > 0 ? processingSeconds / reviewedCount / 3600 : 0;
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
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to generate KYC analytics");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + error.message,
        });
    }
};
