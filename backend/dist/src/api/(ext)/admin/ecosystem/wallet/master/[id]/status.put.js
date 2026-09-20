"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update master wallet status",
    description: "Updates the operational status of a specific ecosystem master wallet. Active wallets can process transactions and manage custodial wallets, while inactive wallets are disabled.",
    operationId: "updateEcosystemMasterWalletStatus",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the master wallet to update",
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
    responses: (0, query_1.updateRecordResponses)("Ecosystem Master Wallet"),
    requiresAuth: true,
    permission: "edit.ecosystem.master.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Update Master Wallet Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating Master Wallet Status");
    const result = await (0, query_1.updateStatus)("ecosystemMasterWallet", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Master wallet ${id} status updated to ${status ? 'active' : 'inactive'}`);
    return result;
};
