"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates the status of an E-commerce Order",
    operationId: "updateEcommerceOrderStatus",
    tags: ["Admin", "Ecommerce Orders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the E-commerce order to update",
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
                            type: "string",
                            enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("E-commerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Update order status",
};
exports.default = async (data) => require("../transition-orders").transitionOrders([data.params.id], data.body.status, data.ctx);
