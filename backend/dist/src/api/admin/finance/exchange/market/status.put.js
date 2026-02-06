"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of Ecosystem Markets",
    operationId: "bulkUpdateEcosystemMarketStatus",
    tags: ["Admin", "Ecosystem Markets"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of market IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the markets (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecosystem Market"),
    requiresAuth: true,
    permission: "edit.ecosystem.market",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Exchange Market Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating market status");
    const result = await (0, query_1.updateStatus)("exchangeMarket", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
