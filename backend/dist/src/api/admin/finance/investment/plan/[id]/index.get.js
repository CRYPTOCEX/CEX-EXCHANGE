"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific investment plan by ID",
    operationId: "getInvestmentPlanById",
    tags: ["Admin", "Investment Plans"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the investment plan to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Investment plan details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseInvestmentPlanSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investment Plan"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.investment.plan",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("investmentPlan", params.id, [
        {
            model: db_1.models.investmentDuration,
            as: "durations",
            through: { attributes: [] },
            attributes: ["id", "duration", "timeframe"],
        },
    ]);
};
