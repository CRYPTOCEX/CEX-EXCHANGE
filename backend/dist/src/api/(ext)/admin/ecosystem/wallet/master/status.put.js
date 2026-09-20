"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk update master wallet status",
    description: "Updates the status of multiple ecosystem master wallets simultaneously. Active wallets can process transactions and manage custodial wallets, while inactive wallets are disabled.",
    operationId: "bulkUpdateEcosystemMasterWalletStatus",
    tags: ["Admin", "Ecosystem", "Wallet"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecosystem master wallet IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE"],
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem Master Wallet"),
    requiresAuth: true,
    permission: "edit.ecosystem.master.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Bulk Update Master Wallet Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating Master Wallet Status");
    const result = await (0, query_1.updateStatus)("ecosystemMasterWallet", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated status for ${Array.isArray(ids) ? ids.length : 1} master wallet(s)`);
    return result;
};
