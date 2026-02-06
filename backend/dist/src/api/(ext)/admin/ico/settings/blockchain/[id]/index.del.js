"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Delete ICO Blockchain Configuration",
    description: "Deletes a specific blockchain configuration by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
    operationId: "deleteIcoBlockchain",
    tags: ["Admin", "ICO", "Settings"],
    parameters: (0, query_1.deleteRecordParams)("Blockchain Configuration"),
    responses: (0, query_1.deleteRecordResponses)("Blockchain Configuration"),
    permission: "edit.ico.settings",
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Delete blockchain configuration",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blockchain configuration");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting blockchain configuration");
    const result = await (0, query_1.handleSingleDelete)({
        model: "icoBlockchain",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain configuration deleted successfully");
    return result;
};
