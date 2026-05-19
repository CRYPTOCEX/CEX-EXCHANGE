"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of wallets",
    operationId: "bulkUpdateWalletStatus",
    tags: ["Admin", "Wallets"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of wallet IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the wallets (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Wallet Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet status");
    const result = await (0, query_1.updateStatus)("wallet", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet status updated successfully");
    return result;
};
