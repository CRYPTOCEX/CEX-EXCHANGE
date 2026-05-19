"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk update custodial wallet status",
    description: "Updates the status of multiple ecosystem custodial wallets simultaneously. Can be used to activate, deactivate, or suspend wallets in bulk.",
    operationId: "bulkUpdateEcosystemCustodialWalletStatus",
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
                            description: "Array of ecosystem custodial wallet IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
                            description: "New status to apply (ACTIVE, INACTIVE, or SUSPENDED)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem Custodial Wallet"),
    requiresAuth: true,
    permission: "edit.ecosystem.custodial.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Bulk Update Custodial Wallet Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating Custodial Wallet Status");
    const result = await (0, query_1.updateStatus)("ecosystemCustodialWallet", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated status for ${Array.isArray(ids) ? ids.length : 1} custodial wallet(s)`);
    return result;
};
