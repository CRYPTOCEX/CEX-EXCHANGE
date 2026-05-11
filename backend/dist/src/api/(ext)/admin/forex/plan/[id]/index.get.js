"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Gets a specific Forex plan",
    description: "Retrieves detailed information about a specific Forex plan by its ID, including all profit settings, limits, and available durations.",
    operationId: "getForexPlan",
    tags: ["Admin", "Forex", "Plan"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex plan to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex plan details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexPlanSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Plan"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.forex.plan",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Plan",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex plan record");
    const result = await (0, query_1.getRecord)("forexPlan", params.id, [
        {
            model: db_1.models.forexDuration,
            as: "durations",
            through: { attributes: [] },
            attributes: ["id", "duration", "timeframe"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved forex plan");
    return result;
};
