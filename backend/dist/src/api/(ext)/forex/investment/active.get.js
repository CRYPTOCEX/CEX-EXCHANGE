"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves active Forex investments for the logged-in user",
    description: "Fetches active Forex investments associated with the currently authenticated user.",
    operationId: "getActiveForexInvestments",
    tags: ["Forex", "Investments"],
    logModule: "FOREX",
    logTitle: "Get Active Investments",
    responses: {
        200: {
            description: "Active Forex investments retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseForexInvestmentSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investment"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Active Investments");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const activeInvestments = await db_1.models.forexInvestment.findAll({
        where: { userId: user.id, status: "ACTIVE" },
        include: [
            {
                model: db_1.models.forexPlan,
                as: "plan",
                attributes: [
                    "id",
                    "name",
                    "title",
                    "description",
                    "profitPercentage",
                    "image",
                ],
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "avatar", "firstName", "lastName"],
            },
            {
                model: db_1.models.forexDuration,
                as: "duration",
                attributes: ["id", "duration", "timeframe"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Active Investments fetched successfully");
    return activeInvestments;
};
