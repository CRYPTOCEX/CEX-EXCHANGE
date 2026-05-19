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
    summary: 'Verifies PayFast payment return',
    description: 'Handles PayFast return URL verification after payment completion',
    operationId: 'verifyPayFastPayment',
    tags: ['Finance', 'Deposit', 'PayFast'],
    requiresAuth: true,
    logModule: "PAYFAST_DEPOSIT",
    logTitle: "Verify PayFast payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        m_payment_id: {
                            type: 'string',
                            description: 'Merchant payment ID',
                        },
                        pf_payment_id: {
                            type: 'string',
                            description: 'PayFast payment ID',
                        },
                        payment_status: {
                            type: 'string',
                            description: 'Payment status from PayFast',
                        },
                        amount_gross: {
                            type: 'string',
                            description: 'Gross payment amount',
                        },
                        signature: {
                            type: 'string',
                            description: 'PayFast signature for verification',
                        },
                    },
                    required: ['m_payment_id', 'payment_status'],
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
                                    paymentId: { type: 'string' },
                                    verified: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: { description: 'Bad request - invalid parameters' },
        401: { description: 'Unauthorized' },
        404: { description: 'Transaction not found' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    const { body, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'Authentication required',
        });
    }
    if (!body.m_payment_id || !body.payment_status) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment ID and status are required',
        });
    }
    (0, utils_1.validatePayFastConfig)();
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: body.m_payment_id,
                userId: user.id,
                status: 'PENDING'
            },
            include: [
                {
                    model: db_1.models.user,
                    as: 'user',
                    attributes: ['id', 'email', 'firstName', 'lastName']
                }
            ]
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found or already processed',
            });
        }
        if (body.signature && utils_1.PAYFAST_CONFIG.PASSPHRASE) {
            const isValidSignature = (0, utils_1.validateSignature)(body, utils_1.PAYFAST_CONFIG.PASSPHRASE);
            if (!isValidSignature) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: 'Invalid payment signature',
                });
            }
        }
        const newStatus = (0, utils_1.mapPayFastStatus)(body.payment_status);
        const grossAmount = body.amount_gross ? (0, utils_1.parsePayFastAmount)(body.amount_gross) : transaction.amount;
        const feeAmount = body.amount_fee ? (0, utils_1.parsePayFastAmount)(body.amount_fee) : 0;
        const netAmount = body.amount_net ? (0, utils_1.parsePayFastAmount)(body.amount_net) : grossAmount - feeAmount;
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            const existingMetadata = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            await transaction.update({
                status: newStatus,
                fee: feeAmount,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    payfast: {
                        ...((existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.payfast) || {}),
                        pf_payment_id: body.pf_payment_id,
                        payment_status: body.payment_status,
                        amount_gross: grossAmount,
                        amount_fee: feeAmount,
                        amount_net: netAmount,
                        verified_at: new Date().toISOString(),
                        signature_valid: !!body.signature,
                        return_data: body
                    }
                })
            }, { transaction: dbTransaction });
            if (newStatus === 'COMPLETED') {
                const currency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'ZAR';
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency, dbTransaction);
                const wallet = walletResult.wallet;
                const idempotencyKey = `payfast_verify_${transaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount: netAmount,
                    operationType: "DEPOSIT",
                    referenceId: transaction.id,
                    description: `PayFast deposit of ${netAmount} ${currency}`,
                    metadata: {
                        method: "PAYFAST",
                        paymentId: body.pf_payment_id,
                        fee: feeAmount,
                    },
                    transaction: dbTransaction,
                });
                const newBalance = parseFloat(String(wallet.balance)) + netAmount;
                try {
                    await (0, emails_1.sendFiatTransactionEmail)(transaction.user, transaction, currency, newBalance);
                }
                catch (emailError) {
                    console_1.logger.error('PAYFAST', 'Failed to send confirmation email', emailError);
                }
            }
            await dbTransaction.commit();
            return {
                success: true,
                data: {
                    transactionId: transaction.id,
                    status: newStatus,
                    amount: grossAmount,
                    currency: (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'ZAR',
                    paymentId: body.pf_payment_id || body.m_payment_id,
                    verified: true,
                    fee: feeAmount,
                    netAmount: netAmount
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error('PAYFAST', 'Verification error', error);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message || 'Failed to verify PayFast payment',
        });
    }
};
