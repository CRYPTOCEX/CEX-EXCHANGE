"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: 'Handles PayFast ITN webhook',
    description: 'Processes PayFast Instant Transaction Notification (ITN) callbacks',
    operationId: 'handlePayFastWebhook',
    tags: ['Finance', 'Deposit', 'PayFast', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "PayFast webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/x-www-form-urlencoded': {
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
                        amount_fee: {
                            type: 'string',
                            description: 'PayFast processing fee',
                        },
                        amount_net: {
                            type: 'string',
                            description: 'Net amount after fees',
                        },
                        signature: {
                            type: 'string',
                            description: 'PayFast signature for verification',
                        },
                    },
                    required: ['m_payment_id', 'pf_payment_id', 'payment_status'],
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
        400: { description: 'Bad request - invalid webhook data' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    const { body } = data;
    console_1.logger.info('PAYFAST', `ITN received: ${body.m_payment_id}, status: ${body.payment_status}, amount: ${body.amount_gross}`);
    if (!body.m_payment_id || !body.pf_payment_id || !body.payment_status) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Required webhook fields missing',
        });
    }
    (0, utils_1.validatePayFastConfig)();
    try {
        if (utils_1.PAYFAST_CONFIG.PASSPHRASE) {
            const isValidSignature = (0, utils_1.validateSignature)(body, utils_1.PAYFAST_CONFIG.PASSPHRASE);
            if (!isValidSignature) {
                console_1.logger.error('PAYFAST', 'ITN signature validation failed');
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: 'Invalid webhook signature',
                });
            }
        }
        const itnValidation = await (0, utils_1.validateITN)(body);
        if (!itnValidation.valid) {
            console_1.logger.warn('PAYFAST', `ITN validation failed: ${itnValidation.error}`);
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: body.m_payment_id
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
            console_1.logger.error('PAYFAST', `Transaction not found for ITN: ${body.m_payment_id}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found',
            });
        }
        const currentStatus = transaction.status;
        const newStatus = (0, utils_1.mapPayFastStatus)(body.payment_status);
        if (currentStatus === newStatus) {
            console_1.logger.debug('PAYFAST', 'ITN: Status unchanged, skipping processing');
            return 'OK';
        }
        const grossAmount = (0, utils_1.parsePayFastAmount)(body.amount_gross);
        const feeAmount = (0, utils_1.parsePayFastAmount)(body.amount_fee || '0');
        const netAmount = (0, utils_1.parsePayFastAmount)(body.amount_net || body.amount_gross) - feeAmount;
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
                        itn_received_at: new Date().toISOString(),
                        signature_valid: true,
                        itn_valid: itnValidation.valid,
                        webhook_data: body
                    }
                })
            }, { transaction: dbTransaction });
            if (newStatus === 'COMPLETED' && currentStatus !== 'COMPLETED') {
                const currency = (existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.currency) || 'ZAR';
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(transaction.userId, 'FIAT', currency, dbTransaction);
                const wallet = walletResult.wallet;
                if (!wallet) {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: 'Failed to get or create wallet',
                    });
                }
                const idempotencyKey = `payfast_webhook_${body.pf_payment_id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: transaction.userId,
                    walletId: wallet.id,
                    walletType: 'FIAT',
                    currency,
                    amount: netAmount,
                    operationType: 'DEPOSIT',
                    referenceId: body.pf_payment_id,
                    description: `PayFast deposit - ${netAmount} ${currency}`,
                    metadata: {
                        method: 'PAYFAST',
                        pfPaymentId: body.pf_payment_id,
                        grossAmount,
                        feeAmount,
                    },
                    transaction: dbTransaction,
                });
                const newBalance = parseFloat(String(wallet.balance)) + netAmount;
                if (feeAmount > 0) {
                    await (0, fees_1.collectPlatformFee)({
                        userId: transaction.userId,
                        currency,
                        walletType: "FIAT",
                        feeAmount,
                        type: "DEPOSIT",
                        description: `Platform fee from PayFast deposit for transaction ${transaction.id}`,
                        referenceId: transaction.id,
                        metadata: { method: "payfast" },
                    });
                }
                try {
                    await (0, emails_1.sendFiatTransactionEmail)(transaction.user, transaction, currency, newBalance);
                }
                catch (emailError) {
                    console_1.logger.error('PAYFAST', 'Failed to send confirmation email', emailError);
                }
            }
            await dbTransaction.commit();
            console_1.logger.success('PAYFAST', `ITN processed: Transaction ${transaction.id}, ${currentStatus} → ${newStatus}, amount: ${grossAmount}, fee: ${feeAmount}`);
            return 'OK';
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error('PAYFAST', 'ITN processing error', error);
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: 'Webhook processing failed',
        });
    }
};
