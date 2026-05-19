"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex duration",
    description: "Deletes a specific Forex duration configuration by its ID. This will cascade delete to associated plan durations and investments.",
    operationId: "deleteForexDuration",
    tags: ["Admin", "Forex", "Duration"],
    parameters: (0, query_1.deleteRecordParams)("Forex duration"),
    responses: (0, query_1.deleteRecordResponses)("Forex duration"),
    permission: "delete.forex.duration",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex duration",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex duration ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting forex duration ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexDuration",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex duration deleted successfully");
    return result;
};
