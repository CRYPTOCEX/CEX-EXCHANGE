"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk update ecosystem UTXO status",
    operationId: "bulkUpdateEcosystemUtxoStatus",
    tags: ["Admin", "Ecosystem", "UTXO"],
    description: "Bulk updates the operational status of multiple ecosystem UTXOs. This endpoint allows administrators to activate or deactivate multiple UTXOs simultaneously by providing an array of UTXO IDs and the desired status. Useful for managing UTXO availability across the ecosystem.",
    logModule: "ADMIN_ECO",
    logTitle: "Bulk update UTXO status",
    requestBody: {
        required: true,
        description: "Array of UTXO IDs and the new status to apply (true for active/available, false for inactive/spent)",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecosystem UTXO IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New operational status (true for active/available, false for inactive/spent)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem UTXO"),
    requiresAuth: true,
    permission: "edit.ecosystem.utxo",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} UTXO(s) to ${status}`);
    const result = await (0, query_1.updateStatus)("ecosystemUtxo", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Status updated for ${ids.length} UTXO(s)`);
    return result;
};
