"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Adds a shipping address to an order",
    description: "Adds or updates the shipping address for a specific order.",
    operationId: "addShippingAddress",
    tags: ["Admin", "Ecommerce Orders"],
    requiresAuth: true,
    logModule: "ADMIN_ECOM",
    logTitle: "Add shipping address",
    parameters: [
        {
            index: 0,
            in: "path",
            name: "id",
            required: true,
            description: "Order ID",
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
                        shippingAddress: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                street: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                postalCode: { type: "string" },
                                country: { type: "string" },
                            },
                            required: [
                                "name",
                                "email",
                                "phone",
                                "street",
                                "city",
                                "state",
                                "postalCode",
                                "country",
                            ],
                        },
                    },
                    required: ["shippingAddress"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Shipping Address"),
    permission: "edit.ecommerce.order",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { shippingAddress } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order ID");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding order: ${id}`);
        const order = await db_1.models.ecommerceOrder.findByPk(id);
        if (!order) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing shipping address");
        const existingAddress = await db_1.models.ecommerceShippingAddress.findOne({
            where: { orderId: id },
        });
        if (existingAddress) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating existing shipping address");
            await existingAddress.update(shippingAddress, { transaction });
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new shipping address");
            await db_1.models.ecommerceShippingAddress.create({ orderId: id, ...shippingAddress }, { transaction });
        }
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Shipping address added/updated successfully");
        return { message: "Shipping address added/updated successfully" };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to add/update shipping address");
        await transaction.rollback();
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
