"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("./utils");
const reversal_1 = require("../reversal");
const credit_contract_1 = require("../credit-contract");
exports.metadata = {
    summary: 'Handles Paytm webhook notifications',
    description: 'Processes real-time payment notifications from Paytm with checksum verification and status updates',
    operationId: 'paytmWebhook',
    tags: ['Finance', 'Deposit', 'Paytm', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Paytm webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        orderId: { type: 'string' },
                        mid: { type: 'string' },
                        txnId: { type: 'string' },
                        txnAmount: { type: 'string' },
                        paymentMode: { type: 'string' },
                        currency: { type: 'string' },
                        txnDate: { type: 'string' },
                        status: { type: 'string' },
                        respCode: { type: 'string' },
                        respMsg: { type: 'string' },
                        gatewayName: { type: 'string' },
                        bankTxnId: { type: 'string' },
                        bankName: { type: 'string' },
                        checksumhash: { type: 'string' },
                    },
                    required: ['orderId', 'mid', 'status', 'checksumhash'],
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
            description: 'Unauthorized - Invalid checksum',
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
    const { body, headers } = data;
    const webhookData = body;
    try {
        (0, utils_2.validatePaytmConfig)();
        if (!webhookData.orderId || !webhookData.mid || !webhookData.status || !webhookData.checksumhash) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Missing required webhook fields',
            });
        }
        if (webhookData.mid !== utils_2.PAYTM_CONFIG.MID) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid merchant ID',
            });
        }
        const { checksumhash, ...paramsWithoutChecksum } = webhookData;
        const isValidChecksum = (0, utils_2.verifyChecksumHash)(paramsWithoutChecksum, checksumhash, utils_2.PAYTM_CONFIG.MERCHANT_KEY);
        if (!isValidChecksum) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Invalid webhook signature',
            });
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: webhookData.orderId,
                type: 'DEPOSIT',
            },
            include: [
                {
                    model: db_1.models.user,
                    as: 'user',
                },
            ],
        });
        if (!transaction) {
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
        const metadata = JSON.parse(transaction.metadata || '{}');
        if (metadata.gateway !== 'paytm') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid gateway for this transaction',
            });
        }
        const newStatus = (0, utils_2.mapPaytmStatus)(webhookData.status);
        const txnAmount = (0, utils_2.parsePaytmAmount)(webhookData.txnAmount || '0', webhookData.currency || 'INR');
        if (transaction.status === newStatus) {
            return {
                success: true,
                message: 'Webhook processed - no status change',
            };
        }
        if (newStatus === 'REFUNDED') {
            const result = await (0, reversal_1.reverseDepositByReference)({
                provider: "paytm",
                kind: "refund",
                depositReference: transaction.referenceId,
                eventReference: String(webhookData.txnId || webhookData.orderId || ''),
                reportedAmount: txnAmount > 0 ? txnAmount : undefined,
                metadata: { paytmStatus: webhookData.status, txnId: webhookData.txnId },
            });
            if (result.outcome === "no_wallet") {
                console_1.logger.error("PAYTM", `[CRITICAL] refund on ${transaction.referenceId} could not be applied: no wallet. Manual reversal required.`);
            }
            return {
                success: true,
                message: `Reversal handled: ${result.outcome}`,
            };
        }
        const currency = webhookData.currency || 'INR';
        if (newStatus === 'COMPLETED') {
            if (txnAmount + 0.01 < transaction.amount) {
                console_1.logger.error('PAYTM', `Under-payment for order ${webhookData.orderId}: expected=${transaction.amount}, got=${txnAmount}`);
                await transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...metadata,
                        rejectionReason: 'amount_underpayment',
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                });
                return { success: true, message: 'Amount underpayment — transaction rejected' };
            }
            const expectedCurrency = metadata.currency || currency;
            if (currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
                console_1.logger.error('PAYTM', `Currency mismatch for order ${webhookData.orderId}: expected=${expectedCurrency}, got=${currency}`);
                await transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...metadata,
                        rejectionReason: 'currency_mismatch',
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                });
                return { success: true, message: 'Currency mismatch — transaction rejected' };
            }
            let newBalance;
            let alreadyCredited = false;
            try {
                const depositResult = await (0, utils_1.processFiatDeposit)({
                    userId: user.id,
                    currency,
                    amount: transaction.amount,
                    fee: (_a = transaction.fee) !== null && _a !== void 0 ? _a : 0,
                    referenceId: (0, credit_contract_1.creditReferenceId)(transaction, webhookData.orderId),
                    method: 'PAYTM',
                    description: `Paytm deposit - ${transaction.amount} ${currency}`,
                    metadata: {
                        txnId: webhookData.txnId,
                        bankTxnId: webhookData.bankTxnId,
                        paymentMode: webhookData.paymentMode,
                        source: 'webhook',
                    },
                    idempotencyKey: `paytm_deposit_${webhookData.orderId}`,
                });
                newBalance = depositResult.newBalance;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info('PAYTM', `Deposit ${webhookData.orderId} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            await transaction.update({
                status: 'COMPLETED',
                metadata: JSON.stringify({
                    ...metadata,
                    txnId: webhookData.txnId,
                    bankTxnId: webhookData.bankTxnId,
                    paymentMode: webhookData.paymentMode,
                    bankName: webhookData.bankName,
                    gatewayName: webhookData.gatewayName,
                    respCode: webhookData.respCode,
                    respMsg: webhookData.respMsg,
                    txnDate: webhookData.txnDate,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            });
            if (!alreadyCredited && typeof newBalance === 'number') {
                try {
                    await (0, emails_1.sendFiatTransactionEmail)(user, transaction, currency, newBalance);
                }
                catch (emailError) {
                    console_1.logger.error('PAYTM', 'Failed to send confirmation email', emailError);
                }
            }
        }
        else {
            await transaction.update({
                status: newStatus,
                metadata: JSON.stringify({
                    ...metadata,
                    txnId: webhookData.txnId,
                    respCode: webhookData.respCode,
                    respMsg: webhookData.respMsg,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            });
        }
        console_1.logger.success('PAYTM', `Webhook processed: Order ${webhookData.orderId}, Status: ${newStatus}, Amount: ${txnAmount}`);
        return {
            success: true,
            message: 'Webhook processed successfully',
        };
    }
    catch (error) {
        if (error instanceof utils_2.PaytmError) {
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
            message: 'Failed to process Paytm webhook',
        });
    }
};
