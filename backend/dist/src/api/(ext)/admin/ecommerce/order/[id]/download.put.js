"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Adds download details to an order item",
    description: "Adds or updates the download details for a specific order item.",
    operationId: "addDownloadDetails",
    tags: ["Admin", "Ecommerce Orders"],
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Add order download details",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        orderItemId: { type: "string", description: "Order Item ID" },
                        key: { type: "string", description: "License Key", nullable: true },
                        filePath: {
                            type: "string",
                            description: "Download File Path",
                            nullable: true,
                        },
                        instructions: {
                            type: "string",
                            description: "Instructions for the download",
                            nullable: true,
                        },
                    },
                    required: ["orderItemId"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Order Item"),
    permission: "view.ecommerce.order",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { orderItemId, key, filePath, instructions } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order item ID");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding order item: ${orderItemId}`);
        const orderItem = await db_1.models.ecommerceOrderItem.findByPk(orderItemId);
        if (!orderItem) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Order item not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating download details");
        await orderItem.update({ key, filePath, instructions }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Download details added/updated successfully");
        return { message: "Download details added/updated successfully" };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update download details");
        await transaction.rollback();
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
