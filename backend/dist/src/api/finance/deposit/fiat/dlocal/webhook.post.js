"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const notification_1 = require("@b/services/notification");
const fees_1 = require("@b/utils/fees");
const emails_1 = require("@b/utils/emails");
const utils_2 = require("@b/api/finance/utils");
const reversal_1 = require("../reversal");
exports.metadata = {
    summary: "dLocal webhook handler",
    description: "Handles payment notifications from dLocal with HMAC signature verification",
    operationId: "dLocalWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "dLocal webhook",
    requestBody: {
        description: "dLocal webhook payload",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        amount: { type: "number" },
                        currency: { type: "string" },
                        payment_method_id: { type: "string" },
                        payment_method_type: { type: "string" },
                        country: { type: "string" },
                        status: { type: "string" },
                        status_code: { type: "number" },
                        status_detail: { type: "string" },
                        order_id: { type: "string" },
                        created_date: { type: "string" },
                        approved_date: { type: "string", nullable: true },
                        live: { type: "boolean" },
                    },
                    required: ["id", "amount", "currency", "status", "order_id"],
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
                            message: { type: "string" },
                            status: { type: "string" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Bad request or invalid signature",
        },
        404: {
            description: "Transaction not found",
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
        const config = (0, utils_1.getDLocalConfig)();
        const xDate = headers["x-date"];
        const authorization = headers["authorization"];
        if (!xDate || !authorization) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Missing required headers for signature verification" });
        }
        const requestBody = typeof data.rawBodyString === "string" && data.rawBodyString.length
            ? data.rawBodyString
            : JSON.stringify(body);
        const isValidSignature = (0, utils_1.verifyWebhookSignature)(authorization, config.xLogin, xDate, requestBody, config.secretKey);
        if (!isValidSignature) {
            console_1.logger.error("DLOCAL", "Webhook signature verification failed");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid webhook signature" });
        }
        const payload = body;
        console_1.logger.info("DLOCAL", `Webhook received for payment ${payload.id}, order ${payload.order_id}, status: ${payload.status}`);
        const transactionResult = await db_1.models.transaction.findOne({
            where: { referenceId: payload.order_id, type: "DEPOSIT" },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                },
            ],
        });
        if (!transactionResult) {
            console_1.logger.info("DLOCAL", `Webhook for unknown order ${payload.order_id}; ignored`);
            return { message: "Unknown order; ignored", status: "ignored" };
        }
        const transaction = transactionResult;
        if (!transaction.user) {
            console_1.logger.error("DLOCAL", `User not found for transaction: ${transaction.id}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "User not found for transaction" });
        }
        const user = transaction.user;
        const internalStatus = utils_1.DLOCAL_STATUS_MAPPING[payload.status] || "pending";
        const transactionStatus = internalStatus.toUpperCase();
        const previousStatus = transaction.status;
        const webhookUpdate = {
            status: transactionStatus,
            metadata: JSON.stringify({
                ...(0, utils_2.parseTransactionMetadata)(transaction.metadata),
                dlocal_payment_id: payload.id,
                dlocal_status: payload.status,
                dlocal_status_code: payload.status_code,
                dlocal_status_detail: payload.status_detail,
                payment_method_type: payload.payment_method_type,
                approved_date: payload.approved_date,
                webhook_received_at: new Date().toISOString(),
                live: payload.live,
            }),
        };
        const isCreditingWebhook = payload.status === "PAID" && previousStatus !== "COMPLETED";
        const isReversingWebhook = ["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK"].includes(payload.status) &&
            previousStatus === "COMPLETED";
        if (!isCreditingWebhook && !isReversingWebhook) {
            await transaction.update(webhookUpdate);
        }
        if (isCreditingWebhook) {
            const currency = payload.currency;
            const grossAmount = Number(transaction.amount);
            const feeAmount = Number(transaction.fee) || 0;
            const depositAmount = grossAmount - feeAmount;
            await db_1.sequelize.transaction(async (dbTransaction) => {
                let walletId;
                const existingWallet = await db_1.models.wallet.findOne({
                    where: { userId: user.id, currency, type: "FIAT" },
                    transaction: dbTransaction,
                });
                if (!existingWallet) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new wallet");
                    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency, dbTransaction);
                    walletId = walletResult.wallet.id;
                }
                else {
                    walletId = existingWallet.id;
                }
                const idempotencyKey = `dlocal_deposit_${payload.id}`;
                try {
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: user.id,
                        walletId: walletId,
                        walletType: "FIAT",
                        currency,
                        amount: depositAmount,
                        operationType: "DEPOSIT",
                        referenceId: payload.id,
                        description: `dLocal deposit - ${depositAmount} ${currency}`,
                        metadata: {
                            method: "DLOCAL",
                            dlocalPaymentId: payload.id,
                            paymentMethodType: payload.payment_method_type,
                        },
                        transaction: dbTransaction,
                    });
                    if (feeAmount > 0) {
                        await (0, fees_1.collectPlatformFee)({
                            userId: user.id,
                            currency,
                            walletType: "FIAT",
                            feeAmount,
                            type: "DEPOSIT",
                            description: `Platform fee from dLocal deposit of ${feeAmount} ${currency}`,
                            referenceId: `dlocal_${payload.id}`,
                            metadata: { method: "DLOCAL", dlocalPaymentId: payload.id },
                            transaction: dbTransaction,
                        });
                    }
                }
                catch (err) {
                    if (!(err instanceof wallet_1.DuplicateOperationError))
                        throw err;
                    console_1.logger.info("DLOCAL", `Deposit ${payload.id} already credited (idempotency hit)`);
                }
                await transaction.update(webhookUpdate, { transaction: dbTransaction });
            });
            console_1.logger.success("DLOCAL", `Wallet updated for user ${user.id}: +${depositAmount} ${currency}`);
            try {
                await notification_1.notificationService.send({
                    userId: user.id,
                    type: "ALERT",
                    channels: ["IN_APP"],
                    idempotencyKey: `dlocal_deposit_success_${payload.id}`,
                    data: {
                        title: "Deposit Successful",
                        message: `Your deposit of ${depositAmount} ${currency} via dLocal has been approved and credited to your wallet.`,
                        link: "/wallet",
                    },
                    priority: "NORMAL"
                });
                console_1.logger.info("DLOCAL", `Email notification queued for ${user.email} - successful deposit of ${depositAmount} ${currency}`);
            }
            catch (emailError) {
                console_1.logger.error("DLOCAL", "Failed to send email notification", emailError);
            }
            if (user.email) {
                try {
                    await emails_1.emailQueue.add({
                        emailData: {
                            TO: user.email,
                            USER_ID: user.id,
                            FIRSTNAME: user.firstName,
                            TRANSACTION_ID: transaction.id,
                            AMOUNT: depositAmount,
                            CURRENCY: currency,
                        },
                        emailType: "DepositConfirmation",
                    });
                }
                catch (emailError) {
                    console_1.logger.error("DLOCAL", `Failed to queue deposit confirmation email for user ${user.id} (${user.email})`, emailError instanceof Error ? emailError : new Error(String(emailError)));
                }
            }
            console_1.logger.success("DLOCAL", `Deposit completed: ${payload.id}, amount: ${depositAmount} ${currency}, user: ${user.id}`);
        }
        if (["REJECTED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
            console_1.logger.warn("DLOCAL", `Payment failed: ${payload.id}, status: ${payload.status}, detail: ${payload.status_detail}`);
            try {
                await notification_1.notificationService.send({
                    userId: user.id,
                    type: "ALERT",
                    channels: ["IN_APP"],
                    idempotencyKey: `dlocal_deposit_failed_${payload.id}`,
                    data: {
                        title: "Deposit Failed",
                        message: `Your dLocal deposit has failed. Status: ${payload.status}. ${payload.status_detail || "Please contact support for assistance."}`,
                        link: "/wallet",
                    },
                    priority: "NORMAL"
                });
                console_1.logger.info("DLOCAL", `Failure notification queued for ${user.email} - deposit ${payload.id} failed`);
            }
            catch (emailError) {
                console_1.logger.error("DLOCAL", "Failed to send failure notification", emailError);
            }
            if (user.email) {
                try {
                    await emails_1.emailQueue.add({
                        emailData: {
                            TO: user.email,
                            USER_ID: user.id,
                            FIRSTNAME: user.firstName,
                            TRANSACTION_TYPE: "DEPOSIT",
                            TRANSACTION_ID: transaction.id,
                            TRANSACTION_STATUS: payload.status,
                            AMOUNT: payload.amount,
                            CURRENCY: payload.currency,
                            NEW_BALANCE: "N/A",
                            NOTE: payload.status_detail ||
                                "Your dLocal deposit could not be completed. Please contact support for assistance.",
                        },
                        emailType: "TransactionStatusUpdate",
                    });
                }
                catch (emailError) {
                    console_1.logger.error("DLOCAL", `Failed to queue deposit failure email for user ${user.id} (${user.email})`, emailError instanceof Error ? emailError : new Error(String(emailError)));
                }
            }
        }
        if (isReversingWebhook) {
            const kind = payload.status === "CHARGEBACK" ? "chargeback" : "refund";
            const isPartial = payload.status === "PARTIALLY_REFUNDED";
            const portion = isPartial ? refundedPortion(payload) : null;
            if (isPartial && portion === null) {
                console_1.logger.warn("DLOCAL", `[MANUAL] PARTIALLY_REFUNDED on payment ${payload.id} (order ${payload.order_id}) ` +
                    `carried no refunded portion. Nothing was reversed — apply the partial refund by hand.`);
                return {
                    message: "Partial refund needs an operator: the payload carries no refunded portion",
                    status: "manual",
                };
            }
            const result = await (0, reversal_1.reverseDepositByReference)({
                provider: "dlocal",
                kind,
                depositReference: payload.order_id,
                eventReference: isPartial
                    ? partialReversalReference(payload, portion)
                    : payload.id,
                reportedAmount: isPartial ? portion : undefined,
                allowPartial: isPartial,
                metadata: {
                    dlocalPaymentId: payload.id,
                    dlocalStatus: payload.status,
                    statusDetail: payload.status_detail,
                },
                detail: payload.status_detail || undefined,
            });
            if (result.outcome === "no_wallet") {
                await notifyAdminsOfMissingWallet(user, payload, kind);
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `Wallet not found for ${kind}: user ${user.id}, currency ${payload.currency}`,
                });
            }
            console_1.logger.info("DLOCAL", `${payload.status} on payment ${payload.id}: ${result.outcome} ` +
                `(debited ${result.debited}, shortfall ${result.shortfall})`);
            return {
                message: "Webhook processed successfully",
                status: "ok",
                reversal: result.outcome,
            };
        }
        return {
            message: "Webhook processed successfully",
            status: "ok",
        };
    }
    catch (error) {
        console_1.logger.error("DLOCAL", "Webhook processing error", error);
        const code = Number(error === null || error === void 0 ? void 0 : error.statusCode);
        if (Number.isFinite(code) && code >= 400 && code < 500)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: (error === null || error === void 0 ? void 0 : error.message) || "Webhook processing failed" });
    }
};
function refundedPortion(payload) {
    const candidates = [
        payload === null || payload === void 0 ? void 0 : payload.refunded_amount,
        payload === null || payload === void 0 ? void 0 : payload.amount_refunded,
        payload === null || payload === void 0 ? void 0 : payload.refund_amount,
    ];
    if (payload === null || payload === void 0 ? void 0 : payload.payment_id)
        candidates.unshift(payload.amount);
    for (const candidate of candidates) {
        const n = Number(candidate);
        if (Number.isFinite(n) && n > 0)
            return n;
    }
    return null;
}
function partialReversalReference(payload, portion) {
    if ((payload === null || payload === void 0 ? void 0 : payload.payment_id) && (payload === null || payload === void 0 ? void 0 : payload.id))
        return String(payload.id);
    return `${payload.id}:partial:${portion}`;
}
async function notifyAdminsOfMissingWallet(user, payload, kind) {
    try {
        const admins = await db_1.models.user.findAll({
            include: [{
                    model: db_1.models.role,
                    as: "role",
                    where: {
                        name: ["Admin", "Super Admin"],
                    },
                }],
            attributes: ["id"],
        });
        for (const admin of admins) {
            await notification_1.notificationService.send({
                userId: admin.id,
                type: "ALERT",
                channels: ["IN_APP"],
                idempotencyKey: `dlocal_${kind}_nowallet_${payload.id}_${admin.id}`,
                data: {
                    title: `CRITICAL: ${kind === "chargeback" ? "Chargeback" : "Refund"} Wallet Not Found`,
                    message: `Cannot process ${kind}: wallet not found for user ${user.id}, currency ${payload.currency}. Payment ID: ${payload.id}. Manual intervention required.`,
                    link: `/admin/finance/transactions`,
                },
                priority: "HIGH"
            });
        }
    }
    catch (adminNotifError) {
        console_1.logger.error("DLOCAL", "Failed to send critical admin notification", adminNotifError);
    }
}
