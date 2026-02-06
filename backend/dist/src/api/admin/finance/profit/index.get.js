"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Fetches a list of Admin Profits",
    operationId: "getAdminProfits",
    tags: ["Admin", "Finance", "Profits"],
    responses: {
        200: {
            description: "List of Admin Profits",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.adminProfitSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
    permission: "view.admin.profit",
};
exports.default = async (data) => {
    const { query } = data;
    return await (0, query_1.getFiltered)({
        model: db_1.models.adminProfit,
        query,
        numericFields: ["amount"],
        excludeFields: [],
        paranoid: false,
    });
};
