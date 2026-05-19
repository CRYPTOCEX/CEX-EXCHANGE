"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
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
    const { body, headers, ctx } = data;
    try {
        const config = (0, utils_1.getAdyenConfig)();
        if (config.hmacKey && headers) {
            const hmacSignature = headers["hmac-signature"] || headers["HmacSignature"];
            if (hmacSignature) {
                const rawBody = JSON.stringify(body);
                const isValidSignature = (0, utils_1.verifyHmacSignature)(rawBody, hmacSignature, config.hmacKey);
                if (!isValidSignature) {
                    console_1.logger.error("ADYEN", "Invalid HMAC signature");
                    throw (0, error_1.createError)({ statusCode: 400, message: "Invalid HMAC signature" });
                }
            }
        }
        if (body.notificationItems && Array.isArray(body.notificationItems)) {
            for (const item of body.notificationItems) {
                const notification = item.NotificationRequestItem;
                if (!notification)
                    continue;
                const { pspReference, merchantReference, eventCode, success, amount, additionalData, } = notification;
                console_1.logger.info("ADYEN", `Processing webhook: ${eventCode} for ${merchantReference}`);
                if (eventCode === "AUTHORISATION") {
                    await handleAuthorisation({
                        pspReference,
                        merchantReference,
                        success: success === "true",
                        amount,
                        additionalData,
                    });
                }
                else if (eventCode === "CAPTURE") {
                    await handleCapture({
                        pspReference,
                        merchantReference,
                        success: success === "true",
                        amount,
                        additionalData,
                    });
                }
                else if (eventCode === "REFUND") {
                    await handleRefund({
                        pspReference,
                        merchantReference,
                        success: success === "true",
                        amount,
                        additionalData,
                    });
                }
                else if (eventCode === "CANCELLATION") {
                    await handleCancellation({
                        pspReference,
                        merchantReference,
                        success: success === "true",
                        amount,
                        additionalData,
                    });
                }
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
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: merchantReference,
                type: "DEPOSIT",
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "PROCESSING"],
                },
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                },
            ],
        });
        if (!transaction) {
            console_1.logger.warn("ADYEN", `Transaction not found for reference: ${merchantReference}`);
            return;
        }
        const newStatus = success ? "COMPLETED" : "FAILED";
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        await db_1.models.transaction.update({
            status: newStatus,
            metadata: JSON.stringify({
                ...existingMetadata,
                pspReference,
                webhookProcessedAt: new Date().toISOString(),
                eventCode: "AUTHORISATION",
                success,
                additionalData,
            }),
        }, {
            where: { id: transaction.id },
        });
        if (success) {
            const user = transaction.user;
            if (!user) {
                console_1.logger.warn("ADYEN", `User not found for transaction: ${merchantReference}`);
                return;
            }
            const currency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || "USD";
            await db_1.sequelize.transaction(async (dbTransaction) => {
                let wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency,
                        type: "FIAT",
                    },
                    transaction: dbTransaction,
                });
                if (!wallet) {
                    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency, dbTransaction);
                    wallet = walletResult.wallet;
                }
                if (!wallet) {
                    throw new Error("Failed to get or create wallet");
                }
                const depositAmount = transaction.amount - (transaction.fee || 0);
                const idempotencyKey = `adyen_auth_${pspReference}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount: depositAmount,
                    operationType: "DEPOSIT",
                    referenceId: pspReference,
                    description: `Adyen deposit - ${depositAmount} ${currency}`,
                    metadata: {
                        method: "ADYEN",
                        pspReference,
                        eventCode: "AUTHORISATION",
                    },
                    transaction: dbTransaction,
                });
                console_1.logger.success("ADYEN", `Deposit completed: ${depositAmount} ${currency} for user ${user.id}`);
            });
        }
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
async function handleRefund({ pspReference, merchantReference, success, amount, additionalData, }) {
    console_1.logger.info("ADYEN", `Refund notification: ${pspReference} - ${success ? "Success" : "Failed"}`);
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
