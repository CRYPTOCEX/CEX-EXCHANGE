"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes wallets by UUIDs",
    operationId: "bulkDeleteWallets",
    tags: ["Admin", "Wallets"],
    parameters: (0, query_1.commonBulkDeleteParams)("wallet"),
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
                            description: "Array of wallet UUIDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("wallet"),
    requiresAuth: true,
    permission: "delete.withdraw.method",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Withdraw Methods",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Bulk deleting withdraw methods");
    const result = await (0, query_1.handleBulkDelete)({
        model: "withdrawMethod",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw methods deleted successfully");
    return result;
};
