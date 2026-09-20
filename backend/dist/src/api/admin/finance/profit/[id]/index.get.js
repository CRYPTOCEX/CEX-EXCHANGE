"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Fetches a specific Admin Profit record",
    operationId: "getAdminProfitById",
    tags: ["Admin", "Finance", "Profits"],
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the Admin Profit to fetch",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Admin Profit details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.adminProfitSchema,
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "view.admin.profit",
};
exports.default = async (data) => {
    const { params } = data;
    const { id } = params;
    return await (0, query_1.getRecord)("adminProfit", id);
};
