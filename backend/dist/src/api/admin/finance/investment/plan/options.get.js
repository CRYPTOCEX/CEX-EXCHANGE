"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of active investment plans",
    description: "This endpoint retrieves all active investment plans available for selection.",
    operationId: "getInvestmentPlans",
    tags: ["Investment", "Plan"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Investment plans retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("InvestmentPlan"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        const investmentPlans = await db_1.models.investmentPlan.findAll({
            where: { status: true },
        });
        const formatted = investmentPlans.map((plan) => ({
            id: plan.id,
            name: plan.title,
        }));
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching investment plans");
    }
};
