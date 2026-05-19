"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Checks Paysafe payment status',
    description: 'Queries current payment status from Paysafe and updates local transaction record',
    operationId: 'checkPaysafePaymentStatus',
    tags: ['Finance', 'Deposit', 'Paysafe'],
    requiresAuth: true,
    parameters: [
        {
            name: 'reference',
            in: 'query',
            required: true,
            schema: {
                type: 'string',
                description: 'Transaction reference number',
            },
        },
        {
            name: 'payment_id',
            in: 'query',
            required: false,
            schema: {
                type: 'string',
                description: 'Paysafe payment ID (optional)',
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
                                    gateway_status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    payment_id: { type: 'string' },
                                    gateway_transaction_id: { type: 'string' },
                                    created_at: { type: 'string' },
                                    updated_at: { type: 'string' },
                                    expires_at: { type: 'string' },
                                    is_expired: { type: 'boolean' },
                                    checkout_url: { type: 'string' },
                                    return_url: { type: 'string' },
                                    processor: { type: 'string' },
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
    var _a, _b, _c;
    const { user, query } = data;
    const { reference, payment_id } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!reference) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Transaction reference is required',
        });
    }
    try {
        (0, utils_1.validatePaysafeConfig)();
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
        const createdAt = new Date(transaction.createdAt);
        const expiresAt = new Date(createdAt.getTime() + (60 * 60 * 1000));
        const isExpired = new Date() > expiresAt;
        if (isExpired && transaction.status === 'PENDING') {
            const existingMetadata = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            await transaction.update({
                status: 'EXPIRED',
                metadata: JSON.stringify({
                    ...existingMetadata,
                    expiredAt: new Date().toISOString(),
                }),
            });
        }
        let paymentDetails = null;
        const parsedMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        let gatewayStatus = (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.gatewayStatus) || 'UNKNOWN';
        let gatewayTransactionId = (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.gatewayTransactionId) || null;
        let processor = (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.processorId) || 'PAYSAFE';
        if (!isExpired && transaction.status === 'PENDING') {
            try {
                if (payment_id) {
                    paymentDetails = await (0, utils_1.makeApiRequest)(`payments/${payment_id}`, { method: 'GET' });
                }
                else {
                    const paymentsResponse = await (0, utils_1.makeApiRequest)(`payments?merchantRefNum=${reference}`, { method: 'GET' });
                    if (Array.isArray(paymentsResponse) && paymentsResponse.length > 0) {
                        paymentDetails = paymentsResponse[0];
                    }
                }
                if (paymentDetails) {
                    const mappedStatus = (0, utils_1.mapPaysafeStatus)(paymentDetails.status);
                    gatewayStatus = paymentDetails.status;
                    gatewayTransactionId = paymentDetails.gatewayReconciliationId || paymentDetails.id;
                    processor = ((_a = paymentDetails.gatewayResponse) === null || _a === void 0 ? void 0 : _a.processor) || 'PAYSAFE';
                    if (transaction.status !== mappedStatus) {
                        await transaction.update({
                            status: mappedStatus,
                            metadata: JSON.stringify({
                                ...parsedMetadata,
                                paymentId: paymentDetails.id,
                                gatewayTransactionId: gatewayTransactionId,
                                gatewayStatus: gatewayStatus,
                                processorId: processor,
                                lastStatusCheck: new Date().toISOString(),
                                gatewayResponse: paymentDetails.gatewayResponse,
                            }),
                        });
                        transaction.status = mappedStatus;
                    }
                }
            }
            catch (apiError) {
                console_1.logger.error('PAYSAFE', 'Failed to get payment status from Paysafe', apiError);
            }
        }
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const checkoutUrl = (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.checkoutUrl) || `${baseUrl}/user/wallet/deposit`;
        const returnUrl = `${baseUrl}/user/wallet/deposit/paysafe/verify`;
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                reference: transaction.id,
                status: transaction.status,
                gateway_status: gatewayStatus,
                amount: transaction.amount,
                currency: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.currency) || 'USD',
                payment_id: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.paymentId) || payment_id || null,
                gateway_transaction_id: gatewayTransactionId,
                created_at: (_b = transaction.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString(),
                updated_at: (_c = transaction.updatedAt) === null || _c === void 0 ? void 0 : _c.toISOString(),
                expires_at: expiresAt.toISOString(),
                is_expired: isExpired,
                checkout_url: checkoutUrl,
                return_url: returnUrl,
                processor: processor,
                payment_handle_id: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.paymentHandleId) || null,
                payment_handle_token: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.paymentHandleToken) || null,
                gateway_response: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.gatewayResponse) || null,
                last_status_check: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.lastStatusCheck) || null,
                webhook_events: {
                    last_event_id: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.webhookEventId) || null,
                    last_event_type: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.webhookEventType) || null,
                    last_event_time: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.webhookEventTime) || null,
                    last_webhook_update: (parsedMetadata === null || parsedMetadata === void 0 ? void 0 : parsedMetadata.lastWebhookUpdate) || null,
                },
            },
        };
    }
    catch (error) {
        console_1.logger.error('PAYSAFE', 'Status check error', error);
        if (error instanceof utils_1.PaysafeError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: `Paysafe Error: ${error.message}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Failed to check Paysafe payment status',
        });
    }
};
