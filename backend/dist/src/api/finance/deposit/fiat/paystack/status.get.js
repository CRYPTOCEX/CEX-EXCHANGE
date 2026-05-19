"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Checks Paystack payment status',
    description: 'Queries current payment status from Paystack and updates local transaction records',
    operationId: 'checkPaystackPaymentStatus',
    tags: ['Finance', 'Deposit', 'Paystack'],
    requiresAuth: true,
    parameters: [
        {
            name: 'reference',
            in: 'query',
            required: true,
            schema: {
                type: 'string',
                description: 'Payment reference to check',
            },
        },
    ],
    responses: {
        200: {
            description: 'Payment status retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'object',
                                properties: {
                                    transaction_id: { type: 'string' },
                                    reference: { type: 'string' },
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway: { type: 'string' },
                                    gateway_response: { type: 'string' },
                                    paid_at: { type: 'string' },
                                    channel: { type: 'string' },
                                    fees: { type: 'number' },
                                    authorization_url: { type: 'string' },
                                    expired: { type: 'boolean' },
                                    expires_at: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid parameters',
        },
        401: {
            description: 'Unauthorized',
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
    const { user, query } = data;
    const { reference } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!reference) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment reference is required',
        });
    }
    try {
        (0, utils_1.validatePaystackConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: reference,
                userId: user.id,
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found',
            });
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        const authorizationUrl = existingMetadata.authorization_url || '';
        const transactionCurrency = existingMetadata.currency || 'NGN';
        const createdAt = new Date(transaction.createdAt);
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const transactionStatus = transaction.status;
        const isExpired = createdAt < oneHourAgo && transactionStatus === 'PENDING';
        if (['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transactionStatus) || isExpired) {
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: reference,
                    status: isExpired ? 'EXPIRED' : transactionStatus,
                    amount: transaction.amount,
                    currency: transactionCurrency,
                    gateway: 'paystack',
                    gateway_response: existingMetadata.gateway_response || 'N/A',
                    paid_at: existingMetadata.paid_at || null,
                    channel: existingMetadata.channel || 'unknown',
                    fees: transaction.fee || 0,
                    authorization_url: authorizationUrl,
                    expired: isExpired,
                    expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
                },
            };
        }
        try {
            const verifyResponse = await (0, utils_1.makePaystackRequest)(`/transaction/verify/${reference}`, {
                method: 'GET',
            });
            if (verifyResponse.status && verifyResponse.data) {
                const paystackTransaction = verifyResponse.data;
                const newStatus = (0, utils_1.mapPaystackStatus)(paystackTransaction.status);
                const actualAmount = (0, utils_1.parsePaystackAmount)(paystackTransaction.amount, paystackTransaction.currency);
                const gatewayFees = (0, utils_1.parsePaystackAmount)(paystackTransaction.fees || 0, paystackTransaction.currency);
                if (newStatus !== transactionStatus) {
                    await transaction.update({
                        status: newStatus,
                        referenceId: paystackTransaction.reference,
                        fee: gatewayFees,
                        metadata: JSON.stringify({
                            ...existingMetadata,
                            paystack_transaction_id: paystackTransaction.id,
                            paystack_status: paystackTransaction.status,
                            gateway_response: paystackTransaction.gateway_response,
                            paid_at: paystackTransaction.paid_at,
                            channel: paystackTransaction.channel,
                            authorization: paystackTransaction.authorization,
                            customer: paystackTransaction.customer,
                            fees_breakdown: paystackTransaction.fees_breakdown,
                            status_checked_at: new Date().toISOString(),
                        }),
                    });
                    if (newStatus === 'COMPLETED' && transactionStatus !== 'COMPLETED') {
                        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", transactionCurrency);
                        const wallet = walletResult.wallet;
                        if (!wallet) {
                            throw (0, error_1.createError)({
                                statusCode: 500,
                                message: 'Failed to create or find wallet',
                            });
                        }
                        const idempotencyKey = `paystack_status_${transaction.id}`;
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
                                paystackTransactionId: paystackTransaction.id,
                            },
                        });
                    }
                }
                return {
                    success: true,
                    data: {
                        transaction_id: transaction.id,
                        reference: reference,
                        status: newStatus,
                        amount: actualAmount,
                        currency: paystackTransaction.currency,
                        gateway: 'paystack',
                        gateway_response: paystackTransaction.gateway_response,
                        paid_at: paystackTransaction.paid_at,
                        channel: paystackTransaction.channel,
                        fees: gatewayFees,
                        authorization_url: authorizationUrl,
                        expired: false,
                        expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
                    },
                };
            }
        }
        catch (paystackError) {
            console_1.logger.warn('PAYSTACK', 'Failed to check Paystack status', paystackError);
        }
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                reference: reference,
                status: transactionStatus,
                amount: transaction.amount,
                currency: transactionCurrency,
                gateway: 'paystack',
                gateway_response: existingMetadata.gateway_response || 'Status check failed',
                paid_at: existingMetadata.paid_at || null,
                channel: existingMetadata.channel || 'unknown',
                fees: transaction.fee || 0,
                authorization_url: authorizationUrl,
                expired: isExpired,
                expires_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
            },
        };
    }
    catch (error) {
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
            message: 'Failed to check payment status',
        });
    }
};
