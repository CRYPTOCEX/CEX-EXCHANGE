"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cron_1 = require("../utils/cron");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all investments for the logged-in user",
    description: "Fetches AI trading investments for the currently authenticated user with pagination support.",
    operationId: "getAllInvestments",
    tags: ["AI Trading"],
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Number of results per page (max 100)",
            schema: { type: "integer", default: 20 },
        },
        {
            name: "offset",
            in: "query",
            description: "Number of results to skip",
            schema: { type: "integer", default: 0 },
        },
    ],
    responses: {
        200: {
            description: "Investments retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object", properties: utils_1.baseInvestmentSchema },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "integer" },
                                    limit: { type: "integer" },
                                    offset: { type: "integer" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment"),
        500: query_1.serverErrorResponse,
    },
    logModule: "AI",
    logTitle: "Get all AI investments",
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const limitRaw = Number((_a = query === null || query === void 0 ? void 0 : query.limit) !== null && _a !== void 0 ? _a : 20);
    const offsetRaw = Number((_b = query === null || query === void 0 ? void 0 : query.offset) !== null && _b !== void 0 ? _b : 0);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 100);
    const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);
    const include = [
        {
            model: db_1.models.aiInvestmentPlan,
            as: "plan",
            attributes: ["id", "name", "title", "description", "profitPercentage", "defaultProfit", "defaultResult"],
        },
        {
            model: db_1.models.aiInvestmentDuration,
            as: "duration",
            attributes: ["id", "duration", "timeframe"],
        },
    ];
    const order = [
        ["status", "ASC"],
        ["createdAt", "ASC"],
    ];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for matured active investments");
    const activeInvestments = await db_1.models.aiInvestment.findAll({
        where: { userId: user.id, status: "ACTIVE" },
        include,
        order,
    });
    let anyProcessed = false;
    for (const investment of activeInvestments) {
        if (!investment.duration || !investment.plan)
            continue;
        try {
            const updated = await (0, cron_1.processAiInvestment)(investment);
            if (updated)
                anyProcessed = true;
        }
        catch (_c) {
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching paginated user investments");
    const { count, rows } = await db_1.models.aiInvestment.findAndCountAll({
        where: { userId: user.id },
        include,
        order,
        limit,
        offset,
        distinct: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${rows.length} of ${count} investment(s)`);
    return {
        items: rows,
        pagination: { total: count, limit, offset },
    };
};
