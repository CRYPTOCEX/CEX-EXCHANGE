"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
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
        const molliePaymentId = transaction.referenceId || ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.molliePaymentId);
        if (!molliePaymentId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Mollie payment ID not found for this transaction',
            });
        }
        try {
            const molliePayment = await (0, utils_1.makeApiRequest)(`/payments/${molliePaymentId}`);
            if (!molliePayment) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: 'Payment not found at Mollie',
                });
            }
            const currentMollieStatus = (_b = transaction.metadata) === null || _b === void 0 ? void 0 : _b.mollieStatus;
            if (currentMollieStatus !== molliePayment.status) {
                const newStatus = (0, utils_1.mapMollieStatus)(molliePayment.status);
                await db_1.models.transaction.update({
                    status: newStatus,
                    metadata: JSON.stringify({
                        ...transaction.metadata,
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
                    checkoutUrl: ((_d = (_c = molliePayment._links) === null || _c === void 0 ? void 0 : _c.checkout) === null || _d === void 0 ? void 0 : _d.href) || null,
                    details: molliePayment.details || {},
                },
            };
        }
        catch (mollieError) {
            console_1.logger.warn("MOLLIE", `Failed to fetch from Mollie API: ${mollieError.message}`);
            return {
                success: true,
                data: {
                    transactionId: transaction.id,
                    molliePaymentId: molliePaymentId,
                    status: transaction.status,
                    mollieStatus: ((_e = transaction.metadata) === null || _e === void 0 ? void 0 : _e.mollieStatus) || 'unknown',
                    amount: transaction.amount,
                    currency: ((_f = transaction.metadata) === null || _f === void 0 ? void 0 : _f.currency) || 'EUR',
                    method: ((_g = transaction.metadata) === null || _g === void 0 ? void 0 : _g.method) || 'unknown',
                    createdAt: transaction.createdAt,
                    expiresAt: ((_h = transaction.metadata) === null || _h === void 0 ? void 0 : _h.expiresAt) || null,
                    paidAt: transaction.status === 'COMPLETED' ? transaction.updatedAt : null,
                    isCancelable: false,
                    checkoutUrl: ((_j = transaction.metadata) === null || _j === void 0 ? void 0 : _j.checkoutUrl) || null,
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
