"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a deposit gateway",
    operationId: "updateDepositGatewayStatus",
    tags: ["Admin", "Deposit Gateways"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the deposit gateway to update",
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
    responses: (0, query_1.updateRecordResponses)("Deposit Gateway"),
    requiresAuth: true,
    permission: "edit.deposit.gateway",
    logModule: "ADMIN_FIN",
    logTitle: "Update deposit gateway status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit gateway record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating deposit gateway status");
    const result = await (0, query_1.updateStatus)("depositGateway", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit gateway status updated successfully");
    return result;
};
