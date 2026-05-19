"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Checks Paytm payment status',
    description: 'Queries current payment status with 1-hour expiration timeout and updates local transaction records',
    operationId: 'checkPaytmPaymentStatus',
    tags: ['Finance', 'Deposit', 'Paytm'],
    requiresAuth: true,
    parameters: [
        {
            name: 'orderId',
            in: 'query',
            required: true,
            schema: {
                type: 'string',
                description: 'Paytm order ID',
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
                                    order_id: { type: 'string' },
                                    txn_id: { type: 'string' },
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway: { type: 'string' },
                                    payment_mode: { type: 'string' },
                                    bank_name: { type: 'string' },
                                    gateway_name: { type: 'string' },
                                    bank_txn_id: { type: 'string' },
                                    txn_date: { type: 'string' },
                                    is_expired: { type: 'boolean' },
                                    expires_at: { type: 'string' },
                                    callback_url: { type: 'string' },
                                    last_updated: { type: 'string' },
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
    const { orderId } = query;
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
        (0, utils_1.validatePaytmConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: orderId,
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
        const metadata = JSON.parse(transaction.metadata || '{}');
        if (metadata.gateway !== 'paytm') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid gateway for this transaction',
            });
        }
        const createdAt = new Date(transaction.createdAt);
        const expirationTime = new Date(createdAt.getTime() + 60 * 60 * 1000);
        const isExpired = new Date() > expirationTime;
        if (isExpired && transaction.status === 'PENDING') {
            await transaction.update({
                status: 'EXPIRED',
                metadata: JSON.stringify({
                    ...metadata,
                    expiredAt: new Date().toISOString(),
                    reason: 'Payment timeout after 1 hour',
                }),
            });
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    order_id: orderId,
                    txn_id: metadata.txnId || '',
                    status: 'EXPIRED',
                    amount: transaction.amount,
                    currency: metadata.currency || 'INR',
                    gateway: 'paytm',
                    payment_mode: metadata.paymentMode || '',
                    bank_name: metadata.bankName || '',
                    gateway_name: metadata.gatewayName || '',
                    bank_txn_id: metadata.bankTxnId || '',
                    txn_date: metadata.txnDate || '',
                    is_expired: true,
                    expires_at: expirationTime.toISOString(),
                    callback_url: metadata.callbackUrl || '',
                    last_updated: new Date().toISOString(),
                },
            };
        }
        if (transaction.status !== 'PENDING') {
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    order_id: orderId,
                    txn_id: metadata.txnId || '',
                    status: transaction.status,
                    amount: transaction.amount,
                    currency: metadata.currency || 'INR',
                    gateway: 'paytm',
                    payment_mode: metadata.paymentMode || '',
                    bank_name: metadata.bankName || '',
                    gateway_name: metadata.gatewayName || '',
                    bank_txn_id: metadata.bankTxnId || '',
                    txn_date: metadata.txnDate || '',
                    is_expired: isExpired,
                    expires_at: expirationTime.toISOString(),
                    callback_url: metadata.callbackUrl || '',
                    last_updated: transaction.updatedAt,
                },
            };
        }
        const statusRequest = {
            body: {
                mid: utils_1.PAYTM_CONFIG.MID,
                orderId: orderId,
            }
        };
        const checksum = (0, utils_1.generateChecksumHash)(statusRequest.body, utils_1.PAYTM_CONFIG.MERCHANT_KEY);
        statusRequest.body['checksumHash'] = checksum;
        const statusResponse = await (0, utils_1.makePaytmRequest)('/merchant-status/api/v1/getPaymentStatus', {
            method: 'POST',
            body: statusRequest,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const paytmStatus = statusResponse.body.resultInfo.resultStatus;
        const mappedStatus = (0, utils_1.mapPaytmStatus)(paytmStatus);
        const txnAmount = (0, utils_1.parsePaytmAmount)(statusResponse.body.txnAmount || '0', metadata.currency || 'INR');
        if (mappedStatus !== transaction.status) {
            await transaction.update({
                status: mappedStatus,
                referenceId: statusResponse.body.txnId || transaction.referenceId,
                metadata: JSON.stringify({
                    ...metadata,
                    txnId: statusResponse.body.txnId,
                    bankTxnId: statusResponse.body.bankTxnId,
                    paymentMode: statusResponse.body.paymentMode,
                    bankName: statusResponse.body.bankName,
                    gatewayName: statusResponse.body.gatewayName,
                    txnDate: statusResponse.body.txnDate,
                    paytmStatusResponse: statusResponse.body,
                    lastStatusCheck: new Date().toISOString(),
                }),
            });
        }
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                order_id: orderId,
                txn_id: statusResponse.body.txnId || '',
                status: mappedStatus,
                amount: txnAmount,
                currency: statusResponse.body.currency || metadata.currency || 'INR',
                gateway: 'paytm',
                payment_mode: statusResponse.body.paymentMode || '',
                bank_name: statusResponse.body.bankName || '',
                gateway_name: statusResponse.body.gatewayName || '',
                bank_txn_id: statusResponse.body.bankTxnId || '',
                txn_date: statusResponse.body.txnDate || '',
                is_expired: isExpired,
                expires_at: expirationTime.toISOString(),
                callback_url: metadata.callbackUrl || '',
                last_updated: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        if (error instanceof utils_1.PaytmError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: error.message,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: 'Failed to check Paytm payment status',
        });
    }
};
