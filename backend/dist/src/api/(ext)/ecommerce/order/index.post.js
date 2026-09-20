"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const affiliate_1 = require("@b/utils/affiliate");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const query_1 = require("@b/utils/query");
const Middleware_1 = require("@b/handler/Middleware");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
exports.metadata = {
    summary: "Creates a new order",
    description: "Processes a new order for the logged-in user, checking inventory, wallet balance, and applying any available discounts.",
    operationId: "createEcommerceOrder",
    tags: ["Ecommerce", "Orders"],
    requiresAuth: true,
    logModule: "ECOM",
    logTitle: "Create order",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        productId: { type: "string", description: "Product ID to order" },
                        discountId: {
                            type: "string",
                            description: "Discount ID applied to the order",
                            nullable: true,
                        },
                        amount: {
                            type: "number",
                            description: "Quantity of the product to purchase",
                        },
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
                    required: ["productId", "amount"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("Order"),
};
exports.default = async (data) => {
    await Middleware_1.rateLimiters.orderCreation(data);
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { productId, discountId, amount, shippingAddress } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order request");
    if (!amount || amount <= 0 || !Number.isSafeInteger(amount)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid quantity" });
    }
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    const order = await db_1.sequelize.transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking product availability");
        const product = await db_1.models.ecommerceProduct.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Product not found" });
        }
        if (!product.status) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Product is not available" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying inventory stock");
        if (product.type === "PHYSICAL" && product.inventoryQuantity < amount) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient inventory" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading system settings for tax and shipping");
        const systemSettings = await db_1.models.settings.findAll({ transaction });
        const settings = systemSettings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {});
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating order total");
        const originalSubtotal = Number(product.price) * amount;
        if (!Number.isFinite(originalSubtotal) || originalSubtotal < 0) {
            throw (0, error_1.createError)({ statusCode: 422, message: "Product price is invalid" });
        }
        if (product.type === "PHYSICAL" && (!shippingAddress || ["name", "email", "phone", "street", "city", "state", "postalCode", "country"].some((field) => typeof shippingAddress[field] !== "string" || !shippingAddress[field].trim()))) {
            throw (0, error_1.createError)({ statusCode: 400, message: "A complete shipping address is required" });
        }
        let subtotal = originalSubtotal;
        let discountAmount = 0;
        let discountRecord = null;
        if (discountId && discountId !== "null") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Applying discount code");
            discountRecord = await db_1.models.ecommerceDiscount.findOne({
                where: {
                    id: discountId,
                    productId: productId,
                    status: true,
                    validUntil: { [sequelize_1.Op.gte]: new Date() },
                },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!discountRecord) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Discount not found or not applicable to this product" });
            }
            if (discountRecord.validFrom != null && (!Number.isFinite(new Date(discountRecord.validFrom).getTime()) || new Date(discountRecord.validFrom).getTime() > Date.now())) throw (0, error_1.createError)({ statusCode: 400, message: "Discount is not yet active" });
            if (!["PERCENTAGE", "FIXED", "FREE_SHIPPING"].includes(discountRecord.type)) throw (0, error_1.createError)({ statusCode: 422, message: "Invalid discount type" });
            if (discountRecord.maxUses != null) {
                const usageCount = await db_1.models.ecommerceUserDiscount.count({
                    where: { discountId: discountRecord.id, status: true },
                    transaction,
                });
                if (usageCount >= discountRecord.maxUses) {
                    throw (0, error_1.createError)({ statusCode: 400, message: "Discount usage limit reached" });
                }
            }
            const existingUsage = await db_1.models.ecommerceUserDiscount.findOne({
                where: { userId: user.id, discountId: discountRecord.id, status: true },
                transaction,
            });
            if (existingUsage) {
                throw (0, error_1.createError)({ statusCode: 400, message: "You have already used this discount" });
            }
            if (discountRecord.type === "PERCENTAGE") {
                const percentage = Number(discountRecord.percentage);
                if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw (0, error_1.createError)({ statusCode: 422, message: "Invalid discount percentage" });
                discountAmount = subtotal * (percentage / 100);
            }
            else if (discountRecord.type === "FIXED") {
                const fixedDiscount = Number(discountRecord.amount ?? 0);
                if (!Number.isFinite(fixedDiscount) || fixedDiscount < 0) throw (0, error_1.createError)({ statusCode: 422, message: "Invalid discount amount" });
                discountAmount = Math.min(fixedDiscount, subtotal);
            }
            subtotal -= discountAmount;
        }
        let shippingCost = 0;
        if (product.type === "PHYSICAL" && settings.ecommerceShippingEnabled === "true") {
            if ((discountRecord === null || discountRecord === void 0 ? void 0 : discountRecord.type) === "FREE_SHIPPING") {
                shippingCost = 0;
            }
            else {
                shippingCost = Number(settings.ecommerceDefaultShippingCost || "0");
            }
        }
        let taxAmount = 0;
        if (settings.ecommerceTaxEnabled === "true") {
            const taxRate = Number(settings.ecommerceDefaultTaxRate || "0") / 100;
            taxAmount = subtotal * taxRate;
        }
        if (![subtotal, shippingCost, taxAmount].every((value) => Number.isFinite(value) && value >= 0)) {
            throw (0, error_1.createError)({ statusCode: 422, message: "Invalid checkout tax or shipping configuration" });
        }
        const cost = subtotal + shippingCost + taxAmount;
        if (!Number.isFinite(cost)) throw (0, error_1.createError)({ statusCode: 422, message: "Order total is out of range" });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet balance");
        const wallet = await db_1.models.wallet.findOne({
            where: {
                userId: user.id,
                type: product.walletType,
                currency: product.currency,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (cost > 0 && (!wallet || !Number.isFinite(Number(wallet.balance)) || Number(wallet.balance) < cost)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating order record");
        const initialStatus = product.type === "DOWNLOADABLE" ? "COMPLETED" : "PENDING";
        const newOrder = await db_1.models.ecommerceOrder.create({
            userId: user.id,
            status: initialStatus,
            subtotal: originalSubtotal,
            discount: discountAmount,
            shippingCost,
            tax: taxAmount,
            total: cost,
            currency: product.currency,
            walletType: product.walletType,
        }, { transaction });
        await db_1.models.ecommerceOrderItem.create({
            orderId: newOrder.id,
            productId: productId,
            quantity: amount,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating inventory");
        if (product.type === "PHYSICAL") {
            const [updatedRows] = await db_1.models.ecommerceProduct.update({ inventoryQuantity: (0, sequelize_1.literal)(`inventoryQuantity - ${amount}`) }, {
                where: {
                    id: productId,
                    inventoryQuantity: { [sequelize_1.Op.gte]: amount },
                },
                transaction,
            });
            if (updatedRows === 0) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Product inventory changed during checkout" });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing payment");
        const description = `Purchase of ${product.name} x${amount} (${originalSubtotal.toFixed(2)}${discountAmount > 0 ? ` - ${discountAmount.toFixed(2)} discount` : ''}${shippingCost > 0 ? ` + ${shippingCost.toFixed(2)} shipping` : ''}${taxAmount > 0 ? ` + ${taxAmount.toFixed(2)} tax` : ''}) = ${cost.toFixed(2)} ${product.currency}`;
        const idempotencyKey = `ecom_order_${newOrder.id}`;
        if (cost > 0) await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: product.walletType,
            currency: product.currency,
            amount: cost,
            operationType: "ECOMMERCE_PURCHASE",
            referenceId: newOrder.id,
            description,
            metadata: {
                orderId: newOrder.id,
                productId: product.id,
                productName: product.name,
                quantity: amount,
                subtotal: originalSubtotal,
                discountAmount,
                shippingCost,
                taxAmount,
            },
            transaction,
        });
        const platformRevenue = subtotal;
        if (platformRevenue > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting ecommerce platform revenue");
            await (0, fees_1.collectPlatformFee)({
                userId: user.id,
                currency: product.currency,
                walletType: product.walletType,
                feeAmount: platformRevenue,
                type: "TRADE",
                description: `Ecommerce order revenue: ${product.name} x${amount}`,
                referenceId: newOrder.id,
                metadata: {
                    orderId: newOrder.id,
                    productId: product.id,
                    productName: product.name,
                    quantity: amount,
                    subtotal: originalSubtotal,
                    discountAmount,
                    shippingCost,
                    taxAmount,
                },
                transaction,
            });
        }
        if (discountRecord) {
            await db_1.models.ecommerceUserDiscount.upsert({ userId: user.id, discountId: discountRecord.id, status: true }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating shipping address");
        if (product.type === "PHYSICAL" && shippingAddress) {
            await db_1.models.ecommerceShippingAddress.create({
                ...Object.fromEntries(["name", "email", "phone", "street", "city", "state", "postalCode", "country"].map((field) => [field, shippingAddress[field].trim()])),
                userId: user.id,
                orderId: newOrder.id,
            }, { transaction });
        }
        return { order: newOrder, product, wallet, cost };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending confirmation email");
    try {
        await (0, emails_1.sendOrderConfirmationEmail)(userPk, order.order, order.product, ctx);
        await (0, notifications_1.createNotification)({
            userId: user.id,
            relatedId: order.order.id,
            title: "Order Confirmation",
            message: `Your order for ${order.product.name} x${amount} has been confirmed.`,
            type: "system",
            link: `/ecommerce/orders/${order.order.id}`,
            actions: [
                {
                    label: "View Order",
                    link: `/ecommerce/orders/${order.order.id}`,
                    primary: true,
                },
            ],
        }, ctx);
    }
    catch (error) {
        console.error("Error sending order confirmation email or creating notification:", error);
    }
    try {
        if (order.cost > 0) await (0, affiliate_1.processRewards)(user.id, order.cost, "ECOMMERCE_PURCHASE", order.product.currency, `ECOMMERCE_PURCHASE:ecommerce_order:${order.order.id}`, ctx);
    }
    catch (error) {
        console.error(`Error processing rewards: ${error.message}`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Order #${order.order.id} created for ${order.cost.toFixed(2)} ${order.product.currency}`);
    return {
        id: order.order.id,
        message: "Order created successfully",
    };
};
