"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves detailed information of a specific AI Investment by ID",
    operationId: "getAIInvestmentById",
    tags: ["Admin", "AI Investments"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Investment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "AI Investment details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseAIInvestmentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ai.investment",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get AI investment",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching investment ${params.id}`);
    const result = await (0, query_1.getRecord)("aiInvestment", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
            model: db_1.models.aiInvestmentPlan,
            as: "plan",
            attributes: ["title", "image"],
        },
        {
            model: db_1.models.aiInvestmentDuration,
            as: "duration",
            attributes: ["duration", "timeframe"],
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment retrieved");
    return result;
};
