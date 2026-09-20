"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates a specific ecommerce order",
    operationId: "updateEcommerceOrder",
    tags: ["Admin", "Ecommerce", "Orders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce order to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the ecommerce order",
        content: {
            "application/json": {
                schema: utils_1.ecommerceOrderUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Update order",
};
exports.default = async (data) => require("../transition-orders").transitionOrders([data.params.id], data.body.status, data.ctx);
