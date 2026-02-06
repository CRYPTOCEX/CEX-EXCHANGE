"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of an exchange currency",
    operationId: "updateExchangeCurrencyStatus",
    tags: ["Admin", "Exchange Currencies"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the exchange currency to update",
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
    responses: (0, query_1.updateRecordResponses)("Exchange Currency"),
    requiresAuth: true,
    permission: "edit.spot.currency",
    logModule: "ADMIN_FIN",
    logTitle: "Update spot currency status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching spot currency record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating spot currency status");
    const result = await (0, query_1.updateStatus)("exchangeCurrency", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Spot currency status updated successfully");
    return result;
};
