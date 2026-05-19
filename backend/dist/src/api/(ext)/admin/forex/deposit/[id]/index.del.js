"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex deposit",
    operationId: "deleteForexDeposit",
    tags: ["Admin", "Forex", "Deposit"],
    description: "Permanently deletes a specific Forex deposit transaction by its ID. Also removes associated admin profit records.",
    parameters: (0, query_1.deleteRecordParams)("transaction"),
    responses: (0, query_1.deleteRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "delete.forex.deposit",
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex deposit",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex deposit ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated admin profit");
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: params.id,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting forex deposit ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "transaction",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex deposit deleted successfully");
    return result;
};
