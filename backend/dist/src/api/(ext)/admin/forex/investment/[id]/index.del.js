"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex investment",
    description: "Deletes a specific Forex investment record by its ID. This permanently removes the investment data.",
    operationId: "deleteForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    parameters: (0, query_1.deleteRecordParams)("Forex investment"),
    responses: (0, query_1.deleteRecordResponses)("Forex investment"),
    permission: "delete.forex.investment",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex investment",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex investment ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting forex investment ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexInvestment",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment deleted successfully");
    return result;
};
