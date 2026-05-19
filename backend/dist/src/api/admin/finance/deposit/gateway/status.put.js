"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of deposit gateways",
    operationId: "bulkUpdateDepositGatewayStatus",
    tags: ["Admin", "Deposit Gateways"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of deposit gateway IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the deposit gateways (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Deposit Gateway"),
    requiresAuth: true,
    permission: "edit.deposit.gateway",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk update deposit gateway status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} deposit gateway(s)`);
    const result = await (0, query_1.updateStatus)("depositGateway", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit gateway status updated successfully");
    return result;
};
