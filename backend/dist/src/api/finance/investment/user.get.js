"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getUserInvestment = getUserInvestment;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves investments for the logged-in user",
    description: "Fetches all active investments associated with the currently authenticated user, including details about the investment plan and user information.",
    operationId: "getUserInvestments",
    tags: ["Finance", "Investment"],
    responses: {
        200: {
            description: "Investments retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...utils_1.baseInvestmentSchema,
                                user: {
                                    type: "object",
                                    properties: utils_1.baseUserSchema,
                                },
                                plan: {
                                    type: "object",
                                    properties: utils_1.baseInvestmentPlanSchema,
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investment"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    if (!((_a = data.user) === null || _a === void 0 ? void 0 : _a.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    return getUserInvestment(data.user.id);
};
async function getUserInvestment(userId) {
    const response = await db_1.models.investment.findAll({
        where: {
            userId: userId,
            status: "ACTIVE",
        },
        include: [
            {
                model: db_1.models.investmentPlan,
                as: "plan",
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!response || response.length === 0) {
        throw (0, error_1.createError)({ statusCode: 404, message: "No active investments found" });
    }
    return response.map(inv => inv.get({ plain: true }));
}
