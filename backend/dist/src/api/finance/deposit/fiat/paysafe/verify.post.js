"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Verifies a Paysafe payment',
    description: 'Handles return URL verification after payment completion and updates transaction status',
    operationId: 'verifyPaysafePayment',
    tags: ['Finance', 'Deposit', 'Paysafe'],
    requiresAuth: true,
    logModule: "PAYSAFE_DEPOSIT",
    logTitle: "Verify Paysafe payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        payment_handle_token: {
                            type: 'string',
                            description: 'Payment handle token from Paysafe',
                        },
                        payment_id: {
                            type: 'string',
                            description: 'Payment ID from Paysafe (optional)',
                        },
                        reference: {
                            type: 'string',
                            description: 'Transaction reference',
                        },
                        status: {
                            type: 'string',
                            description: 'Payment status from return URL',
                        },
                    },
                    required: ['payment_handle_token', 'reference'],
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
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway_transaction_id: { type: 'string' },
                                    message: { type: 'string' },
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
    var _a;
    const { user, body } = data;
    const { payment_handle_token, payment_id, reference, status } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!payment_handle_token || !reference) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment handle token and reference are required',
        });
    }
    try {
        (0, utils_1.validatePaysafeConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: reference,
                userId: user.id,
                status: 'PENDING',
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found or already processed',
            });
        }
        let paymentDetails;
        if (payment_id) {
            paymentDetails = await (0, utils_1.makeApiRequest)(`payments/${payment_id}`, { method: 'GET' });
        }
        else {
            try {
                paymentDetails = await (0, utils_1.makeApiRequest)(`payments?merchantRefNum=${reference}`, { method: 'GET' });
                if (Array.isArray(paymentDetails)) {
                    paymentDetails = paymentDetails[0];
                }
            }
            catch (error) {
                console_1.logger.warn('PAYSAFE', `Payment not found, might still be processing: ${error.message}`);
                return {
                    success: true,
                    data: {
                        transaction_id: transaction.id,
                        status: 'PENDING',
                        amount: transaction.amount,
                        currency: ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.currency) || 'USD',
                        message: 'Payment is still being processed',
                    },
                };
            }
        }
        if (!paymentDetails) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Payment details not found in Paysafe',
            });
        }
        if (paymentDetails.merchantRefNum !== reference) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Payment reference mismatch',
            });
        }
        const mappedStatus = (0, utils_1.mapPaysafeStatus)(paymentDetails.status);
        const paymentAmount = (0, utils_1.parsePaysafeAmount)(paymentDetails.amount, paymentDetails.currencyCode);
        const result = await db_1.sequelize.transaction(async (dbTransaction) => {
            var _a;
            const existingMetadata = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            await transaction.update({
                status: mappedStatus,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    paymentId: paymentDetails.id,
                    gatewayTransactionId: paymentDetails.gatewayReconciliationId,
                    gatewayStatus: paymentDetails.status,
                    processedAt: new Date().toISOString(),
                    gatewayResponse: paymentDetails.gatewayResponse,
                    settlements: paymentDetails.settlements,
                }),
            }, { transaction: dbTransaction });
            if (mappedStatus === 'COMPLETED') {
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", paymentDetails.currencyCode, dbTransaction);
                const wallet = walletResult.wallet;
                const idempotencyKey = `paysafe_verify_${transaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency: paymentDetails.currencyCode,
                    amount: paymentAmount,
                    operationType: "DEPOSIT",
                    referenceId: transaction.id,
                    description: `Paysafe deposit of ${paymentAmount} ${paymentDetails.currencyCode}`,
                    metadata: {
                        method: "PAYSAFE",
                        paymentId: paymentDetails.id,
                        gatewayTransactionId: paymentDetails.gatewayReconciliationId,
                    },
                    transaction: dbTransaction,
                });
                const gateway = await db_1.models.depositGateway.findOne({
                    where: { id: 'paysafe' },
                });
                if (gateway) {
                    const percentageFee = gateway.getPercentageFee(paymentDetails.currencyCode);
                    const fixedFee = gateway.getFixedFee(paymentDetails.currencyCode);
                    const totalFee = (paymentAmount * percentageFee / 100) + fixedFee;
                    if (totalFee > 0) {
                        await (0, fees_1.collectPlatformFee)({
                            userId: user.id,
                            currency: paymentDetails.currencyCode,
                            walletType: "FIAT",
                            feeAmount: totalFee,
                            type: "DEPOSIT",
                            description: `Platform fee from Paysafe deposit of ${totalFee} ${paymentDetails.currencyCode}`,
                            referenceId: transaction.id,
                            metadata: { method: "paysafe", userId: user.id },
                        });
                    }
                }
                try {
                    const updatedWallet = await db_1.models.wallet.findOne({
                        where: {
                            userId: user.id,
                            currency: paymentDetails.currencyCode,
                        },
                    });
                    await (0, emails_1.sendFiatTransactionEmail)(user, transaction, paymentDetails.currencyCode, (updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.balance) || paymentAmount);
                }
                catch (emailError) {
                    console_1.logger.error('PAYSAFE', 'Failed to send confirmation email', emailError);
                }
            }
            return {
                transaction_id: transaction.id,
                status: mappedStatus,
                amount: paymentAmount,
                currency: paymentDetails.currencyCode,
                gateway_transaction_id: paymentDetails.id,
                gateway_reconciliation_id: paymentDetails.gatewayReconciliationId,
                processor: (_a = paymentDetails.gatewayResponse) === null || _a === void 0 ? void 0 : _a.processor,
                message: getStatusMessage(mappedStatus),
            };
        });
        return {
            success: true,
            data: result,
        };
    }
    catch (error) {
        console_1.logger.error('PAYSAFE', 'Payment verification error', error);
        if (error instanceof utils_1.PaysafeError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: `Paysafe Error: ${error.message}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || 'Failed to verify Paysafe payment',
        });
    }
};
function getStatusMessage(status) {
    switch (status) {
        case 'COMPLETED':
            return 'Payment completed successfully';
        case 'PENDING':
            return 'Payment is being processed';
        case 'FAILED':
            return 'Payment failed';
        case 'CANCELLED':
            return 'Payment was cancelled';
        case 'EXPIRED':
            return 'Payment session expired';
        case 'REFUNDED':
            return 'Payment has been refunded';
        case 'CHARGEBACK':
            return 'Payment has been charged back';
        default:
            return 'Payment status unknown';
    }
}
