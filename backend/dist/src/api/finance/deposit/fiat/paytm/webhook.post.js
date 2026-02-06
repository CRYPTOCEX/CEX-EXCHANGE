"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
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
    const { body, headers } = data;
    const webhookData = body;
    try {
        (0, utils_1.validatePaytmConfig)();
        if (!webhookData.orderId || !webhookData.mid || !webhookData.status || !webhookData.checksumhash) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Missing required webhook fields',
            });
        }
        if (webhookData.mid !== utils_1.PAYTM_CONFIG.MID) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid merchant ID',
            });
        }
        const { checksumhash, ...paramsWithoutChecksum } = webhookData;
        const isValidChecksum = (0, utils_1.verifyChecksumHash)(paramsWithoutChecksum, checksumhash, utils_1.PAYTM_CONFIG.MERCHANT_KEY);
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
        const newStatus = (0, utils_1.mapPaytmStatus)(webhookData.status);
        const txnAmount = (0, utils_1.parsePaytmAmount)(webhookData.txnAmount || '0', webhookData.currency || 'INR');
        if (transaction.status === newStatus) {
            return {
                success: true,
                message: 'Webhook processed - no status change',
            };
        }
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await transaction.update({
                status: newStatus,
                referenceId: webhookData.txnId || transaction.referenceId,
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
                    webhookData: webhookData,
                }),
            }, { transaction: dbTransaction });
            if (newStatus === 'COMPLETED') {
                const wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency: webhookData.currency || 'INR',
                        type: 'FIAT',
                    },
                    transaction: dbTransaction,
                });
                if (wallet) {
                    const newBalance = parseFloat(String(wallet.balance)) + txnAmount;
                    await wallet.update({ balance: newBalance }, { transaction: dbTransaction });
                    await dbTransaction.commit();
                    try {
                        await (0, emails_1.sendFiatTransactionEmail)(user, transaction, webhookData.currency || 'INR', newBalance);
                    }
                    catch (emailError) {
                        console_1.logger.error('PAYTM', 'Failed to send confirmation email', emailError);
                    }
                }
                else {
                    await dbTransaction.rollback();
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: 'User wallet not found',
                    });
                }
            }
            else {
                await dbTransaction.commit();
            }
            console_1.logger.success('PAYTM', `Webhook processed: Order ${webhookData.orderId}, Status: ${newStatus}, Amount: ${txnAmount}`);
            return {
                success: true,
                message: 'Webhook processed successfully',
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        if (error instanceof utils_1.PaytmError) {
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
