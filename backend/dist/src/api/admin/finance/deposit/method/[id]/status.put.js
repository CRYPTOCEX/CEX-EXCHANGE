"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a deposit method",
    operationId: "updateDepositMethodStatus",
    tags: ["Admin", "Deposit Methods"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the deposit method to update",
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
    responses: (0, query_1.updateRecordResponses)("Deposit Method"),
    requiresAuth: true,
    permission: "edit.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Update deposit method status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit method record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating deposit method status");
    const result = await (0, query_1.updateStatus)("depositMethod", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit method status updated successfully");
    return result;
};
