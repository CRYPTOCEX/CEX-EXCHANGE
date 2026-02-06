"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: 'Handles Mollie webhook notifications',
    description: 'Processes payment status updates from Mollie backend notifications',
    operationId: 'mollieWebhook',
    tags: ['Finance', 'Deposit', 'Mollie', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Mollie webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/x-www-form-urlencoded': {
                schema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Mollie payment ID',
                        },
                    },
                    required: ['id'],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Webhook processed successfully',
            content: {
                'text/plain': {
                    schema: {
                        type: 'string',
                        example: 'OK',
                    },
                },
            },
        },
        400: { description: 'Bad request' },
        404: { description: 'Payment not found' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { body } = data;
    if (!body.id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment ID is required',
        });
    }
    (0, utils_1.validateMollieConfig)();
    try {
        const molliePaymentId = body.id;
        const molliePayment = await (0, utils_1.makeApiRequest)(`/payments/${molliePaymentId}`);
        if (!molliePayment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Payment not found at Mollie',
            });
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: molliePaymentId,
            },
        });
        if (!transaction) {
            const transactionByMetadata = await db_1.models.transaction.findOne({
                where: {
                    metadata: {
                        molliePaymentId: molliePaymentId,
                    },
                },
            });
            if (!transactionByMetadata) {
                console_1.logger.warn("MOLLIE", `No transaction found for Mollie payment ID: ${molliePaymentId}`);
                return 'OK';
            }
        }
        const targetTransaction = transaction || await db_1.models.transaction.findOne({
            where: {
                metadata: {
                    molliePaymentId: molliePaymentId,
                },
            },
        });
        if (!targetTransaction) {
            console_1.logger.warn("MOLLIE", `No transaction found for Mollie payment ID: ${molliePaymentId}`);
            return 'OK';
        }
        const transactionMetadata = targetTransaction.metadata;
        const currentMollieStatus = transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.mollieStatus;
        if (currentMollieStatus === molliePayment.status) {
            return 'OK';
        }
        const newStatus = (0, utils_1.mapMollieStatus)(molliePayment.status);
        const user = await db_1.models.user.findByPk(targetTransaction.userId);
        if (!user) {
            console_1.logger.error("MOLLIE", `User not found for transaction: ${targetTransaction.id}`);
            return 'OK';
        }
        if (molliePayment.status === 'paid' && targetTransaction.status !== 'COMPLETED') {
            await db_1.sequelize.transaction(async (dbTransaction) => {
                await db_1.models.transaction.update({
                    status: 'COMPLETED',
                    referenceId: molliePayment.id,
                    metadata: JSON.stringify({
                        ...transactionMetadata,
                        molliePaymentId: molliePayment.id,
                        mollieStatus: molliePayment.status,
                        paymentMethod: molliePayment.method || 'unknown',
                        paidAt: molliePayment.createdAt,
                        settlementAmount: molliePayment.settlementAmount,
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                }, {
                    where: { id: targetTransaction.id },
                    transaction: dbTransaction,
                });
                const currency = (transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.currency) || 'EUR';
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, 'FIAT', currency, dbTransaction);
                const wallet = walletResult.wallet;
                const idempotencyKey = `mollie_webhook_${molliePaymentId}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: 'FIAT',
                    currency,
                    amount: targetTransaction.amount,
                    operationType: 'DEPOSIT',
                    referenceId: molliePaymentId,
                    description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
                    metadata: {
                        method: 'MOLLIE',
                        molliePaymentId: molliePayment.id,
                        paymentMethod: molliePayment.method || 'unknown',
                    },
                    transaction: dbTransaction,
                });
                if (molliePayment.settlementAmount && molliePayment.amount) {
                    const originalAmount = (0, utils_1.parseMollieAmount)(molliePayment.amount.value, molliePayment.amount.currency);
                    const settlementAmount = (0, utils_1.parseMollieAmount)(molliePayment.settlementAmount.value, molliePayment.settlementAmount.currency);
                    const fee = originalAmount - settlementAmount;
                    if (fee > 0) {
                        await db_1.models.transaction.update({ fee: fee / 100 }, {
                            where: { id: targetTransaction.id },
                            transaction: dbTransaction,
                        });
                    }
                }
            });
            try {
                const currency = (transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.currency) || 'EUR';
                const updatedWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency: currency,
                        type: 'FIAT',
                    },
                });
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    id: targetTransaction.id,
                    type: 'DEPOSIT',
                    amount: targetTransaction.amount,
                    status: 'COMPLETED',
                    description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
                }, currency, (updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.balance) || 0);
            }
            catch (emailError) {
                console_1.logger.error('MOLLIE', 'Failed to send confirmation email', emailError);
            }
        }
        else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
            await db_1.models.transaction.update({
                status: newStatus,
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    failureReason: ((_a = molliePayment.details) === null || _a === void 0 ? void 0 : _a.failureReason) || 'Payment failed',
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, {
                where: { id: targetTransaction.id },
            });
            try {
                const currency = (transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.currency) || 'EUR';
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    id: targetTransaction.id,
                    type: 'DEPOSIT',
                    amount: targetTransaction.amount,
                    status: newStatus,
                    description: `Mollie deposit failed - ${targetTransaction.amount} ${currency}`,
                }, currency, 0);
            }
            catch (emailError) {
                console_1.logger.error('MOLLIE', 'Failed to send failure notification email', emailError);
            }
        }
        else {
            await db_1.models.transaction.update({
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, {
                where: { id: targetTransaction.id },
            });
        }
        console_1.logger.success("MOLLIE", `Webhook processed: Payment ${molliePaymentId} status ${molliePayment.status}`);
        return 'OK';
    }
    catch (error) {
        console_1.logger.error('MOLLIE', 'Webhook processing error', error);
        if ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('API key')) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: 'Configuration error',
            });
        }
        return 'OK';
    }
};
