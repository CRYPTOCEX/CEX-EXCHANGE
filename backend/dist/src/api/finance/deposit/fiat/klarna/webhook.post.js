"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Handles Klarna webhook notifications",
    description: "Processes webhook notifications from Klarna for order status updates and payment confirmations.",
    operationId: "klarnaWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "Klarna webhook",
    requestBody: {
        description: "Klarna webhook notification data",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        order_id: {
                            type: "string",
                            description: "Klarna order ID",
                        },
                        event_type: {
                            type: "string",
                            description: "Type of webhook event",
                        },
                        event_id: {
                            type: "string",
                            description: "Unique event identifier",
                        },
                        timestamp: {
                            type: "string",
                            description: "Event timestamp",
                        },
                    },
                    required: ["order_id", "event_type"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Webhook processed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                description: "Processing status",
                            },
                            message: {
                                type: "string",
                                description: "Response message",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid webhook data",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    var _a;
    const { body, headers, ctx } = data;
    console_1.logger.info("KLARNA", `Webhook received - event: ${body.event_type}, order: ${body.order_id}`);
    const { order_id, event_type, event_id, timestamp } = body;
    if (!order_id || !event_type) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required webhook data: order_id and event_type" });
    }
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                type: "DEPOSIT",
                status: ["PENDING", "PROCESSING"],
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    required: true,
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        if (!transaction) {
            console_1.logger.warn("KLARNA", `No pending transaction found for order: ${order_id}`);
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Klarna deposit completed successfully");
            return {
                status: "ignored",
                message: "No matching transaction found",
            };
        }
        const transactionMetadata = JSON.parse(transaction.metadata || "{}");
        if (transactionMetadata.order_id !== order_id) {
            console_1.logger.debug("KLARNA", `Order ID mismatch: expected ${transactionMetadata.order_id}, got ${order_id}`);
            return {
                status: "ignored",
                message: "Order ID does not match transaction",
            };
        }
        if (transactionMetadata.processed_events &&
            transactionMetadata.processed_events.includes(event_id)) {
            console_1.logger.debug("KLARNA", `Event ${event_id} already processed for order ${order_id}`);
            return {
                status: "duplicate",
                message: "Event already processed",
            };
        }
        const orderDetails = await (0, utils_1.makeKlarnaRequest)(`/ordermanagement/v1/orders/${order_id}`, "GET");
        if (!orderDetails) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to retrieve order details for ${order_id}` });
        }
        console_1.logger.info("KLARNA", `Order ${order_id} status: ${orderDetails.status}`);
        const mappedStatus = orderDetails.status ? utils_1.KLARNA_STATUS_MAPPING[orderDetails.status] || "PENDING" : "PENDING";
        const updatedMetadata = {
            ...transactionMetadata,
            last_event_type: event_type,
            last_event_id: event_id,
            last_event_timestamp: timestamp,
            current_klarna_status: orderDetails.status,
            processed_events: [
                ...(transactionMetadata.processed_events || []),
                event_id
            ],
            webhook_updated_at: new Date().toISOString(),
        };
        if (mappedStatus === "COMPLETED" || orderDetails.status === "CAPTURED") {
            const user = transaction.user;
            if (!user) {
                throw (0, error_1.createError)({ statusCode: 404, message: "User not found for transaction" });
            }
            const currency = transactionMetadata.purchase_currency;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating wallet");
            const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
            const wallet = walletResult.wallet;
            if (!wallet) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Failed to create or find wallet" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
            const currencyData = await db_1.models.currency.findOne({
                where: { id: wallet.currency },
            });
            if (!currencyData) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency not found");
                throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
            }
            const depositAmount = transaction.amount - ((_a = transaction.fee) !== null && _a !== void 0 ? _a : 0);
            let newBalance = wallet.balance + depositAmount;
            newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));
            await db_1.sequelize.transaction(async (t) => {
                var _a;
                await db_1.models.transaction.update({
                    status: "COMPLETED",
                    metadata: JSON.stringify({
                        ...updatedMetadata,
                        completed_at: new Date().toISOString(),
                    }),
                    description: `Klarna deposit of ${depositAmount} ${currency} completed by ${user.firstName} ${user.lastName}`,
                }, {
                    where: { id: transaction.id },
                    transaction: t,
                });
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balance via wallet service");
                const idempotencyKey = `klarna_webhook_${order_id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount: depositAmount,
                    operationType: "DEPOSIT",
                    referenceId: order_id,
                    description: `Klarna deposit of ${depositAmount} ${currency}`,
                    metadata: {
                        method: "KLARNA",
                        orderId: order_id,
                        eventType: event_type,
                    },
                    transaction: t,
                });
                if (((_a = transaction.fee) !== null && _a !== void 0 ? _a : 0) > 0) {
                    await (0, fees_1.collectPlatformFee)({
                        userId: user.id,
                        currency: wallet.currency,
                        walletType: "FIAT",
                        feeAmount: transaction.fee,
                        type: "DEPOSIT",
                        description: `Platform fee from Klarna deposit for ${user.firstName} ${user.lastName}`,
                        referenceId: transaction.id,
                        metadata: { method: "klarna", userId: user.id },
                    });
                }
            });
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    ...transaction.dataValues,
                    type: "DEPOSIT",
                    amount: depositAmount,
                    status: "COMPLETED",
                    description: `Klarna deposit of ${depositAmount} ${currency} completed`,
                }, currency, newBalance);
            }
            catch (emailError) {
                console_1.logger.error("KLARNA", "Failed to send confirmation email", emailError);
            }
            console_1.logger.success("KLARNA", `Payment completed for user ${user.id}, order ${order_id}`);
            return {
                status: "completed",
                message: "Payment processed successfully",
                order_id,
                transaction_id: transaction.id,
            };
        }
        else if (mappedStatus === "FAILED" || orderDetails.status === "CANCELLED") {
            await db_1.models.transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...updatedMetadata,
                    failure_reason: `Klarna order status: ${orderDetails.status}`,
                    failed_at: new Date().toISOString(),
                }),
            }, {
                where: { id: transaction.id },
            });
            console_1.logger.warn("KLARNA", `Payment failed for order ${order_id}, status: ${orderDetails.status}`);
            return {
                status: "failed",
                message: "Payment failed",
                order_id,
                reason: orderDetails.status,
            };
        }
        else {
            await db_1.models.transaction.update({
                metadata: JSON.stringify(updatedMetadata),
            }, {
                where: { id: transaction.id },
            });
            console_1.logger.info("KLARNA", `Order ${order_id} status updated to: ${orderDetails.status}`);
            return {
                status: "updated",
                message: "Status updated",
                order_id,
                current_status: orderDetails.status,
            };
        }
    }
    catch (error) {
        console_1.logger.error("KLARNA", "Webhook processing error", error);
        if (error instanceof utils_1.KlarnaError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Klarna webhook error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}` });
    }
};
