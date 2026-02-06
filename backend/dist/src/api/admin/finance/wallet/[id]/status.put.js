"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a wallet",
    operationId: "updateWalletStatus",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the wallet to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Update Wallet Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    const result = await (0, query_1.updateStatus)("wallet", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet status updated successfully");
    return result;
};
