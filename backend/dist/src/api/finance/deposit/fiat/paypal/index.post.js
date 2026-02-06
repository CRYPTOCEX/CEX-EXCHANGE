"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const { OrderRequest, CheckoutPaymentIntent, ItemCategory } = require("@paypal/paypal-server-sdk");
const query_1 = require("@b/utils/query");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME;
exports.metadata = {
    summary: "Creates a PayPal payment",
    description: "Initiates a PayPal payment process by creating a new order.",
    operationId: "createPayPalPayment",
    tags: ["Finance", "Deposit"],
    logModule: "PAYPAL_DEPOSIT",
    logTitle: "Create PayPal payment",
    requestBody: {
        description: "Payment information and application type",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in smallest currency unit (e.g., cents)",
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD)",
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: (0, query_1.createRecordResponses)("PayPal Order"),
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { amount, currency } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
    const paypalGateway = await db_1.models.depositGateway.findOne({
        where: { alias: "paypal", status: true },
    });
    if (!paypalGateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "PayPal gateway not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
    const fixedFee = typeof paypalGateway.fixedFee === 'number' ? paypalGateway.fixedFee : 0;
    const percentageFee = typeof paypalGateway.percentageFee === 'number' ? paypalGateway.percentageFee : 0;
    const taxAmount = Math.max((parseFloat(amount) * percentageFee) / 100 + fixedFee, 0);
    const itemAmount = parseFloat(amount) - taxAmount;
    if (itemAmount < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid amount" });
    }
    const totalAmount = parseFloat(amount).toFixed(2);
    const orderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
            {
                amount: {
                    currencyCode: currency,
                    value: totalAmount,
                    breakdown: {
                        itemTotal: {
                            currencyCode: currency,
                            value: itemAmount.toFixed(2),
                        },
                        taxTotal: {
                            currencyCode: currency,
                            value: taxAmount.toFixed(2),
                        },
                    },
                },
                items: [
                    {
                        name: "Deposit",
                        unitAmount: {
                            currencyCode: currency,
                            value: itemAmount.toFixed(2),
                        },
                        quantity: "1",
                        category: ItemCategory.DigitalGoods,
                    },
                ],
            },
        ],
        paymentSource: {
            paypal: {
                experienceContext: {
                    brandName: siteName,
                    returnUrl: `${publicUrl}${isProduction ? "" : ":3000"}/finance/deposit/paypal`,
                    cancelUrl: `${publicUrl}${isProduction ? "" : ":3000"}/finance/deposit`,
                },
            },
        },
    };
    try {
        const ordersController = (0, utils_1.paypalOrdersController)();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating PayPal order");
        const { result: order } = await ordersController.createOrder({
            body: orderRequest,
        });
        return {
            id: order.id,
            links: order.links,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Error creating PayPal order: ${error.message}` });
    }
};
