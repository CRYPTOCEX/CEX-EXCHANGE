"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update custodial wallet",
    description: "Updates the configuration of a specific ecosystem custodial wallet. Currently supports updating the wallet status.",
    operationId: "updateEcosystemCustodialWalletStatus",
    tags: ["Admin", "Ecosystem", "Wallet"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the custodial wallet to update",
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
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem Custodial Wallet"),
    requiresAuth: true,
    permission: "edit.ecosystem.custodial.wallet",
    logModule: "ADMIN_ECO",
    logTitle: "Update Custodial Wallet",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating Custodial Wallet Status");
    const result = await (0, query_1.updateStatus)("ecosystemCustodialWallet", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Custodial wallet ${id} status updated`);
    return result;
};
