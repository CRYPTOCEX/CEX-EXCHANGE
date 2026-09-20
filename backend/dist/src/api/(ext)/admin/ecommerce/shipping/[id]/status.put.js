"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates the status of an E-commerce Shipping",
    operationId: "updateEcommerceShippingtatus",
    tags: ["Admin", "Ecommerce Shipping"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the E-commerce shipping to update",
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
                            enum: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("E-commerce Shipping"),
    requiresAuth: true,
    permission: "edit.ecommerce.shipping",
    logModule: "ADMIN_ECOM",
    logTitle: "Update E-commerce Shipping Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating shipping record");
    const shipping = await db_1.models.ecommerceShipping.findByPk(id);
    if (!shipping) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Shipping record not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce shipping status");
    const result = await (0, query_1.updateStatus)("ecommerceShipping", id, status, "loadStatus", "Shipping", async () => {
        try {
        }
        catch (error) {
            console.error("Failed to perform post status update operations:", error);
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce shipping status");
    return result;
};
