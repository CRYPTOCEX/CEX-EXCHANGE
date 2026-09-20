"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: 'Checks Mollie payment status',
    description: 'Retrieves current payment status from Mollie API and updates local records',
    operationId: 'checkMolliePaymentStatus',
    tags: ['Finance', 'Deposit', 'Mollie'],
    requiresAuth: true,
    parameters: [
        {
            name: 'transactionId',
            in: 'query',
            required: true,
            schema: {
                type: 'string',
            },
            description: 'Transaction UUID',
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
                                    transactionId: { type: 'string' },
                                    molliePaymentId: { type: 'string' },
                                    status: { type: 'string' },
                                    mollieStatus: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    method: { type: 'string' },
                                    createdAt: { type: 'string' },
                                    expiresAt: { type: 'string' },
                                    paidAt: { type: 'string' },
                                    isCancelable: { type: 'boolean' },
                                    checkoutUrl: { type: 'string' },
                                    details: { type: 'object' },
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
    var _a, _b;
    const { query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'Authentication required',
        });
    }
    if (!query.transactionId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Transaction ID is required',
        });
    }
    (0, utils_1.validateMollieConfig)();
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: query.transactionId,
                userId: user.id,
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction not found',
            });
        }
        const molliePaymentId = transaction.referenceId || (0, utils_2.parseTransactionMetadata)(transaction.metadata).molliePaymentId;
        if (!molliePaymentId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Mollie payment ID not found for this transaction',
            });
        }
        let mollieAnswered = false;
        try {
            const molliePayment = await (0, utils_1.makeApiRequest)(`/payments/${molliePaymentId}`);
            if (!molliePayment) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: 'Payment not found at Mollie',
                });
            }
            mollieAnswered = true;
            const currentMollieStatus = (0, utils_2.parseTransactionMetadata)(transaction.metadata).mollieStatus;
            if (currentMollieStatus !== molliePayment.status) {
                const newStatus = (0, utils_1.mapMollieStatus)(molliePayment.status);
                await db_1.models.transaction.update({
                    status: newStatus,
                    metadata: JSON.stringify({
                        ...(0, utils_2.parseTransactionMetadata)(transaction.metadata),
                        molliePaymentId: molliePayment.id,
                        mollieStatus: molliePayment.status,
                        lastStatusCheck: new Date().toISOString(),
                    }),
                }, {
                    where: { id: transaction.id },
                });
            }
            return {
                success: true,
                data: {
                    transactionId: transaction.id,
                    molliePaymentId: molliePayment.id,
                    status: (0, utils_1.mapMollieStatus)(molliePayment.status),
                    mollieStatus: molliePayment.status,
                    amount: parseFloat(molliePayment.amount.value),
                    currency: molliePayment.amount.currency,
                    method: molliePayment.method || 'unknown',
                    createdAt: molliePayment.createdAt,
                    expiresAt: molliePayment.expiresAt || null,
                    paidAt: molliePayment.status === 'paid' ? molliePayment.createdAt : null,
                    isCancelable: molliePayment.isCancelable,
                    checkoutUrl: ((_b = (_a = molliePayment._links) === null || _a === void 0 ? void 0 : _a.checkout) === null || _b === void 0 ? void 0 : _b.href) || null,
                    details: molliePayment.details || {},
                },
            };
        }
        catch (mollieError) {
            if (mollieAnswered)
                throw mollieError;
            console_1.logger.warn("MOLLIE", `Failed to fetch from Mollie API: ${mollieError.message}`);
            return {
                success: true,
                data: {
                    transactionId: transaction.id,
                    molliePaymentId: molliePaymentId,
                    status: transaction.status,
                    mollieStatus: (0, utils_2.parseTransactionMetadata)(transaction.metadata).mollieStatus || 'unknown',
                    amount: transaction.amount,
                    currency: (0, utils_2.parseTransactionMetadata)(transaction.metadata).currency || 'EUR',
                    method: (0, utils_2.parseTransactionMetadata)(transaction.metadata).method || 'unknown',
                    createdAt: transaction.createdAt,
                    expiresAt: (0, utils_2.parseTransactionMetadata)(transaction.metadata).expiresAt || null,
                    paidAt: transaction.status === 'COMPLETED' ? transaction.updatedAt : null,
                    isCancelable: false,
                    checkoutUrl: (0, utils_2.parseTransactionMetadata)(transaction.metadata).checkoutUrl || null,
                    details: {},
                    note: 'Status retrieved from local database due to API unavailability',
                },
            };
        }
    }
    catch (error) {
        console_1.logger.error("MOLLIE", "Status check error", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || String(error) || 'Failed to check Mollie payment status',
        });
    }
};
