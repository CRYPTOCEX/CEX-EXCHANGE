"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a wallet",
    operationId: "deleteWallet",
    tags: ["Admin", "Wallets"],
    parameters: (0, query_1.deleteRecordParams)("wallet"),
    responses: (0, query_1.deleteRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "delete.withdraw.method",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Withdraw Method",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting withdraw method");
    const result = await (0, query_1.handleSingleDelete)({
        model: "withdrawMethod",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw method deleted successfully");
    return result;
};
