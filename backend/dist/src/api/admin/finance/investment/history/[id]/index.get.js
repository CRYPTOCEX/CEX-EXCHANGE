"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific Investment by ID",
    operationId: "getInvestmentById",
    tags: ["Admin", "Investments"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "investment details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseInvestmentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Investment"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.investment",
    requiresAuth: true,
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("investment", params.id, [
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
    ]);
};
