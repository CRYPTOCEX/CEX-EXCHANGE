"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("../../admin/forex/investment/utils");
exports.metadata = {
    summary: "Lists user's Forex Investments with pagination and optional filtering",
    operationId: "listUserForexInvestments",
    tags: ["Forex", "Investments"],
    logModule: "FOREX",
    logTitle: "Get Forex Investments",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of user's Forex Investments with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.forexInvestmentSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investments"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Forex Investments");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Forex Investments fetched successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.forexInvestment,
        query,
        where: { userId: user.id },
        sortField: query.sortField || "createdAt",
        includeModels: [
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
                model: db_1.models.forexDuration,
                as: "duration",
                attributes: ["id", "duration", "timeframe"],
            },
        ],
        numericFields: ["amount", "profit"],
    });
};
