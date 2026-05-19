"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Forex accounts",
    operationId: "bulkDeleteForexAccounts",
    tags: ["Admin", "Forex", "Account"],
    description: "Deletes multiple Forex accounts by their IDs. This operation permanently removes the accounts from the system.",
    parameters: (0, query_1.commonBulkDeleteParams)("Forex Accounts"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of Forex account IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Forex Accounts"),
    requiresAuth: true,
    permission: "delete.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk delete forex accounts",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex account IDs`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} forex accounts`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "forexAccount",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} forex accounts`);
    return result;
};
