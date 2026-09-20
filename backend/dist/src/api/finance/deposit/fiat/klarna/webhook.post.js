"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
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
    var _b, _c, _d, _e, _f;
    const { body, headers, ctx } = data;
    console_1.logger.info("KLARNA", `Webhook received - event: ${body === null || body === void 0 ? void 0 : body.event_type}, order: ${body === null || body === void 0 ? void 0 : body.order_id}`);
    const webhookSecret = process.env.APP_KLARNA_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Klarna webhook secret is not configured" });
    }
    const signatureHeader = (headers === null || headers === void 0 ? void 0 : headers["klarna-signature"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["Klarna-Signature"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["x-klarna-signature"]);
    if (!signatureHeader) {
        console_1.logger.warn("KLARNA", "Webhook rejected: missing signature header");
        throw (0, error_1.createError)({ statusCode: 401, message: "Missing webhook signature" });
    }
    const rawBodyString = data.rawBodyString;
    const payload = typeof rawBodyString === "string" && rawBodyString.length
        ? rawBodyString
        : typeof body === "string"
            ? body
            : JSON.stringify(body !== null && body !== void 0 ? body : {});
    if (!(0, utils_1.verifyKlarnaWebhookSignature)(payload, signatureHeader, webhookSecret)) {
        console_1.logger.error("KLARNA", "Webhook signature verification failed");
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid webhook signature" });
    }
    const { order_id, event_type, event_id, timestamp } = body !== null && body !== void 0 ? body : {};
    if (!order_id || !event_type) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required webhook data: order_id and event_type" });
    }
    try {
        const orderDetails = await (0, utils_1.makeKlarnaRequest)(`/ordermanagement/v1/orders/${order_id}`, "GET");
        if (!orderDetails) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to retrieve order details for ${order_id}` });
        }
        console_1.logger.info("KLARNA", `Order ${order_id} status: ${orderDetails.status}`);
        const merchantReference = orderDetails.merchant_reference1;
        const merchantUserId = orderDetails.merchant_reference2;
        const transaction = await db_1.models.transaction.findOne({
            where: {
                type: "DEPOSIT",
                [sequelize_1.Op.or]: [
                    { referenceId: order_id },
                    ...(merchantReference ? [{ referenceId: merchantReference }] : []),
                    { metadata: { [sequelize_1.Op.like]: `%"order_id":"${order_id}"%` } },
                    ...(merchantReference
                        ? [{ metadata: { [sequelize_1.Op.like]: `%"merchant_reference":"${merchantReference}"%` } }]
                        : []),
                ],
                ...(merchantUserId ? { userId: merchantUserId } : {}),
            },
            include: [{ model: db_1.models.user, as: "user", required: true }],
            order: [["createdAt", "DESC"]],
        });
        if (!transaction) {
            console_1.logger.warn("KLARNA", `No transaction found for order ${order_id} (merchant_reference=${merchantReference})`);
            return { status: "ignored", message: "No matching transaction found" };
        }
        const transactionMetadata = JSON.parse(transaction.metadata || "{}");
        if (merchantUserId && transaction.userId !== merchantUserId) {
            console_1.logger.error("KLARNA", `Order/user mismatch: order.merchant_reference2=${merchantUserId}, transaction.userId=${transaction.userId}`);
            return { status: "ignored", message: "User mismatch" };
        }
        if (event_id && ((_a = transactionMetadata.processed_events) === null || _a === void 0 ? void 0 : _a.includes(event_id))) {
            console_1.logger.debug("KLARNA", `Event ${event_id} already processed for order ${order_id}`);
            return { status: "duplicate", message: "Event already processed" };
        }
        const mappedStatus = orderDetails.status ? utils_1.KLARNA_STATUS_MAPPING[orderDetails.status] || "PENDING" : "PENDING";
        const updatedMetadata = {
            ...transactionMetadata,
            order_id,
            last_event_type: event_type,
            last_event_id: event_id,
            last_event_timestamp: timestamp,
            current_klarna_status: orderDetails.status,
            processed_events: [
                ...(transactionMetadata.processed_events || []),
                ...(event_id ? [event_id] : []),
            ],
            webhook_updated_at: new Date().toISOString(),
        };
        if (mappedStatus === "COMPLETED" || orderDetails.status === "CAPTURED") {
            const user = transaction.user;
            if (!user) {
                throw (0, error_1.createError)({ statusCode: 404, message: "User not found for transaction" });
            }
            const currency = transactionMetadata.purchase_currency;
            if (!currency) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Transaction metadata missing purchase_currency" });
            }
            const expectedMinor = Math.round(transaction.amount * 100);
            if (typeof orderDetails.order_amount === "number" && orderDetails.order_amount + 1 < expectedMinor) {
                console_1.logger.error("KLARNA", `Amount mismatch for order ${order_id}: expected>=${expectedMinor}, got ${orderDetails.order_amount}`);
                throw (0, error_1.createError)({ statusCode: 400, message: "Klarna order amount does not match pending transaction" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
            let newBalance;
            let alreadyCredited = false;
            try {
                const depositResult = await (0, utils_2.processFiatDeposit)({
                    userId: user.id,
                    currency,
                    amount: transaction.amount,
                    fee: (_b = transaction.fee) !== null && _b !== void 0 ? _b : 0,
                    referenceId: order_id,
                    method: "KLARNA",
                    description: `Klarna deposit of ${transaction.amount - ((_c = transaction.fee) !== null && _c !== void 0 ? _c : 0)} ${currency}`,
                    metadata: {
                        order_id,
                        klarna_reference: orderDetails.klarna_reference,
                        event_type,
                        source: "webhook",
                    },
                    idempotencyKey: `klarna_deposit_${order_id}`,
                    ctx,
                });
                newBalance = depositResult.newBalance;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info("KLARNA", `Deposit for order ${order_id} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            await db_1.models.transaction.update({
                status: "COMPLETED",
                metadata: JSON.stringify({ ...updatedMetadata, completed_at: new Date().toISOString() }),
                description: `Klarna deposit of ${transaction.amount - ((_d = transaction.fee) !== null && _d !== void 0 ? _d : 0)} ${currency} completed by ${user.firstName} ${user.lastName}`,
            }, { where: { id: transaction.id } });
            if (!alreadyCredited && typeof newBalance === "number") {
                try {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                    await (0, emails_1.sendFiatTransactionEmail)(user, {
                        ...transaction.dataValues,
                        type: "DEPOSIT",
                        amount: transaction.amount - ((_e = transaction.fee) !== null && _e !== void 0 ? _e : 0),
                        status: "COMPLETED",
                        description: `Klarna deposit of ${transaction.amount - ((_f = transaction.fee) !== null && _f !== void 0 ? _f : 0)} ${currency} completed`,
                    }, currency, newBalance);
                }
                catch (emailError) {
                    console_1.logger.error("KLARNA", "Failed to send confirmation email", emailError);
                }
            }
            console_1.logger.success("KLARNA", `Payment completed for user ${user.id}, order ${order_id}`);
            return { status: "completed", message: "Payment processed successfully", order_id, transaction_id: transaction.id };
        }
        if (mappedStatus === "FAILED" || orderDetails.status === "CANCELLED") {
            await db_1.models.transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...updatedMetadata,
                    failure_reason: `Klarna order status: ${orderDetails.status}`,
                    failed_at: new Date().toISOString(),
                }),
            }, { where: { id: transaction.id } });
            console_1.logger.warn("KLARNA", `Payment failed for order ${order_id}, status: ${orderDetails.status}`);
            return { status: "failed", message: "Payment failed", order_id, reason: orderDetails.status };
        }
        await db_1.models.transaction.update({ metadata: JSON.stringify(updatedMetadata) }, { where: { id: transaction.id } });
        console_1.logger.info("KLARNA", `Order ${order_id} status updated to: ${orderDetails.status}`);
        return { status: "updated", message: "Status updated", order_id, current_status: orderDetails.status };
    }
    catch (error) {
        console_1.logger.error("KLARNA", "Webhook processing error", error);
        if (error instanceof utils_1.KlarnaError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Klarna webhook error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}` });
    }
};
