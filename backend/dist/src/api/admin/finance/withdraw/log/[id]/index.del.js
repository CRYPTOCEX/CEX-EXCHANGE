"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a transaction",
    operationId: "deleteTransaction",
    tags: ["Admin", "Transaction"],
    parameters: (0, query_1.deleteRecordParams)("transaction"),
    responses: (0, query_1.deleteRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "delete.withdraw",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Withdraw Log",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated admin profit");
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: params.id,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting withdraw log");
    const result = await (0, query_1.handleSingleDelete)({
        model: "transaction",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw log deleted successfully");
    return result;
};
