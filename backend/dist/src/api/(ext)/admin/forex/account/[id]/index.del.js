"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex account",
    operationId: "deleteForexAccount",
    tags: ["Admin", "Forex", "Account"],
    description: "Permanently deletes a specific Forex account by its ID. This operation cannot be undone.",
    parameters: (0, query_1.deleteRecordParams)("Forex account"),
    responses: (0, query_1.deleteRecordResponses)("Forex account"),
    permission: "delete.forex.account",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex account",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex account ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting forex account ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexAccount",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex account deleted successfully");
    return result;
};
