"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all Investments with pagination and optional filtering",
    operationId: "listInvestments",
    tags: ["Admin", "General", "Investments"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of Investments with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.investmentSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investments"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.investment",
    demoMask: ["data.user.email"],
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.investment,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.investmentPlan,
                as: "plan",
                attributes: ["id", "title"],
            },
            {
                model: db_1.models.investmentDuration,
                as: "duration",
                attributes: ["id", "duration", "timeframe"],
            },
        ],
        numericFields: ["amount", "profit"],
    });
};
