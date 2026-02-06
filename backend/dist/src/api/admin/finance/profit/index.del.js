"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes Admin Profits by IDs",
    operationId: "bulkDeleteAdminProfits",
    tags: ["Admin", "Finance", "Profits"],
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
                            description: "Array of Admin Profit IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Admin Profits deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "delete.admin.profit",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Admin Profits",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    return (0, query_1.handleBulkDelete)({
        model: "adminProfit",
        ids,
        query,
    });
};
