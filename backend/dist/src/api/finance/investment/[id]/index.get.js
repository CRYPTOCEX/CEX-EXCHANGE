"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a single investment by UUID",
    description: "Fetches detailed information about a specific investment identified by its UUID, including associated plan and user details.",
    operationId: "getInvestment",
    tags: ["Finance", "Investment"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The Id of the investment to retrieve",
            schema: { type: "string" },
        },
        {
            name: "type",
            in: "query",
            description: "The type of investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Investment retrieved successfully",
            content: {
                "application/json": {
                    schema: {
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investment"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { id } = params;
    const { type } = query;
    if (!type || typeof type !== "string") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment type" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${type} investment ${id}`);
    let model, planModel, durationModel;
    switch (type.toLowerCase()) {
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
    }
    const response = await model.findOne({
        where: { id, userId: user.id },
        include: [
            {
                model: planModel,
                as: "plan",
            },
            {
                model: durationModel,
                as: "duration",
            },
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!response) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment retrieved successfully");
    return response.get({ plain: true });
};
