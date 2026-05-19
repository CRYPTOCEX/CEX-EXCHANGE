"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Retrieves a single investment plan by ID",
    description: "Fetches detailed information about a specific investment plan based on its unique identifier.",
    operationId: "getInvestmentPlan",
    tags: ["Finance", "Investment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the investment plan to retrieve",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Investment plan retrieved successfully",
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
    requiresAuth: false,
};
exports.default = async (data) => {
    const plan = await db_1.models.investmentPlan.findOne({
        where: {
            id: data.params.id,
        },
        include: [
            {
                model: db_1.models.investmentDuration,
                as: "durations",
                attributes: ["id", "duration", "timeframe"],
                through: { attributes: [] },
            },
        ],
        attributes: [
            "id",
            "title",
            "description",
            "image",
            "minAmount",
            "maxAmount",
            "profitPercentage",
            "currency",
            "walletType",
            "trending",
        ],
    });
    if (!plan) {
        throw (0, error_1.createError)(404, "Investment plan not found");
    }
    return plan.get({ plain: true });
};
