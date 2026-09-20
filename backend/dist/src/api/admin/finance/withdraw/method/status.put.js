"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of withdraw methods",
    operationId: "bulkUpdateWithdrawaethodStatus",
    tags: ["Admin", "Withdraw Methods"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of withdraw method IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the withdraw methods (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Withdraw Method"),
    requiresAuth: true,
    permission: "edit.withdraw.method",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Method Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Bulk updating withdraw method status");
    const result = await (0, query_1.updateStatus)("withdrawMethod", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw method status updated successfully");
    return result;
};
