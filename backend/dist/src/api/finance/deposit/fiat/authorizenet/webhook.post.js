"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
const reversal_1 = require("../reversal");
const credit_contract_1 = require("../credit-contract");
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
        if (!config.signatureKey) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Authorize.Net signature key is not configured" });
        }
        const signature = headers["x-anet-signature"];
        if (!signature) {
            console_1.logger.error("AUTH_NET", "Webhook rejected: missing x-anet-signature header");
            return { status: 401, body: { error: "Missing webhook signature" } };
        }
        const payload = typeof data.rawBodyString === "string" &&
            data.rawBodyString.length
            ? data.rawBodyString
            : JSON.stringify(body);
        if (!(0, utils_1.verifyWebhookSignature)(payload, signature, config.signatureKey)) {
            console_1.logger.error("AUTH_NET", "Invalid webhook signature");
            return { status: 401, body: { error: "Invalid webhook signature" } };
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
    if (authAmount != null) {
        const reportedAmount = typeof authAmount === "string" ? parseFloat(authAmount) : Number(authAmount);
        if (Number.isFinite(reportedAmount) && reportedAmount + 0.01 < transaction.amount) {
            console_1.logger.error("AUTH_NET", `Under-capture for ${merchantReferenceId}: expected=${transaction.amount}, got=${reportedAmount}`);
            await db_1.models.transaction.update({
                status: "REJECTED",
                metadata: JSON.stringify({
                    ...metadata,
                    rejectionReason: "amount_undercapture",
                    capturedAmount: reportedAmount,
                }),
            }, { where: { id: transaction.id } });
            return;
        }
    }
    const feeAmount = transaction.fee || 0;
    let alreadyCredited = false;
    let newBalance;
    await db_1.sequelize.transaction(async (t) => {
        try {
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: transaction.userId,
                currency,
                amount: transaction.amount,
                fee: feeAmount,
                referenceId: (0, credit_contract_1.creditReferenceId)(transaction, merchantReferenceId),
                method: "AUTHORIZE_NET",
                description: `Authorize.Net deposit - ${transaction.amount} ${currency}`,
                metadata: {
                    captureId: transactionId,
                    captureAmount: authAmount,
                    source: "webhook",
                },
                idempotencyKey: `authorizenet_deposit_${merchantReferenceId}`,
                transaction: t,
            });
            newBalance = depositResult.newBalance;
        }
        catch (err) {
            if (err instanceof wallet_1.DuplicateOperationError) {
                alreadyCredited = true;
                console_1.logger.info("AUTH_NET", `Deposit ${merchantReferenceId} already credited (idempotency hit)`);
            }
            else {
                throw err;
            }
        }
        await db_1.models.transaction.update({
            status: "COMPLETED",
            description: `${transaction.description} - Payment captured`,
            metadata: JSON.stringify({
                ...metadata,
                captureId: transactionId,
                captureAmount: authAmount,
                captureResponseCode: responseCode,
                source: alreadyCredited ? metadata.source : "webhook",
            }),
        }, { where: { id: transaction.id }, transaction: t });
    });
    if (!alreadyCredited && typeof newBalance === "number") {
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
    }
    console_1.logger.success("AUTH_NET", `Payment captured for transaction ${merchantReferenceId}, amount: ${transaction.amount} ${currency}`);
}
async function handleRefundCreated(payload) {
    const { id: refundId, merchantReferenceId, authAmount } = payload;
    if (!merchantReferenceId) {
        console_1.logger.info("AUTH_NET", "No merchant reference ID found in refund webhook");
        return;
    }
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "authorizenet",
        kind: "refund",
        depositReference: merchantReferenceId,
        eventReference: String(refundId !== null && refundId !== void 0 ? refundId : merchantReferenceId),
        reportedAmount: authAmount,
        metadata: { refundId },
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("AUTH_NET", `[CRITICAL] refund ${refundId} on ${merchantReferenceId} could not be applied: no wallet. Manual reversal required.`);
    }
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
