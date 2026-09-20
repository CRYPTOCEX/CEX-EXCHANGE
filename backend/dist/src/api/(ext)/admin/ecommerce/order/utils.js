"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceOrderUpdateSchema = exports.baseEcommerceOrderSchema = exports.ecommerceOrderSchema = void 0;
exports.sendOrderStatusUpdateEmail = sendOrderStatusUpdateEmail;
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the e-commerce order");
const userId = (0, schema_1.baseStringSchema)("User ID associated with the order");
const status = (0, schema_1.baseEnumSchema)("Status of the order", [
    "PENDING",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
]);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the order", true);
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the order", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the order", true);
exports.ecommerceOrderSchema = {
    id,
    userId,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.baseEcommerceOrderSchema = {
    id,
    userId,
    status,
    createdAt,
    deletedAt,
    updatedAt,
};
exports.ecommerceOrderUpdateSchema = {
    type: "object",
    properties: {
        status,
    },
    required: ["status"],
};
async function sendOrderStatusUpdateEmail(user, order, status, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Retrieving order items from database");
        const orderItems = await db_1.models.ecommerceOrderItem.findAll({
            where: { orderId: order.id },
            include: [
                {
                    model: db_1.models.ecommerceProduct,
                    as: "product",
                    attributes: ["name", "price", "currency"],
                },
            ],
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Constructing email data");
        const productDetails = orderItems
            .map((item) => {
            var _a, _b, _c, _d, _e, _f;
            return `
    <li>Product Name: ${(_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Unknown"}</li>
    <li>Quantity: ${item.quantity}</li>
    <li>Price: ${(_d = (_c = item.product) === null || _c === void 0 ? void 0 : _c.price) !== null && _d !== void 0 ? _d : 0} ${(_f = (_e = item.product) === null || _e === void 0 ? void 0 : _e.currency) !== null && _f !== void 0 ? _f : ""}</li>
  `;
        })
            .join("");
        const emailData = {
            TO: user.email,
            CUSTOMER_NAME: user.firstName,
            ORDER_NUMBER: order.id,
            ORDER_STATUS: status,
            PRODUCT_DETAILS: productDetails,
        };
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Adding email to queue");
        await emails_1.emailQueue.add({ emailData, emailType: "OrderStatusUpdate" });
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Order status update email sent successfully");
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
        throw error;
    }
}
