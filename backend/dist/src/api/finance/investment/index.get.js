"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists all investments",
    description: "Fetches a comprehensive list of all investments made by users, including details of the investment plan and user information.",
    operationId: "listAllInvestments",
    tags: ["Finance", "Investment"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "type",
            in: "query",
            description: "The type of investment to retrieve",
            schema: { type: "string" },
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
                            data: {
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
                            pagination: constants_1.paginationSchema,
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
    const { user } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { type, ...query } = data.query;
    if (type && !query.page) {
        return await getActiveInvestment(user.id, type);
    }
    let model, planModel, durationModel;
    switch (type === null || type === void 0 ? void 0 : type.toLowerCase()) {
        case "general":
            model = db_1.models.investment;
            planModel = db_1.models.investmentPlan;
            durationModel = db_1.models.investmentDuration;
            break;
        case "forex":
            model = db_1.models.forexInvestment;
            planModel = db_1.models.forexPlan;
            durationModel = db_1.models.forexDuration;
            break;
        default:
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid investment type",
            });
    }
    return (0, query_1.getFiltered)({
        model,
        query,
        where: { userId: user.id },
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: planModel,
                as: "plan",
                attributes: ["id", "title", "image", "currency"],
            },
            {
                model: durationModel,
                as: "duration",
                attributes: ["id", "duration", "timeframe"],
            },
        ],
        numericFields: ["amount", "profit"],
    });
};
async function getActiveInvestment(userId, type) {
    let model, durationModel;
    switch (type.toLowerCase()) {
        case "general":
            model = db_1.models.investment;
            durationModel = db_1.models.investmentDuration;
            break;
        case "forex":
            model = db_1.models.forexInvestment;
            durationModel = db_1.models.forexDuration;
            break;
    }
    const response = await model.findAll({
        where: { userId, status: "ACTIVE" },
        include: [
            {
                model: durationModel,
                as: "duration",
            },
        ],
        attributes: { exclude: ["userId"] },
    });
    if (!response || response.length === 0) {
        throw (0, error_1.createError)({ statusCode: 404, message: "No active investments found" });
    }
    return response.map(inv => inv.get({ plain: true }));
}
