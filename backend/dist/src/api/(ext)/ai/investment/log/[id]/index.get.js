"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cron_1 = require("../../utils/cron");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves specific investment by ID for the logged-in user",
    description: "Fetches a specific AI trading investment by ID for the currently authenticated user.",
    operationId: "getInvestmentById",
    tags: ["AI Trading"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Investment ID" },
        },
    ],
    responses: {
        200: {
            description: "Investment retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseInvestmentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment"),
        500: query_1.serverErrorResponse,
    },
    logModule: "AI",
    logTitle: "Get AI investment by ID",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching investment details");
    let investment = await db_1.models.aiInvestment.findByPk(id, {
        include: [
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
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying investment exists");
    if (!investment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying investment ownership");
    if (investment.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Forbidden" });
    }
    if (investment.status === "ACTIVE" && investment.duration && investment.plan) {
        try {
            const updated = await (0, cron_1.processAiInvestment)(investment);
            if (updated) {
                investment = updated;
            }
        }
        catch (_a) {
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved investment ${id} for symbol ${investment.symbol}`);
    return investment;
};
