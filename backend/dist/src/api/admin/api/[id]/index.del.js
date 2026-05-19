"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific API key",
    operationId: "deleteApiKey",
    tags: ["Admin", "API Keys"],
    logModule: "ADMIN_API",
    logTitle: "Delete API",
    parameters: (0, query_1.deleteRecordParams)("API Key"),
    responses: (0, query_1.deleteRecordResponses)("API Key"),
    permission: "delete.api.key",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating API key ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting API key: ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "apiKey",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
