"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes transactions by IDs",
    operationId: "bulkDeleteTransactions",
    tags: ["Admin", "Transaction"],
    parameters: (0, query_1.commonBulkDeleteParams)("Transactions"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of transaction IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Transactions"),
    requiresAuth: true,
    permission: "delete.transaction",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk delete deposit logs",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit log records");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated admin profits");
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: ids,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} deposit log(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "transaction",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit logs deleted successfully");
    return result;
};
