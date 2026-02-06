"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a binary market",
    operationId: "deleteBinaryMarket",
    tags: ["Admin", "Binary Market"],
    parameters: (0, query_1.deleteRecordParams)("binary market"),
    responses: (0, query_1.deleteRecordResponses)("Binary Market"),
    requiresAuth: true,
    permission: "delete.binary.market",
    logModule: "ADMIN_BINARY",
    logTitle: "Delete binary market",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary market record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting binary market");
    const result = await (0, query_1.handleSingleDelete)({
        model: "binaryMarket",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market deleted successfully");
    return result;
};
