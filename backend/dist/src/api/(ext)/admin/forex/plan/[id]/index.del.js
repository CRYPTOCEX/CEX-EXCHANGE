"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex plan",
    description: "Deletes a specific Forex plan by its ID. This will cascade delete to associated plan durations and investments.",
    operationId: "deleteForexPlan",
    tags: ["Admin", "Forex", "Plan"],
    parameters: (0, query_1.deleteRecordParams)("Forex plan"),
    responses: (0, query_1.deleteRecordResponses)("Forex plan"),
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex plan",
    permission: "delete.forex.plan",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating record ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting record ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexPlan",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Record deleted successfully");
    return result;
};
