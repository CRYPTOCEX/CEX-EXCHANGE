"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of deposit methods",
    operationId: "bulkUpdateDepositMethodStatus",
    tags: ["Admin", "Deposit Methods"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of deposit method IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the deposit methods (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("DepositMethod"),
    requiresAuth: true,
    permission: "edit.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk update deposit method status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} deposit method(s)`);
    const result = await (0, query_1.updateStatus)("depositMethod", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit method status updated successfully");
    return result;
};
