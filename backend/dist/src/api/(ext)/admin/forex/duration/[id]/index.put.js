"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a Forex duration",
    description: "Updates an existing Forex duration configuration by its ID. Changes to duration values or timeframes will affect future investments.",
    operationId: "updateForexDuration",
    tags: ["Admin", "Forex", "Duration"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Forex Duration to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Forex Duration",
        content: {
            "application/json": {
                schema: utils_1.forexDurationUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Duration"),
    requiresAuth: true,
    permission: "edit.forex.duration",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex duration",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { duration, timeframe } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex duration data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex duration ${id}`);
    const result = await (0, query_1.updateRecord)("forexDuration", id, {
        duration,
        timeframe,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex duration updated successfully");
    return result;
};
