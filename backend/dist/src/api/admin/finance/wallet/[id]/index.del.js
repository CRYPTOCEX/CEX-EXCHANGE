"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a wallet",
    operationId: "deleteWallet",
    tags: ["Admin", "Wallet"],
    parameters: (0, query_1.deleteRecordParams)("wallet"),
    responses: (0, query_1.deleteRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "delete.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Wallet",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting wallet");
    const result = await (0, query_1.handleSingleDelete)({
        model: "wallet",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet deleted successfully");
    return result;
};
