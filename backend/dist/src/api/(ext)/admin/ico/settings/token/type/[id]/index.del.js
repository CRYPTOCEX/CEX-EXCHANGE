"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Delete ICO Token Type",
    description: "Deletes a specific token type configuration by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
    operationId: "deleteIcoTokenType",
    tags: ["Admin", "ICO", "Settings"],
    parameters: (0, query_1.deleteRecordParams)("Token Type Configuration"),
    responses: (0, query_1.deleteRecordResponses)("Token Type Configuration"),
    permission: "edit.ico.settings",
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Delete token type",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token type");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting token type");
    const result = await (0, query_1.handleSingleDelete)({
        model: "icoTokenType",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token type deleted successfully");
    return result;
};
