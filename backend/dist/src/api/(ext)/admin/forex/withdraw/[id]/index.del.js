"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex withdrawal transaction",
    description: "Deletes a specific Forex withdrawal transaction by its ID. This also removes associated admin profit records.",
    operationId: "deleteForexWithdrawal",
    tags: ["Admin", "Forex", "Withdraw"],
    parameters: (0, query_1.deleteRecordParams)("transaction"),
    responses: (0, query_1.deleteRecordResponses)("Transaction"),
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex withdrawal",
    requiresAuth: true,
    permission: "delete.forex.withdraw",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating record ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting record ${params.id}`);
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: params.id,
        },
    });
    const result = await (0, query_1.handleSingleDelete)({
        model: "transaction",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Record deleted successfully");
    return result;
};
