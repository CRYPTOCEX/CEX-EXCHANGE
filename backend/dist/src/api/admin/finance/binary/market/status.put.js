"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of binary markets",
    operationId: "bulkUpdateBinaryMarketStatus",
    tags: ["Admin", "Binary Markets"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of binary market IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the binary markets (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Market"),
    requiresAuth: true,
    permission: "edit.binary.market",
    logModule: "ADMIN_BINARY",
    logTitle: "Bulk update binary market status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} binary market(s)`);
    const result = await (0, query_1.updateStatus)("binaryMarket", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market status updated successfully");
    return result;
};
