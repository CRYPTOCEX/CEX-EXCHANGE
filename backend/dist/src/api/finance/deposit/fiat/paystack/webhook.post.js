"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Handles Paystack webhook notifications',
    description: 'Processes real-time payment status updates from Paystack webhooks',
    operationId: 'handlePaystackWebhook',
    tags: ['Finance', 'Deposit', 'Paystack', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Paystack webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        event: {
                            type: 'string',
                            description: 'Webhook event type',
                            example: 'charge.success',
                        },
                        data: {
                            type: 'object',
                            description: 'Transaction data from Paystack',
                        },
                    },
                    required: ['event', 'data'],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Webhook processed successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid webhook data',
        },
        401: {
            description: 'Unauthorized - Invalid signature',
        },
        404: {
            description: 'Transaction not found',
        },
        500: {
            description: 'Internal server error',
        },
    },
};
exports.default = async (data) => {
    const { body, headers } = data;
    const signature = headers['x-paystack-signature'];
    try {
        const rawBody = JSON.stringify(body);
        if (!signature || !(0, utils_1.validateWebhookSignature)(rawBody, signature)) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Invalid webhook signature',
            });
        }
        const webhookData = body;
        const { event, data: transactionData } = webhookData;
        console_1.logger.info("PAYSTACK", `Received webhook: ${event} - ref: ${transactionData.reference}, status: ${transactionData.status}`);
        if (event !== utils_1.PAYSTACK_WEBHOOK_EVENTS.CHARGE_SUCCESS) {
            console_1.logger.debug("PAYSTACK", `Ignoring webhook event: ${event}`);
            return {
                success: true,
                message: `Event ${event} acknowledged but not processed`,
            };
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: transactionData.reference,
            },
            include: [
                {
                    model: db_1.models.user,
                    as: 'user',
                    attributes: ['id', 'email', 'firstName', 'lastName'],
                },
            ],
        });
        if (!transaction) {
            console_1.logger.warn("PAYSTACK", `Transaction not found for reference: ${transactionData.reference}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found',
            });
        }
        const user = transaction.user;
        if (!user) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'User not found for transaction',
            });
        }
        if (['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transaction.status)) {
            console_1.logger.debug("PAYSTACK", `Transaction ${transaction.id} already in final state: ${transaction.status}`);
            return {
                success: true,
                message: 'Transaction already processed',
            };
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        const transactionCurrency = existingMetadata.currency || transactionData.currency || 'USD';
        const newStatus = (0, utils_1.mapPaystackStatus)(transactionData.status);
        const actualAmount = (0, utils_1.parsePaystackAmount)(transactionData.amount, transactionData.currency);
        const gatewayFees = (0, utils_1.parsePaystackAmount)(transactionData.fees || 0, transactionData.currency);
        if (Math.abs(actualAmount - transaction.amount) > 0.01) {
            console_1.logger.error("PAYSTACK", `Amount mismatch for transaction ${transaction.id}: expected ${transaction.amount}, got ${actualAmount}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Transaction amount mismatch',
            });
        }
        if (transactionData.currency !== transactionCurrency) {
            console_1.logger.error("PAYSTACK", `Currency mismatch for transaction ${transaction.id}: expected ${transactionCurrency}, got ${transactionData.currency}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Transaction currency mismatch',
            });
        }
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await transaction.update({
                status: newStatus,
                referenceId: transactionData.reference,
                fee: gatewayFees,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    paystack_transaction_id: transactionData.id,
                    paystack_status: transactionData.status,
                    gateway_response: transactionData.gateway_response,
                    paid_at: transactionData.paid_at,
                    channel: transactionData.channel,
                    authorization: transactionData.authorization,
                    customer: transactionData.customer,
                    fees_breakdown: transactionData.fees_breakdown,
                    webhook_processed_at: new Date().toISOString(),
                }),
            }, { transaction: dbTransaction });
            if (newStatus === 'COMPLETED') {
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", transactionCurrency, dbTransaction);
                const wallet = walletResult.wallet;
                if (!wallet) {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: 'Failed to create or find wallet',
                    });
                }
                const idempotencyKey = `paystack_webhook_${transaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency: transactionCurrency,
                    amount: transaction.amount,
                    operationType: "DEPOSIT",
                    referenceId: transaction.id,
                    description: `Paystack deposit of ${transaction.amount} ${transactionCurrency}`,
                    metadata: {
                        method: "PAYSTACK",
                        paystackTransactionId: transactionData.id,
                    },
                    transaction: dbTransaction,
                });
                console_1.logger.success("PAYSTACK", `Wallet updated for user ${user.id}: +${transaction.amount} ${transactionCurrency}`);
            }
            await dbTransaction.commit();
            console_1.logger.info("PAYSTACK", `Transaction ${transaction.id} updated to status: ${newStatus}`);
            if (newStatus === 'COMPLETED') {
                try {
                    const updatedWallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: user.id,
                            currency: transactionCurrency,
                        },
                    });
                    const newBalance = (updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.balance) || transaction.amount;
                    await (0, emails_1.sendFiatTransactionEmail)(user, transaction, transactionCurrency, newBalance);
                    console_1.logger.success("PAYSTACK", `Confirmation email sent for transaction ${transaction.id}`);
                }
                catch (emailError) {
                    console_1.logger.error("PAYSTACK", "Failed to send confirmation email", emailError);
                }
            }
            return {
                success: true,
                message: 'Webhook processed successfully',
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            console_1.logger.error("PAYSTACK", "Database error processing webhook", dbError);
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("PAYSTACK", "Error processing webhook", error);
        if (error instanceof utils_1.PaystackError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: error.message,
            });
        }
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'Failed to process webhook',
        });
    }
};
