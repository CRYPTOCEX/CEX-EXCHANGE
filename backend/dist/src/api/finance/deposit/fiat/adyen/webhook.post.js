"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("@b/api/finance/utils");
const reversal_1 = require("../reversal");
exports.metadata = {
    summary: "Handles Adyen webhook notifications",
    description: "Processes Adyen webhook notifications for payment events. This endpoint handles automatic payment status updates, wallet balance updates, and transaction processing based on Adyen's notification system.",
    operationId: "handleAdyenWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "Adyen webhook",
    requestBody: {
        description: "Adyen webhook notification data",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        live: {
                            type: "string",
                            description: "Whether this is a live notification",
                        },
                        notificationItems: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    NotificationRequestItem: {
                                        type: "object",
                                        properties: {
                                            pspReference: {
                                                type: "string",
                                                description: "Adyen PSP reference",
                                            },
                                            merchantReference: {
                                                type: "string",
                                                description: "Merchant reference",
                                            },
                                            eventCode: {
                                                type: "string",
                                                description: "Event type",
                                            },
                                            success: {
                                                type: "string",
                                                description: "Success status",
                                            },
                                            amount: {
                                                type: "object",
                                                properties: {
                                                    value: {
                                                        type: "number",
                                                        description: "Amount in minor units",
                                                    },
                                                    currency: {
                                                        type: "string",
                                                        description: "Currency code",
                                                    },
                                                },
                                            },
                                            additionalData: {
                                                type: "object",
                                                description: "Additional data including HMAC signature",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Webhook processed successfully",
            content: {
                "text/plain": {
                    schema: {
                        type: "string",
                        example: "[accepted]",
                    },
                },
            },
        },
        400: {
            description: "Invalid webhook data or signature verification failed",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { body, ctx } = data;
    try {
        const config = (0, utils_1.getAdyenConfig)();
        if (!config.hmacKey) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Adyen HMAC key is not configured" });
        }
        if (!(body === null || body === void 0 ? void 0 : body.notificationItems) || !Array.isArray(body.notificationItems)) {
            return "[accepted]";
        }
        for (const item of body.notificationItems) {
            const notification = item.NotificationRequestItem;
            if (!notification)
                continue;
            if (!(0, utils_1.verifyAdyenNotificationHmac)(notification, config.hmacKey)) {
                console_1.logger.error("ADYEN", `HMAC verification failed for ${notification.eventCode} / ${notification.pspReference}`);
                continue;
            }
            const { pspReference, merchantReference, eventCode, success, amount, additionalData, } = notification;
            console_1.logger.info("ADYEN", `Processing webhook: ${eventCode} for ${merchantReference}`);
            const successBool = success === "true" || success === true;
            if (eventCode === "AUTHORISATION") {
                await handleAuthorisation({
                    pspReference,
                    merchantReference,
                    success: successBool,
                    amount,
                    additionalData,
                });
            }
            else if (eventCode === "CAPTURE") {
                await handleCapture({
                    pspReference,
                    merchantReference,
                    success: successBool,
                    amount,
                    additionalData,
                });
            }
            else if (ADYEN_REVERSAL_EVENTS.has(eventCode)) {
                await handleReversal({
                    eventCode,
                    pspReference,
                    merchantReference,
                    success: successBool,
                    amount,
                    additionalData,
                });
            }
            else if (eventCode === "CANCELLATION") {
                await handleCancellation({
                    pspReference,
                    merchantReference,
                    success: successBool,
                    amount,
                    additionalData,
                });
            }
        }
        return "[accepted]";
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Webhook processing error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}` });
    }
};
async function handleAuthorisation({ pspReference, merchantReference, success, amount, additionalData, }) {
    var _a;
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: merchantReference,
                type: "DEPOSIT",
                status: { [sequelize_1.Op.in]: ["PENDING", "PROCESSING", "COMPLETED"] },
            },
            include: [{ model: db_1.models.user, as: "user" }],
        });
        if (!transaction) {
            console_1.logger.warn("ADYEN", `Transaction not found for reference: ${merchantReference}`);
            return;
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        const currency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || (amount === null || amount === void 0 ? void 0 : amount.currency) || "USD";
        if (!success) {
            if (transaction.status !== "COMPLETED") {
                await db_1.models.transaction.update({
                    status: "FAILED",
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        pspReference,
                        webhookProcessedAt: new Date().toISOString(),
                        eventCode: "AUTHORISATION",
                        success,
                        additionalData,
                    }),
                }, { where: { id: transaction.id } });
            }
            return;
        }
        const user = transaction.user;
        if (!user) {
            console_1.logger.warn("ADYEN", `User not found for transaction: ${merchantReference}`);
            return;
        }
        if ((amount === null || amount === void 0 ? void 0 : amount.value) != null && (amount === null || amount === void 0 ? void 0 : amount.currency)) {
            const capturedMajor = (0, utils_1.convertFromMinorUnits)(Number(amount.value), amount.currency);
            if (amount.currency.toUpperCase() !== currency.toUpperCase()) {
                console_1.logger.error("ADYEN", `Currency mismatch for ${merchantReference}: txn=${currency}, adyen=${amount.currency}`);
                await db_1.models.transaction.update({
                    status: "REJECTED",
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        pspReference,
                        rejectionReason: "currency_mismatch",
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                }, { where: { id: transaction.id } });
                return;
            }
            if (capturedMajor + 0.01 < transaction.amount) {
                console_1.logger.error("ADYEN", `Amount mismatch for ${merchantReference}: expected>=${transaction.amount}, got ${capturedMajor}`);
                await db_1.models.transaction.update({
                    status: "REJECTED",
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        pspReference,
                        rejectionReason: "amount_underpayment",
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                }, { where: { id: transaction.id } });
                return;
            }
        }
        let alreadyCredited = false;
        try {
            await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: transaction.amount,
                fee: (_a = transaction.fee) !== null && _a !== void 0 ? _a : 0,
                referenceId: pspReference || merchantReference,
                method: "ADYEN",
                description: `Adyen deposit - ${transaction.amount} ${currency}`,
                metadata: {
                    pspReference,
                    eventCode: "AUTHORISATION",
                    source: "webhook",
                },
                idempotencyKey: `adyen_deposit_${pspReference}`,
            });
        }
        catch (err) {
            if (err instanceof wallet_1.DuplicateOperationError) {
                alreadyCredited = true;
                console_1.logger.info("ADYEN", `Deposit ${pspReference} already credited (idempotency hit)`);
            }
            else {
                throw err;
            }
        }
        await db_1.models.transaction.update({
            status: "COMPLETED",
            metadata: JSON.stringify({
                ...existingMetadata,
                pspReference,
                webhookProcessedAt: new Date().toISOString(),
                eventCode: "AUTHORISATION",
                success,
                additionalData,
                source: alreadyCredited ? existingMetadata.source : "webhook",
            }),
        }, { where: { id: transaction.id } });
        console_1.logger.success("ADYEN", `Deposit completed: ${transaction.amount} ${currency} for user ${user.id}`);
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Error handling authorisation", error);
        throw error;
    }
}
async function handleCapture({ pspReference, merchantReference, success, amount, additionalData, }) {
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: merchantReference,
                type: "DEPOSIT",
            },
        });
        if (transaction) {
            const existingMetadata = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            await db_1.models.transaction.update({
                metadata: JSON.stringify({
                    ...existingMetadata,
                    captureProcessedAt: new Date().toISOString(),
                    captureSuccess: success,
                    capturePspReference: pspReference,
                }),
            }, {
                where: { id: transaction.id },
            });
        }
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Error handling capture", error);
    }
}
const ADYEN_REVERSAL_EVENTS = new Set([
    "REFUND",
    "REFUND_WITH_DATA",
    "CHARGEBACK",
    "SECOND_CHARGEBACK",
]);
async function handleReversal({ eventCode, pspReference, merchantReference, success, amount, additionalData, }) {
    if (!success) {
        console_1.logger.info("ADYEN", `${eventCode} ${pspReference} reported unsuccessful; nothing reversed`);
        return;
    }
    const kind = eventCode === "REFUND" || eventCode === "REFUND_WITH_DATA"
        ? "refund"
        : "chargeback";
    const reportedAmount = adyenMajorUnits(amount);
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "adyen",
        kind,
        depositReference: merchantReference,
        eventReference: pspReference,
        reportedAmount,
        metadata: { eventCode, pspReference, additionalData },
        detail: (additionalData === null || additionalData === void 0 ? void 0 : additionalData.chargebackReasonCode)
            ? `Reason code ${additionalData.chargebackReasonCode}.`
            : undefined,
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("ADYEN", `[CRITICAL] ${eventCode} ${pspReference} could not be applied: no wallet. Manual reversal required.`);
    }
}
function adyenMajorUnits(amount) {
    const value = Number(amount === null || amount === void 0 ? void 0 : amount.value);
    if (!Number.isFinite(value))
        return undefined;
    const zeroDecimal = new Set([
        "JPY", "KRW", "VND", "CLP", "ISK", "PYG", "RWF", "UGX", "VUV", "XAF",
        "XOF", "XPF", "BIF", "DJF", "GNF", "KMF", "MGA",
    ]);
    const currency = String((amount === null || amount === void 0 ? void 0 : amount.currency) || "").toUpperCase();
    return zeroDecimal.has(currency) ? value : value / 100;
}
async function handleCancellation({ pspReference, merchantReference, success, amount, additionalData, }) {
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: merchantReference,
                type: "DEPOSIT",
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "PROCESSING"],
                },
            },
        });
        if (transaction) {
            const existingMetadata = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            await db_1.models.transaction.update({
                status: "CANCELLED",
                metadata: JSON.stringify({
                    ...existingMetadata,
                    pspReference,
                    cancelledAt: new Date().toISOString(),
                    eventCode: "CANCELLATION",
                }),
            }, {
                where: { id: transaction.id },
            });
        }
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Error handling cancellation", error);
    }
}
