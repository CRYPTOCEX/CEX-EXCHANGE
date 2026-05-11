"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Forex plans",
    description: "Retrieves a paginated list of all Forex trading plans with filtering and sorting options. Includes associated duration options for each plan.",
    operationId: "listForexPlans",
    tags: ["Admin", "Forex", "Plan"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Plans",
    responses: {
        200: {
            description: "List of Forex Plans with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexPlanSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Plans"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.forex.plan",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.forexPlan,
        query,
        sortField: query.sortField || "createdAt",
        numericFields: [
            "minProfit",
            "maxProfit",
            "minAmount",
            "maxAmount",
            "profitPercentage",
            "defaultProfit",
            "defaultResult",
        ],
        includeModels: [
            {
                model: db_1.models.forexDuration,
                as: "durations",
                through: { attributes: [] },
                attributes: ["id", "duration", "timeframe"],
            },
        ],
    });
};
