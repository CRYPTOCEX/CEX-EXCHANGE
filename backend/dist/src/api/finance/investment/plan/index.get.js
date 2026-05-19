"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Lists all investment plans",
    description: "Retrieves a list of all available investment plans that are currently active and open for new investments.",
    operationId: "listInvestmentPlans",
    tags: ["Finance", "Investment"],
    responses: {
        200: {
            description: "Investment plans retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseInvestmentPlanSchema,
                        },
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
exports.default = async () => {
    return (await db_1.models.investmentPlan.findAll({
        where: {
            status: true,
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
    })).map((plan) => plan.get({ plain: true }));
};
