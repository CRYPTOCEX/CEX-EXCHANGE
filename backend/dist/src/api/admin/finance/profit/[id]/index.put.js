"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific Admin Profit record",
    operationId: "updateAdminProfit",
    tags: ["Admin", "Finance", "Profits"],
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the Admin Profit to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Admin Profit",
        content: {
            "application/json": {
                schema: utils_1.adminProfitUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Admin Profit updated successfully",
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
    permission: "edit.admin.profit",
    logModule: "ADMIN_FIN",
    logTitle: "Update Admin Profit",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    return await (0, query_1.updateRecord)("adminProfit", id, body);
};
