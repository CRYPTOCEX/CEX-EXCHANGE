"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce orders",
    operationId: "bulkUpdateEcommerceOrderStatus",
    tags: ["Admin", "Ecommerce Orders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce order IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the ecommerce orders",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk update order status",
};
exports.default = async (data) => require("./transition-orders").transitionOrders(data.body.ids, data.body.status, data.ctx);
