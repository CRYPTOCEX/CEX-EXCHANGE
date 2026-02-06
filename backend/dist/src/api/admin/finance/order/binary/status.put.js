"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of binary orders",
    operationId: "bulkUpdateBinaryOrderStatus",
    tags: ["Admin", "Binary Orders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of binary order IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply to the binary orders",
                            enum: ["PENDING", "WIN", "LOSS", "DRAW"],
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Order"),
    requiresAuth: true,
    permission: "edit.binary.order",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Binary Order Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update Binary Order Status...");
    const result = await (0, query_1.updateStatus)("binaryOrder", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk Update Binary Order Status completed successfully");
    return result;
};
