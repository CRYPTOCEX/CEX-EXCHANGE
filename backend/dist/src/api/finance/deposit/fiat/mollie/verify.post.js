"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: 'Verifies Mollie payment status',
    description: 'Handles return URL from Mollie and verifies payment completion',
    operationId: 'verifyMolliePayment',
    tags: ['Finance', 'Deposit', 'Mollie'],
    requiresAuth: true,
    logModule: "MOLLIE_DEPOSIT",
    logTitle: "Verify Mollie payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        transaction: {
                            type: 'string',
                            description: 'Transaction UUID',
                        },
                        paymentId: {
                            type: 'string',
                            description: 'Mollie payment ID (optional)',
                        },
                    },
                    required: ['transaction'],
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
                                    transactionId: { type: 'string' },
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    paymentMethod: { type: 'string' },
                                    paidAt: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        404: { description: 'Transaction not found' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'Authentication required',
        });
    }
    if (!body.transaction) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Transaction ID is required',
        });
    }
    (0, utils_1.validateMollieConfig)();
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: body.transaction,
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
        if (transaction.status === 'COMPLETED') {
            return {
                success: true,
                data: {
                    transactionId: transaction.id,
                    status: 'COMPLETED',
                    amount: transaction.amount,
                    currency: (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'EUR',
                    paymentMethod: (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.method) || 'unknown',
                    paidAt: transaction.updatedAt,
                },
            };
        }
        const molliePaymentId = body.paymentId || transaction.referenceId || (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.molliePaymentId);
        if (!molliePaymentId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Mollie payment ID not found',
            });
        }
        const molliePayment = await (0, utils_1.makeApiRequest)(`/payments/${molliePaymentId}`);
        if (!molliePayment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Payment not found at Mollie',
            });
        }
        const newStatus = (0, utils_1.mapMollieStatus)(molliePayment.status);
        let updatedTransaction = transaction;
        const currentStatus = transaction.status;
        if (molliePayment.status === 'paid' && currentStatus !== 'COMPLETED') {
            const currency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'EUR';
            let fee = 0;
            if (molliePayment.settlementAmount && molliePayment.amount) {
                const originalAmount = (0, utils_1.parseMollieAmount)(molliePayment.amount.value, molliePayment.amount.currency);
                const settlementAmount = (0, utils_1.parseMollieAmount)(molliePayment.settlementAmount.value, molliePayment.settlementAmount.currency);
                fee = (originalAmount - settlementAmount) / 100;
            }
            await db_1.models.transaction.update({
                status: 'COMPLETED',
                referenceId: molliePayment.id,
                fee,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    paymentMethod: molliePayment.method || 'unknown',
                    paidAt: molliePayment.createdAt,
                    settlementAmount: molliePayment.settlementAmount,
                }),
            }, {
                where: { id: transaction.id },
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: transaction.amount,
                fee,
                referenceId: molliePayment.id,
                method: 'MOLLIE',
                description: `Mollie deposit - ${transaction.amount} ${currency}`,
                metadata: {
                    molliePaymentId: molliePayment.id,
                    paymentMethod: molliePayment.method || 'unknown',
                },
                idempotencyKey: `mollie_deposit_${molliePayment.id}`,
                ctx,
            });
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    id: transaction.id,
                    type: 'DEPOSIT',
                    amount: transaction.amount,
                    status: 'COMPLETED',
                    description: `Mollie deposit - ${transaction.amount} ${currency}`,
                }, currency, depositResult.newBalance);
            }
            catch (emailError) {
                console_1.logger.error("MOLLIE", "Failed to send confirmation email", emailError);
            }
            updatedTransaction = await db_1.models.transaction.findOne({
                where: { id: transaction.id },
            });
        }
        else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
            await db_1.models.transaction.update({
                status: newStatus,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    failureReason: ((_a = molliePayment.details) === null || _a === void 0 ? void 0 : _a.failureReason) || 'Payment failed',
                }),
            }, {
                where: { id: transaction.id },
            });
            updatedTransaction = await db_1.models.transaction.findOne({
                where: { id: transaction.id },
            });
        }
        else {
            await db_1.models.transaction.update({
                metadata: JSON.stringify({
                    ...existingMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                }),
            }, {
                where: { id: transaction.id },
            });
            updatedTransaction = await db_1.models.transaction.findOne({
                where: { id: transaction.id },
            });
        }
        const updatedMetadata = typeof (updatedTransaction === null || updatedTransaction === void 0 ? void 0 : updatedTransaction.metadata) === 'string'
            ? JSON.parse(updatedTransaction.metadata || '{}')
            : ((updatedTransaction === null || updatedTransaction === void 0 ? void 0 : updatedTransaction.metadata) || {});
        return {
            success: true,
            data: {
                transactionId: updatedTransaction === null || updatedTransaction === void 0 ? void 0 : updatedTransaction.id,
                status: updatedTransaction === null || updatedTransaction === void 0 ? void 0 : updatedTransaction.status,
                amount: updatedTransaction === null || updatedTransaction === void 0 ? void 0 : updatedTransaction.amount,
                currency: (updatedMetadata === null || updatedMetadata === void 0 ? void 0 : updatedMetadata.currency) || 'EUR',
                paymentMethod: molliePayment.method || 'unknown',
                paidAt: molliePayment.status === 'paid' ? molliePayment.createdAt : null,
            },
        };
    }
    catch (error) {
        console_1.logger.error("MOLLIE", "Payment verification error", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || 'Failed to verify Mollie payment',
        });
    }
};
