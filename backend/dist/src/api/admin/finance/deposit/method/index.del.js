"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes deposit methods by IDs",
    operationId: "bulkDeleteDepositMethods",
    tags: ["Admin", "Deposit Methods"],
    parameters: (0, query_1.commonBulkDeleteParams)("Deposit Methods"),
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
                            description: "Array of deposit method IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Deposit Methods"),
    requiresAuth: true,
    permission: "delete.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk delete deposit methods",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} deposit method(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "depositMethod",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit methods deleted successfully");
    return result;
};
