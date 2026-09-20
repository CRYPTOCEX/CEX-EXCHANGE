"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex deposits",
    operationId: "bulkDeleteForexDeposits",
    tags: ["Admin", "Forex", "Deposit"],
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
    permission: "delete.forex.deposit",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex deposits",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex deposit IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting associated admin profits");
    await db_1.models.adminProfit.destroy({
        where: {
            transactionId: ids,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} forex deposits`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "transaction",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} forex deposits`);
    return result;
};
