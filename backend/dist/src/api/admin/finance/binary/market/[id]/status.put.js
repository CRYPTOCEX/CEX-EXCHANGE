"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update Status for a Binary Market",
    operationId: "updateBinaryMarketStatus",
    tags: ["Admin", "Binary Markets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Binary Market to update",
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
                            description: "New status to apply to the Binary Market (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Market"),
    requiresAuth: true,
    permission: "edit.binary.market",
    logModule: "ADMIN_BINARY",
    logTitle: "Update binary market status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary market record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating binary market status");
    const result = await (0, query_1.updateStatus)("binaryMarket", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary market status updated successfully");
    return result;
};
