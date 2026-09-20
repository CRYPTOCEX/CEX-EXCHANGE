"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a fiat currency",
    operationId: "updateFiatCurrencyStatus",
    tags: ["Admin", "Currencies"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the currency to update",
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
    responses: (0, query_1.updateRecordResponses)("Fiat Currency"),
    requiresAuth: true,
    permission: "edit.fiat.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Update fiat currency status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching fiat currency record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating fiat currency status");
    const result = await (0, query_1.updateStatus)("currency", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Fiat currency status updated successfully");
    return result;
};
