"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Stores a new Admin Profit",
    operationId: "storeAdminProfit",
    tags: ["Admin", "Finance", "Profits"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.adminProfitStoreSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Admin Profit created successfully",
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
    permission: "create.admin.profit",
    logModule: "ADMIN_FIN",
    logTitle: "Create Admin Profit",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    return await (0, query_1.storeRecord)({
        model: "adminProfit",
        data: body,
    });
};
