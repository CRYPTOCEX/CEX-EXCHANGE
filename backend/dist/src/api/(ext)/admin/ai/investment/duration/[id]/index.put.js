"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update an AI investment duration",
    operationId: "updateAiInvestmentDuration",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Updates a specific AI investment duration by ID. Allows modification of the duration value and timeframe type.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the AI Investment Duration to update",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated duration data",
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentDurationUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment Duration"),
    requiresAuth: true,
    permission: "edit.ai.investment.duration",
    logModule: "ADMIN_AI",
    logTitle: "Update investment duration",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { duration, timeframe } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating duration ${id}`);
    const result = await (0, query_1.updateRecord)("aiInvestmentDuration", id, {
        duration,
        timeframe,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Duration updated successfully");
    return result;
};
