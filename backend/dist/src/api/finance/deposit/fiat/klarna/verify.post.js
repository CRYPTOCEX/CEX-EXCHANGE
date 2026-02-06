"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verifies and creates a Klarna order",
    description: "Handles the return URL from Klarna checkout, verifies the authorization token, and creates an order to complete the payment process.",
    operationId: "verifyKlarnaPayment",
    tags: ["Finance", "Deposit"],
    logModule: "KLARNA_DEPOSIT",
    logTitle: "Verify Klarna payment",
    requestBody: {
        description: "Authorization token from Klarna checkout",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        authorization_token: {
                            type: "string",
                            description: "Authorization token from Klarna checkout",
                        },
                        session_id: {
                            type: "string",
                            description: "Klarna session ID",
                            nullable: true,
                        },
                    },
                    required: ["authorization_token"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Klarna payment verified and order created successfully. Returns order details and payment status.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            order_id: {
                                type: "string",
                                description: "Klarna order ID",
                            },
                            status: {
                                type: "string",
                                description: "Order status",
                            },
                            fraud_status: {
                                type: "string",
                                description: "Fraud check status",
                            },
                            klarna_reference: {
                                type: "string",
                                description: "Klarna reference number",
                            },
                            order_amount: {
                                type: "number",
                                description: "Order amount in minor units",
                            },
                            purchase_currency: {
                                type: "string",
                                description: "Purchase currency",
                            },
                            payment_method: {
                                type: "object",
                                description: "Selected payment method details",
                            },
                            transaction_id: {
                                type: "string",
                                description: "Local transaction ID",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid authorization token or payment failed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                            details: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Klarna"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { authorization_token, session_id } = body;
    if (!authorization_token) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Authorization token is required" });
    }
    try {
        const authResponse = await (0, utils_1.makeKlarnaRequest)(`/payments/v1/authorizations/${authorization_token}`, "GET");
        if (!authResponse) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Failed to retrieve authorization details" });
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                userId: user.id,
                referenceId: session_id || authorization_token,
                status: "PENDING",
                type: "DEPOSIT"
            },
            order: [["createdAt", "DESC"]],
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "No pending transaction found for this authorization" });
        }
        const transactionMetadata = JSON.parse(transaction.metadata || "{}");
        const transactionFee = (_a = transaction.fee) !== null && _a !== void 0 ? _a : 0;
        const orderData = {
            purchase_country: transactionMetadata.purchase_country,
            purchase_currency: transactionMetadata.purchase_currency,
            locale: transactionMetadata.locale || "en-US",
            order_amount: Math.round(transaction.amount * 100),
            order_lines: [
                {
                    type: "physical",
                    reference: "deposit",
                    name: "Account Deposit",
                    quantity: 1,
                    unit_price: Math.round((transaction.amount - transactionFee) * 100),
                    tax_rate: 0,
                    total_amount: Math.round((transaction.amount - transactionFee) * 100),
                    total_tax_amount: 0,
                },
            ],
            merchant_reference1: transactionMetadata.merchant_reference,
            merchant_reference2: user.id,
        };
        if (transactionFee > 0) {
            orderData.order_lines.push({
                type: "fee",
                reference: "processing_fee",
                name: "Processing Fee",
                quantity: 1,
                unit_price: Math.round(transactionFee * 100),
                tax_rate: 0,
                total_amount: Math.round(transactionFee * 100),
                total_tax_amount: 0,
            });
        }
        const orderResponse = await (0, utils_1.makeKlarnaRequest)(`/payments/v1/authorizations/${authorization_token}/order`, "POST", orderData);
        if (!orderResponse || !orderResponse.order_id) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to create Klarna order" });
        }
        const orderStatus = orderResponse.status ? utils_1.KLARNA_STATUS_MAPPING[orderResponse.status] || "PENDING" : "PENDING";
        if (orderStatus === "COMPLETED" || orderResponse.status === "AUTHORIZED") {
            const currency = transactionMetadata.purchase_currency;
            const depositAmount = transaction.amount - transactionFee;
            await db_1.models.transaction.update({
                status: "COMPLETED",
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    order_id: orderResponse.order_id,
                    klarna_reference: orderResponse.klarna_reference,
                    fraud_status: orderResponse.fraud_status,
                    payment_method: authResponse.authorized_payment_method,
                    completed_at: new Date().toISOString(),
                }),
                description: `Klarna deposit of ${depositAmount} ${currency} completed by ${user.firstName} ${user.lastName}`,
            }, {
                where: { id: transaction.id },
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: transaction.amount,
                fee: transactionFee,
                referenceId: orderResponse.order_id,
                method: "KLARNA",
                description: `Klarna deposit of ${depositAmount} ${currency}`,
                metadata: {
                    order_id: orderResponse.order_id,
                    klarna_reference: orderResponse.klarna_reference,
                    fraud_status: orderResponse.fraud_status,
                },
                idempotencyKey: `klarna_deposit_${orderResponse.order_id}`,
                ctx,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Klarna deposit completed successfully");
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    ...transaction.dataValues,
                    type: "DEPOSIT",
                    amount: depositAmount,
                    status: "COMPLETED",
                    description: `Klarna deposit of ${depositAmount} ${currency} completed`,
                }, currency, depositResult.newBalance);
            }
            catch (emailError) {
                console_1.logger.error("KLARNA", "Failed to send confirmation email", emailError);
            }
            return {
                order_id: orderResponse.order_id,
                status: orderResponse.status,
                fraud_status: orderResponse.fraud_status,
                klarna_reference: orderResponse.klarna_reference,
                order_amount: orderResponse.order_amount,
                purchase_currency: orderResponse.purchase_currency,
                payment_method: authResponse.authorized_payment_method,
                transaction_id: transaction.id,
                wallet_balance: depositResult.newBalance,
            };
        }
        else if (orderStatus === "FAILED" || orderResponse.status === "CANCELLED") {
            await db_1.models.transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    order_id: orderResponse.order_id,
                    klarna_reference: orderResponse.klarna_reference,
                    fraud_status: orderResponse.fraud_status,
                    failure_reason: `Order status: ${orderResponse.status}`,
                    failed_at: new Date().toISOString(),
                }),
            }, {
                where: { id: transaction.id },
            });
            throw (0, error_1.createError)({ statusCode: 400, message: `Payment failed with status: ${orderResponse.status}` });
        }
        else {
            await db_1.models.transaction.update({
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    order_id: orderResponse.order_id,
                    klarna_reference: orderResponse.klarna_reference,
                    fraud_status: orderResponse.fraud_status,
                    current_status: orderResponse.status,
                    updated_at: new Date().toISOString(),
                }),
            }, {
                where: { id: transaction.id },
            });
            return {
                order_id: orderResponse.order_id,
                status: orderResponse.status,
                fraud_status: orderResponse.fraud_status,
                klarna_reference: orderResponse.klarna_reference,
                order_amount: orderResponse.order_amount,
                purchase_currency: orderResponse.purchase_currency,
                payment_method: authResponse.authorized_payment_method,
                transaction_id: transaction.id,
                message: "Payment is being processed. You will be notified when completed.",
            };
        }
    }
    catch (error) {
        if (error instanceof utils_1.KlarnaError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Klarna verification failed: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Payment verification failed: ${error.message}` });
    }
};
