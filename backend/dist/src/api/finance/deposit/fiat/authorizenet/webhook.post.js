"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Handle Authorize.Net webhook notifications",
    description: "Processes Authorize.Net webhook notifications for payment events including authorizations, captures, refunds, and cancellations.",
    operationId: "handleAuthorizeNetWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "AuthorizeNet webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        notificationId: {
                            type: "string",
                            description: "Unique notification ID",
                        },
                        eventType: {
                            type: "string",
                            description: "Type of event (net.authorize.payment.authorization.created, etc.)",
                        },
                        eventDate: {
                            type: "string",
                            description: "Event timestamp",
                        },
                        webhookId: {
                            type: "string",
                            description: "Webhook configuration ID",
                        },
                        payload: {
                            type: "object",
                            description: "Event payload with transaction details",
                        },
                    },
                    required: ["notificationId", "eventType", "eventDate", "webhookId", "payload"],
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
                                example: "success",
                            },
                            message: {
                                type: "string",
                                example: "Webhook processed successfully",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid webhook payload or signature",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: {
                                type: "string",
                                example: "Invalid webhook signature",
                            },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { body, headers, ctx } = data;
    try {
        const config = (0, utils_1.getAuthorizeNetConfig)();
        const signature = headers["x-anet-signature"];
        const payload = JSON.stringify(body);
        if (config.signatureKey && signature) {
            const isValidSignature = (0, utils_1.verifyWebhookSignature)(payload, signature, config.signatureKey);
            if (!isValidSignature) {
                console_1.logger.error("AUTH_NET", "Invalid webhook signature");
                return {
                    status: 400,
                    body: { error: "Invalid webhook signature" },
                };
            }
        }
        const webhookData = body;
        const { eventType, payload: eventPayload } = webhookData;
        console_1.logger.info("AUTH_NET", `Processing webhook: ${eventType} | notificationId: ${webhookData.notificationId}, id: ${eventPayload.id}`);
        switch (eventType) {
            case "net.authorize.payment.authorization.created":
                await handleAuthorizationCreated(eventPayload);
                break;
            case "net.authorize.payment.capture.created":
                await handleCaptureCreated(eventPayload);
                break;
            case "net.authorize.payment.refund.created":
                await handleRefundCreated(eventPayload);
                break;
            case "net.authorize.payment.void.created":
                await handleVoidCreated(eventPayload);
                break;
            case "net.authorize.payment.fraud.approved":
                await handleFraudApproved(eventPayload);
                break;
            case "net.authorize.payment.fraud.declined":
                await handleFraudDeclined(eventPayload);
                break;
            default:
                console_1.logger.info("AUTH_NET", `Unhandled webhook event type: ${eventType}`);
                break;
        }
        return {
            status: "success",
            message: "Webhook processed successfully",
        };
    }
    catch (error) {
        console_1.logger.error("AUTH_NET", "Webhook processing error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: error instanceof Error ? error.message : "Failed to process webhook" });
    }
};
async function handleAuthorizationCreated(payload) {
    const { id: transactionId, merchantReferenceId, authAmount, responseCode } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in authorization webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    await db_1.models.transaction.update({
        status: responseCode === 1 ? "PENDING" : "FAILED",
        description: `${transaction.description} - Authorization ${responseCode === 1 ? "approved" : "declined"}`,
        metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || "{}"),
            authorizationId: transactionId,
            authAmount: authAmount,
            responseCode: responseCode,
        }),
    }, {
        where: { id: transaction.id },
    });
    console_1.logger.info("AUTH_NET", `Authorization ${responseCode === 1 ? "approved" : "declined"} for transaction ${merchantReferenceId}`);
}
async function handleCaptureCreated(payload) {
    const { id: transactionId, merchantReferenceId, authAmount, responseCode } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in capture webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
        include: [
            {
                model: db_1.models.user,
                as: "user",
            },
        ],
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    if (transaction.status === "COMPLETED") {
        console_1.logger.info("AUTH_NET", `Transaction ${merchantReferenceId} already completed`);
        return;
    }
    const metadata = JSON.parse(transaction.metadata || "{}");
    const currency = metadata.currency;
    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(transaction.userId, "FIAT", currency);
    const wallet = walletResult.wallet;
    const currencyData = await db_1.models.currency.findOne({
        where: { id: wallet.currency },
    });
    if (!currencyData) {
        console_1.logger.error("AUTH_NET", `Currency ${currency} not found`);
        return;
    }
    const depositAmount = transaction.amount;
    const feeAmount = transaction.fee || 0;
    let newBalance = Number(wallet.balance);
    newBalance += depositAmount;
    newBalance = Number(newBalance.toFixed(currencyData.precision || 2));
    await db_1.sequelize.transaction(async (dbTransaction) => {
        await db_1.models.transaction.update({
            status: "COMPLETED",
            description: `${transaction.description} - Payment captured`,
            metadata: JSON.stringify({
                ...metadata,
                captureId: transactionId,
                captureAmount: authAmount,
                captureResponseCode: responseCode,
            }),
        }, {
            where: { id: transaction.id },
            transaction: dbTransaction,
        });
        const idempotencyKey = `authorizenet_capture_${merchantReferenceId}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: transaction.userId,
            walletId: wallet.id,
            walletType: "FIAT",
            currency,
            amount: depositAmount,
            operationType: "DEPOSIT",
            referenceId: merchantReferenceId,
            description: `Authorize.Net deposit - ${depositAmount} ${currency}`,
            metadata: {
                method: "AUTHORIZE_NET",
                captureId: transactionId,
                captureAmount: authAmount,
            },
            transaction: dbTransaction,
        });
        if (feeAmount > 0) {
            await (0, fees_1.collectPlatformFee)({
                userId: transaction.userId,
                currency: wallet.currency,
                walletType: "FIAT",
                feeAmount,
                type: "DEPOSIT",
                description: `Platform fee from Authorize.Net deposit for transaction ${merchantReferenceId}`,
                referenceId: transaction.id,
                metadata: { method: "authorizenet", merchantReferenceId },
            });
        }
    });
    try {
        const user = transaction.user || await db_1.models.user.findByPk(transaction.userId);
        if (user) {
            await (0, emails_1.sendFiatTransactionEmail)(user, {
                ...transaction.toJSON(),
                status: "COMPLETED",
            }, currency, newBalance);
        }
    }
    catch (emailError) {
        console_1.logger.error("AUTH_NET", "Failed to send transaction email", emailError);
    }
    console_1.logger.success("AUTH_NET", `Payment captured for transaction ${merchantReferenceId}, amount: ${depositAmount} ${currency}`);
}
async function handleRefundCreated(payload) {
    const { id: refundId, merchantReferenceId, authAmount } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in refund webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    await db_1.models.transaction.update({
        status: "REFUNDED",
        description: `${transaction.description} - Refunded`,
        metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || "{}"),
            refundId: refundId,
            refundAmount: authAmount,
        }),
    }, {
        where: { id: transaction.id },
    });
    console_1.logger.info("AUTH_NET", `Refund processed for transaction ${merchantReferenceId}, amount: ${authAmount}`);
}
async function handleVoidCreated(payload) {
    const { id: voidId, merchantReferenceId } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in void webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    await db_1.models.transaction.update({
        status: "CANCELLED",
        description: `${transaction.description} - Voided`,
        metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || "{}"),
            voidId: voidId,
        }),
    }, {
        where: { id: transaction.id },
    });
    console_1.logger.info("AUTH_NET", `Transaction voided: ${merchantReferenceId}`);
}
async function handleFraudApproved(payload) {
    const { merchantReferenceId } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in fraud approved webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    await db_1.models.transaction.update({
        metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || "{}"),
            fraudStatus: "approved",
        }),
    }, {
        where: { id: transaction.id },
    });
    console_1.logger.info("AUTH_NET", `Fraud check approved for transaction ${merchantReferenceId}`);
}
async function handleFraudDeclined(payload) {
    const { merchantReferenceId } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in fraud declined webhook");
        return;
    }
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: merchantReferenceId },
    });
    if (!transaction) {
        console_1.logger.info("AUTH_NET", `Transaction not found for reference ID: ${merchantReferenceId}`);
        return;
    }
    await db_1.models.transaction.update({
        status: "FAILED",
        description: `${transaction.description} - Declined by fraud detection`,
        metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || "{}"),
            fraudStatus: "declined",
        }),
    }, {
        where: { id: transaction.id },
    });
    console_1.logger.warn("AUTH_NET", `Transaction declined by fraud detection: ${merchantReferenceId}`);
}
