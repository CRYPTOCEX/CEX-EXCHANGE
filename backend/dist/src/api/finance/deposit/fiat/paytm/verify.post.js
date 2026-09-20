"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/utils");
const credit_contract_1 = require("../credit-contract");
const utils_2 = require("./utils");
exports.metadata = {
    summary: 'Verifies a Paytm payment',
    description: 'Handles return URL verification after payment completion and updates transaction status',
    operationId: 'verifyPaytmPayment',
    tags: ['Finance', 'Deposit', 'Paytm'],
    requiresAuth: true,
    logModule: "PAYTM_DEPOSIT",
    logTitle: "Verify Paytm payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        orderId: {
                            type: 'string',
                            description: 'Paytm order ID',
                        },
                        txnId: {
                            type: 'string',
                            description: 'Paytm transaction ID',
                        },
                        checksumHash: {
                            type: 'string',
                            description: 'Checksum hash for verification',
                        },
                        status: {
                            type: 'string',
                            description: 'Transaction status from Paytm',
                        },
                    },
                    required: ['orderId'],
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
                                    order_id: { type: 'string' },
                                    txn_id: { type: 'string' },
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway: { type: 'string' },
                                    payment_mode: { type: 'string' },
                                    bank_name: { type: 'string' },
                                    verified_at: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid parameters or verification failed',
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
    const { orderId, txnId, checksumHash, status } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!orderId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Order ID is required',
        });
    }
    try {
        (0, utils_2.validatePaytmConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: orderId,
                userId: user.id,
                type: 'DEPOSIT',
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
        if (existingMetadata.gateway !== 'paytm') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid gateway for this transaction',
            });
        }
        if (transaction.status === 'COMPLETED') {
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    order_id: orderId,
                    txn_id: existingMetadata.txnId || '',
                    status: 'COMPLETED',
                    amount: transaction.amount,
                    currency: existingMetadata.currency || 'INR',
                    gateway: 'paytm',
                    payment_mode: existingMetadata.paymentMode || '',
                    bank_name: existingMetadata.bankName || '',
                    verified_at: transaction.updatedAt,
                },
            };
        }
        if (checksumHash) {
            const { checksumHash: hash, ...paramsWithoutChecksum } = body;
            const isValidChecksum = (0, utils_2.verifyChecksumHash)(paramsWithoutChecksum, checksumHash, utils_2.PAYTM_CONFIG.MERCHANT_KEY);
            if (!isValidChecksum) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: 'Invalid checksum verification',
                });
            }
        }
        const verifyRequest = {
            body: {
                mid: utils_2.PAYTM_CONFIG.MID,
                orderId: orderId,
            }
        };
        const verifyChecksum = (0, utils_2.generateChecksumHash)(verifyRequest.body, utils_2.PAYTM_CONFIG.MERCHANT_KEY);
        verifyRequest.body['checksumHash'] = verifyChecksum;
        const verifyResponse = await (0, utils_2.makePaytmRequest)('/merchant-status/api/v1/getPaymentStatus', {
            method: 'POST',
            body: verifyRequest,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const paytmStatus = verifyResponse.body.resultInfo.resultStatus;
        const mappedStatus = (0, utils_2.mapPaytmStatus)(paytmStatus);
        const txnAmount = (0, utils_2.parsePaytmAmount)(verifyResponse.body.txnAmount || '0', existingMetadata.currency || 'INR');
        if (mappedStatus === 'COMPLETED') {
            const currency = existingMetadata.currency || 'INR';
            const recordedAmount = Number(transaction.amount);
            const recordedFee = Number(transaction.fee) || 0;
            if (txnAmount + 0.01 < recordedAmount) {
                console_1.logger.error('PAYTM', `Under-payment for order ${orderId}: expected=${recordedAmount}, got=${txnAmount}`);
                await transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        rejectionReason: 'amount_underpayment',
                        paytmVerifyResponse: verifyResponse.body,
                        verifiedAt: new Date().toISOString(),
                    }),
                });
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Paytm reported ${txnAmount} against a recorded deposit of ${recordedAmount}; deposit rejected`,
                });
            }
            let newBalance;
            await db_1.sequelize.transaction(async (t) => {
                try {
                    const res = await (0, utils_1.processFiatDeposit)({
                        userId: user.id,
                        currency,
                        amount: recordedAmount,
                        fee: recordedFee,
                        referenceId: (0, credit_contract_1.creditReferenceId)(transaction, orderId),
                        method: 'PAYTM',
                        description: `Paytm deposit - ${verifyResponse.body.txnId || orderId}`,
                        metadata: {
                            gateway: 'paytm',
                            txnId: verifyResponse.body.txnId,
                            bankTxnId: verifyResponse.body.bankTxnId,
                            paymentMode: verifyResponse.body.paymentMode,
                            bankName: verifyResponse.body.bankName,
                            source: 'verify',
                        },
                        idempotencyKey: `paytm_deposit_${orderId}`,
                        transaction: t,
                    });
                    newBalance = res.newBalance;
                }
                catch (err) {
                    if (!(err instanceof wallet_1.DuplicateOperationError))
                        throw err;
                    console_1.logger.info('PAYTM', `Deposit ${orderId} already credited (idempotency hit)`);
                }
                await transaction.update({
                    status: mappedStatus,
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        txnId: verifyResponse.body.txnId,
                        bankTxnId: verifyResponse.body.bankTxnId,
                        paymentMode: verifyResponse.body.paymentMode,
                        bankName: verifyResponse.body.bankName,
                        gatewayName: verifyResponse.body.gatewayName,
                        paytmVerifyResponse: verifyResponse.body,
                        verifiedAt: new Date().toISOString(),
                    }),
                }, { transaction: t });
            });
            if (typeof newBalance === 'number') {
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
                status: mappedStatus,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    txnId: verifyResponse.body.txnId,
                    bankTxnId: verifyResponse.body.bankTxnId,
                    paymentMode: verifyResponse.body.paymentMode,
                    bankName: verifyResponse.body.bankName,
                    gatewayName: verifyResponse.body.gatewayName,
                    paytmVerifyResponse: verifyResponse.body,
                    verifiedAt: new Date().toISOString(),
                }),
            });
        }
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                order_id: orderId,
                txn_id: verifyResponse.body.txnId || '',
                status: mappedStatus,
                amount: txnAmount,
                currency: existingMetadata.currency || 'INR',
                gateway: 'paytm',
                payment_mode: verifyResponse.body.paymentMode || '',
                bank_name: verifyResponse.body.bankName || '',
                gateway_name: verifyResponse.body.gatewayName || '',
                bank_txn_id: verifyResponse.body.bankTxnId || '',
                verified_at: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        if (error instanceof utils_2.PaytmError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: error.message,
            });
        }
        if (error === null || error === void 0 ? void 0 : error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'Failed to verify Paytm payment',
        });
    }
};
