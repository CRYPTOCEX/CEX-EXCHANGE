"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Get an AI investment duration by ID",
    operationId: "getAiInvestmentDurationById",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Retrieves detailed information of a specific AI investment duration by its ID. Returns the duration value and timeframe type.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Investment Duration to retrieve",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "AI Investment Duration details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseAIInvestmentDurationSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("AI Investment Duration"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ai.investment.duration",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Get investment duration",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching duration ${params.id}`);
    const result = await (0, query_1.getRecord)("aiInvestmentDuration", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Duration retrieved");
    return result;
};
