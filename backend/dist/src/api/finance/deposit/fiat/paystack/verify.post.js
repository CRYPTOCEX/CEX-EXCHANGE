"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: 'Verifies a Paystack payment',
    description: 'Verifies payment status with Paystack and updates transaction records',
    operationId: 'verifyPaystackPayment',
    tags: ['Finance', 'Deposit', 'Paystack'],
    requiresAuth: true,
    logModule: "PAYSTACK_DEPOSIT",
    logTitle: "Verify Paystack payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        reference: {
                            type: 'string',
                            description: 'Payment reference from Paystack',
                        },
                        trxref: {
                            type: 'string',
                            description: 'Transaction reference (alternative parameter name)',
                        },
                    },
                    anyOf: [
                        { required: ['reference'] },
                        { required: ['trxref'] }
                    ],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Payment verification completed',
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
    const { user, body } = data;
    const { reference, trxref } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    const paymentReference = reference || trxref;
    if (!paymentReference) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment reference is required',
        });
    }
    try {
        (0, utils_1.validatePaystackConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: paymentReference,
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
        const transactionCurrency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'NGN';
        if (transaction.status === 'COMPLETED') {
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: paymentReference,
                    status: 'COMPLETED',
                    amount: transaction.amount,
                    currency: transactionCurrency,
                    gateway: 'paystack',
                    gateway_response: 'Already completed',
                    paid_at: transaction.updatedAt,
                    channel: 'unknown',
                    fees: transaction.fee || 0,
                },
            };
        }
        const verifyResponse = await (0, utils_1.makePaystackRequest)(`/transaction/verify/${paymentReference}`, {
            method: 'GET',
        });
        if (!verifyResponse.status || !verifyResponse.data) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: verifyResponse.message || 'Failed to verify payment with Paystack',
            });
        }
        const paystackTransaction = verifyResponse.data;
        const newStatus = (0, utils_1.mapPaystackStatus)(paystackTransaction.status);
        const actualAmount = (0, utils_1.parsePaystackAmount)(paystackTransaction.amount, paystackTransaction.currency);
        const gatewayFees = (0, utils_1.parsePaystackAmount)(paystackTransaction.fees || 0, paystackTransaction.currency);
        if (Math.abs(actualAmount - transaction.amount) > 0.01) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Transaction amount mismatch',
            });
        }
        if (paystackTransaction.currency !== transactionCurrency) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Transaction currency mismatch',
            });
        }
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
            }),
        });
        if (newStatus === 'COMPLETED') {
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency: transactionCurrency,
                amount: transaction.amount,
                fee: gatewayFees,
                referenceId: paystackTransaction.reference,
                method: 'PAYSTACK',
                description: `Paystack deposit of ${transaction.amount} ${transactionCurrency}`,
                metadata: {
                    paystack_transaction_id: paystackTransaction.id,
                    channel: paystackTransaction.channel,
                },
                idempotencyKey: `paystack_deposit_${paymentReference}`,
            });
            try {
                await (0, emails_1.sendFiatTransactionEmail)(user, transaction, transactionCurrency, depositResult.newBalance);
            }
            catch (emailError) {
                console_1.logger.error('PAYSTACK', 'Failed to send confirmation email', emailError);
            }
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: paymentReference,
                    status: newStatus,
                    amount: actualAmount,
                    currency: paystackTransaction.currency,
                    gateway: 'paystack',
                    gateway_response: paystackTransaction.gateway_response,
                    paid_at: paystackTransaction.paid_at,
                    channel: paystackTransaction.channel,
                    fees: gatewayFees,
                },
            };
        }
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                reference: paymentReference,
                status: newStatus,
                amount: actualAmount,
                currency: paystackTransaction.currency,
                gateway: 'paystack',
                gateway_response: paystackTransaction.gateway_response,
                paid_at: paystackTransaction.paid_at,
                channel: paystackTransaction.channel,
                fees: gatewayFees,
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
            message: 'Failed to verify Paystack payment',
        });
    }
};
