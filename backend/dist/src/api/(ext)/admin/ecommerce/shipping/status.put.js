"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce Shipping",
    operationId: "bulkUpdateEcommerceShippingtatus",
    tags: ["Admin", "Ecommerce Shipping"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce shipping IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
                            description: "New status to apply to the ecommerce Shipping",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Shipping"),
    requiresAuth: true,
    permission: "edit.ecommerce.shipping",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk Update E-commerce Shipping Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating shipping records");
    const Shipping = await db_1.models.ecommerceShipping.findAll({
        where: { id: ids },
    });
    if (!Shipping.length) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Shipping not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce shipping status");
    const result = await (0, query_1.updateStatus)("ecommerceShipping", ids, status, "loadStatus", "Shipping", async () => {
        try {
        }
        catch (error) {
            console.error("Failed to perform post status update operations:", error);
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce shipping status");
    return result;
};
