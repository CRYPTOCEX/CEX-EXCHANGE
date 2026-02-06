"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const notification_1 = require("@b/services/notification");
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
    var _a, _b;
    const { body, headers, ctx } = data;
    try {
        const config = (0, utils_1.getDLocalConfig)();
        const xDate = headers["x-date"];
        const authorization = headers["authorization"];
        if (!xDate || !authorization) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Missing required headers for signature verification" });
        }
        const requestBody = JSON.stringify(body);
        const isValidSignature = (0, utils_1.verifyWebhookSignature)(authorization, config.xLogin, xDate, requestBody, config.secretKey);
        if (!isValidSignature) {
            console_1.logger.error("DLOCAL", "Webhook signature verification failed");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid webhook signature" });
        }
        const payload = body;
        console_1.logger.info("DLOCAL", `Webhook received for payment ${payload.id}, order ${payload.order_id}, status: ${payload.status}`);
        const transactionResult = await db_1.models.transaction.findOne({
            where: { referenceId: payload.order_id },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    include: [
                        {
                            model: db_1.models.wallet,
                            as: "wallets",
                        },
                    ],
                },
            ],
        });
        if (!transactionResult) {
            console_1.logger.error("DLOCAL", `Transaction not found for order ID: ${payload.order_id}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const transaction = transactionResult;
        if (!transaction.user) {
            console_1.logger.error("DLOCAL", `User not found for transaction: ${transaction.id}`);
            throw (0, error_1.createError)({ statusCode: 404, message: "User not found for transaction" });
        }
        const user = transaction.user;
        const internalStatus = utils_1.DLOCAL_STATUS_MAPPING[payload.status] || "pending";
        const previousStatus = transaction.status;
        await transaction.update({
            status: internalStatus.toUpperCase(),
            metadata: JSON.stringify({
                ...transaction.metadata,
                dlocal_payment_id: payload.id,
                dlocal_status: payload.status,
                dlocal_status_code: payload.status_code,
                dlocal_status_detail: payload.status_detail,
                payment_method_type: payload.payment_method_type,
                approved_date: payload.approved_date,
                webhook_received_at: new Date().toISOString(),
                live: payload.live,
            }),
        });
        if (payload.status === "PAID" && previousStatus !== "COMPLETED") {
            const currency = payload.currency;
            const depositAmount = transaction.amount;
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
                const idempotencyKey = `dlocal_webhook_${payload.id}`;
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
            });
            console_1.logger.success("DLOCAL", `Wallet updated for user ${user.id}: +${transaction.amount} ${currency}`);
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
        }
        if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(payload.status) && previousStatus === "COMPLETED") {
            console_1.logger.info("DLOCAL", `Payment refunded: ${payload.id}, status: ${payload.status}`);
            const currency = payload.currency;
            const refundAmount = payload.amount;
            const wallet = (_a = user.wallets) === null || _a === void 0 ? void 0 : _a.find((w) => w.currency === currency);
            if (wallet) {
                const newBalance = Number(wallet.balance) - Number(refundAmount);
                await wallet.update({
                    balance: Math.max(0, newBalance),
                });
                console_1.logger.info("DLOCAL", `Wallet updated for user ${user.id}: -${refundAmount} ${currency} (refund)`);
                try {
                    await notification_1.notificationService.send({
                        userId: user.id,
                        type: "ALERT",
                        channels: ["IN_APP"],
                        idempotencyKey: `dlocal_refund_user_${payload.id}`,
                        data: {
                            title: payload.status === "REFUNDED" ? "Deposit Refunded" : "Deposit Partially Refunded",
                            message: `Your dLocal deposit of ${refundAmount} ${currency} has been ${payload.status === "REFUNDED" ? "fully" : "partially"} refunded and deducted from your wallet. ${payload.status_detail || ""}`,
                            link: "/wallet",
                        },
                        priority: "HIGH"
                    });
                }
                catch (notifError) {
                    console_1.logger.error("DLOCAL", "Failed to send refund notification", notifError);
                }
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
                            idempotencyKey: `dlocal_refund_admin_${payload.id}_${admin.id}`,
                            data: {
                                title: "Deposit Refund Processed",
                                message: `dLocal deposit refund processed: ${refundAmount} ${currency} for user ${user.id}. Payment ID: ${payload.id}`,
                                link: `/admin/finance/transactions`,
                            },
                            priority: "NORMAL"
                        });
                    }
                }
                catch (adminNotifError) {
                    console_1.logger.error("DLOCAL", "Failed to send admin refund notification", adminNotifError);
                }
            }
            else {
                console_1.logger.error("DLOCAL", `Wallet not found for refund: user ${user.id}, currency ${currency}`);
            }
        }
        if (payload.status === "CHARGEBACK" && previousStatus === "COMPLETED") {
            console_1.logger.warn("DLOCAL", `Payment chargeback: ${payload.id}`);
            const currency = payload.currency;
            const chargebackAmount = payload.amount;
            const wallet = (_b = user.wallets) === null || _b === void 0 ? void 0 : _b.find((w) => w.currency === currency);
            if (wallet) {
                const newBalance = Number(wallet.balance) - Number(chargebackAmount);
                await wallet.update({
                    balance: Math.max(0, newBalance),
                });
                console_1.logger.warn("DLOCAL", `Wallet updated for user ${user.id}: -${chargebackAmount} ${currency} (chargeback)`);
                try {
                    await notification_1.notificationService.send({
                        userId: user.id,
                        type: "ALERT",
                        channels: ["IN_APP"],
                        idempotencyKey: `dlocal_chargeback_user_${payload.id}`,
                        data: {
                            title: "Deposit Chargeback",
                            message: `Your dLocal deposit of ${chargebackAmount} ${currency} has been charged back and deducted from your wallet. ${payload.status_detail || "Please contact support if you have questions."}`,
                            link: "/wallet",
                        },
                        priority: "HIGH"
                    });
                }
                catch (notifError) {
                    console_1.logger.error("DLOCAL", "Failed to send chargeback notification", notifError);
                }
                try {
                    const admins = await db_1.models.user.findAll({
                        include: [{
                                model: db_1.models.role,
                                as: "role",
                                where: {
                                    name: ["Admin", "Super Admin"],
                                },
                            }],
                        attributes: ["id", "email"],
                    });
                    for (const admin of admins) {
                        await notification_1.notificationService.send({
                            userId: admin.id,
                            type: "ALERT",
                            channels: ["IN_APP"],
                            idempotencyKey: `dlocal_chargeback_admin_${payload.id}_${admin.id}`,
                            data: {
                                title: "CRITICAL: Deposit Chargeback",
                                message: `dLocal deposit chargeback detected: ${chargebackAmount} ${currency} for user ${user.id} (${user.email}). Payment ID: ${payload.id}. Immediate review required.`,
                                link: `/admin/finance/transactions`,
                            },
                            priority: "HIGH"
                        });
                    }
                    console_1.logger.warn("DLOCAL", `Admin chargeback notifications sent for payment ${payload.id}`);
                }
                catch (adminNotifError) {
                    console_1.logger.error("DLOCAL", "Failed to send admin chargeback notification", adminNotifError);
                }
            }
            else {
                console_1.logger.error("DLOCAL", `Wallet not found for chargeback: user ${user.id}, currency ${currency}`);
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
                            idempotencyKey: `dlocal_chargeback_nowallet_${payload.id}_${admin.id}`,
                            data: {
                                title: "CRITICAL: Chargeback Wallet Not Found",
                                message: `Cannot process chargeback: wallet not found for user ${user.id}, currency ${currency}. Payment ID: ${payload.id}. Manual intervention required.`,
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
        }
        return {
            message: "Webhook processed successfully",
            status: "ok",
        };
    }
    catch (error) {
        console_1.logger.error("DLOCAL", "Webhook processing error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: (error === null || error === void 0 ? void 0 : error.message) || "Webhook processing failed" });
    }
};
