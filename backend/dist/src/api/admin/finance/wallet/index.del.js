"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes wallets by IDs",
    operationId: "bulkDeleteWallets",
    tags: ["Admin", "Wallets"],
    parameters: (0, query_1.commonBulkDeleteParams)("Wallets"),
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
                            description: "Array of wallet IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Wallets"),
    requiresAuth: true,
    permission: "delete.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Wallets",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting wallets");
    const result = await (0, query_1.handleBulkDelete)({
        model: "wallet",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallets deleted successfully");
    return result;
};
