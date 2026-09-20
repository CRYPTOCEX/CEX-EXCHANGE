"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes a transaction",
    operationId: "deleteTransaction",
    tags: ["Admin", "Transaction"],
    parameters: (0, query_1.deleteRecordParams)("transaction"),
    responses: (0, query_1.deleteRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "delete.deposit",
    logModule: "ADMIN_FIN",
    logTitle: "Delete deposit log",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit log record");
    const transaction = await db_1.models.transaction.findByPk(params.id);
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Deposit log not found" });
    }
    if (transaction.status === "COMPLETED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot delete a completed deposit log",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated admin profit");
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: params.id,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting deposit log");
    const result = await (0, query_1.handleSingleDelete)({
        model: "transaction",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit log deleted successfully");
    return result;
};
