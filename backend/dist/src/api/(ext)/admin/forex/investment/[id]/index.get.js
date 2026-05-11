"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Gets a specific Forex investment",
    description: "Retrieves detailed information about a specific Forex investment by its ID, including associated user, plan, and duration details.",
    operationId: "getForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Forex investment details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseForexInvestmentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investment"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.forex.investment",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Get Forex Investment",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching forex investment record");
    const result = await (0, query_1.getRecord)("forexInvestment", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
            model: db_1.models.forexPlan,
            as: "plan",
            attributes: ["id", "title"],
        },
        {
            model: db_1.models.forexDuration,
            as: "duration",
            attributes: ["id", "duration", "timeframe"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved forex investment");
    return result;
};
