"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates Forex account status",
    operationId: "bulkUpdateForexAccountStatus",
    tags: ["Admin", "Forex", "Account"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of forex account IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the forex accounts (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Account"),
    requiresAuth: true,
    permission: "edit.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk update forex account status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex account IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status ? "active" : "inactive"} for ${ids.length} forex accounts`);
    const result = await (0, query_1.updateStatus)("forexAccount", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} forex accounts`);
    return result;
};
