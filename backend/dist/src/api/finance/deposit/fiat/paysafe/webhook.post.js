"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const reversal_1 = require("../reversal");
const utils_2 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: 'Handles Paysafe webhook notifications',
    description: 'Processes real-time payment status updates from Paysafe via webhooks',
    operationId: 'handlePaysafeWebhook',
    tags: ['Finance', 'Deposit', 'Paysafe', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Paysafe webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        eventType: {
                            type: 'string',
                            description: 'Type of webhook event',
                            example: 'payment.completed',
                        },
                        eventId: {
                            type: 'string',
                            description: 'Unique event identifier',
                        },
                        eventTime: {
                            type: 'string',
                            description: 'Event timestamp',
                            format: 'date-time',
                        },
                        object: {
                            type: 'object',
                            description: 'Payment or PaymentHandle object',
                        },
                    },
                    required: ['eventType', 'eventId', 'eventTime', 'object'],
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
                            processed: { type: 'boolean' },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid webhook data',
        },
        401: {
            description: 'Unauthorized - Invalid signature',
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
    var _a, _b;
    const { body, headers } = data;
    try {
        (0, utils_1.validatePaysafeConfig)();
        const signature = headers['x-paysafe-signature'] || headers['paysafe-signature'];
        if (!signature) {
            console_1.logger.error("PAYSAFE", "Webhook rejected: missing signature header");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Missing webhook signature',
            });
        }
        const rawBodyString = data.rawBodyString;
        const rawBody = typeof rawBodyString === 'string' && rawBodyString.length
            ? rawBodyString
            : JSON.stringify(body);
        if (!(0, utils_1.validateWebhookSignature)(rawBody, signature)) {
            console_1.logger.error("PAYSAFE", "Invalid webhook signature");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Invalid webhook signature',
            });
        }
        const webhookData = body;
        if (!webhookData.eventType || !webhookData.object) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid webhook data: missing eventType or object',
            });
        }
        console_1.logger.info("PAYSAFE", `Processing webhook: ${webhookData.eventType} - eventId: ${webhookData.eventId}`);
        const paymentObject = webhookData.object;
        if (!paymentObject.merchantRefNum) {
            console_1.logger.debug("PAYSAFE", "Webhook object missing merchantRefNum, skipping");
            return {
                success: true,
                message: 'Webhook processed (no merchantRefNum)',
                processed: false,
            };
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: paymentObject.merchantRefNum,
            },
            include: [
                {
                    model: db_1.models.user,
                    as: 'user',
                    attributes: ['id', 'email', 'firstName', 'lastName'],
                },
            ],
        });
        if (!transaction) {
            console_1.logger.warn("PAYSAFE", `Transaction not found for reference: ${paymentObject.merchantRefNum}`);
            return {
                success: true,
                message: 'Transaction not found',
                processed: false,
            };
        }
        const currentStatus = (0, utils_1.mapPaysafeStatus)(paymentObject.status);
        if (transaction.status === currentStatus) {
            console_1.logger.debug("PAYSAFE", `Status unchanged for transaction ${transaction.id}: ${currentStatus}`);
            return {
                success: true,
                message: 'Status unchanged',
                processed: false,
            };
        }
        let shouldUpdateWallet = false;
        let paymentAmount = 0;
        if ('amount' in paymentObject && 'currencyCode' in paymentObject) {
            paymentAmount = (0, utils_1.parsePaysafeAmount)(paymentObject.amount, paymentObject.currencyCode);
        }
        switch (webhookData.eventType.toLowerCase()) {
            case 'payment.completed':
            case 'payment.settled':
            case 'paymenthandle.completed':
                shouldUpdateWallet = currentStatus === 'COMPLETED';
                break;
            case 'payment.failed':
            case 'payment.declined':
            case 'payment.cancelled':
            case 'paymenthandle.failed':
            case 'paymenthandle.cancelled':
                shouldUpdateWallet = false;
                break;
            case 'payment.pending':
            case 'payment.processing':
            case 'paymenthandle.pending':
            case 'paymenthandle.processing':
                shouldUpdateWallet = false;
                break;
            case 'payment.refunded':
            case 'refund.completed':
            case 'refund.processed':
            case 'payment.chargeback':
            case 'chargeback.received': {
                const isChargeback = webhookData.eventType.toLowerCase().includes('chargeback');
                const result = await (0, reversal_1.reverseDepositByReference)({
                    provider: "paysafe",
                    kind: isChargeback ? "chargeback" : "refund",
                    depositReference: transaction.referenceId,
                    eventReference: webhookData.eventId || String((_a = paymentObject.id) !== null && _a !== void 0 ? _a : ''),
                    reportedAmount: paymentAmount > 0 ? paymentAmount : undefined,
                    metadata: { eventType: webhookData.eventType, eventId: webhookData.eventId },
                });
                if (result.outcome === "no_wallet") {
                    console_1.logger.error("PAYSAFE", `[CRITICAL] ${webhookData.eventType} on ${transaction.referenceId} could not be applied: no wallet. Manual reversal required.`);
                }
                return {
                    success: true,
                    message: `Reversal handled: ${result.outcome}`,
                    processed: result.outcome === "reversed" || result.outcome === "partial",
                };
            }
            default:
                console_1.logger.debug("PAYSAFE", `Unhandled event type: ${webhookData.eventType}`);
                shouldUpdateWallet = false;
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        let newBalance;
        let alreadyCredited = false;
        if (shouldUpdateWallet && paymentAmount > 0 && 'currencyCode' in paymentObject) {
            const currency = paymentObject.currencyCode;
            if (existingMetadata.currency && existingMetadata.currency.toUpperCase() !== currency.toUpperCase()) {
                console_1.logger.error("PAYSAFE", `Currency mismatch for ${transaction.id}: expected=${existingMetadata.currency}, got=${currency}`);
                await transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        rejectionReason: 'currency_mismatch',
                        webhookEventId: webhookData.eventId,
                        lastWebhookUpdate: new Date().toISOString(),
                    }),
                });
                return { success: true, message: 'Currency mismatch — transaction rejected', processed: false };
            }
            if (paymentAmount + 0.01 < transaction.amount) {
                console_1.logger.error("PAYSAFE", `Under-payment for ${transaction.id}: expected=${transaction.amount}, got=${paymentAmount}`);
                await transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        rejectionReason: 'amount_underpayment',
                        webhookEventId: webhookData.eventId,
                        lastWebhookUpdate: new Date().toISOString(),
                    }),
                });
                return { success: true, message: 'Amount underpayment — transaction rejected', processed: false };
            }
            try {
                const depositResult = await (0, utils_2.processFiatDeposit)({
                    userId: transaction.userId,
                    currency,
                    amount: transaction.amount,
                    fee: (_b = transaction.fee) !== null && _b !== void 0 ? _b : 0,
                    referenceId: paymentObject.merchantRefNum,
                    method: 'PAYSAFE',
                    description: `Paysafe deposit - ${transaction.amount} ${currency}`,
                    metadata: {
                        eventId: webhookData.eventId,
                        eventType: webhookData.eventType,
                        source: 'webhook',
                    },
                    idempotencyKey: `paysafe_verify_${transaction.id}`,
                });
                newBalance = depositResult.newBalance;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info("PAYSAFE", `Transaction ${transaction.id} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            console_1.logger.success("PAYSAFE", `Credit processed: ${transaction.amount} ${currency} for user ${transaction.userId}`);
        }
        await transaction.update({
            status: currentStatus,
            metadata: JSON.stringify({
                ...existingMetadata,
                webhookEventId: webhookData.eventId,
                webhookEventType: webhookData.eventType,
                webhookEventTime: webhookData.eventTime,
                gatewayStatus: paymentObject.status,
                lastWebhookUpdate: new Date().toISOString(),
                gatewayResponse: 'gatewayResponse' in paymentObject ? paymentObject.gatewayResponse : undefined,
                paymentId: 'id' in paymentObject ? paymentObject.id : undefined,
                source: alreadyCredited ? existingMetadata.source : (shouldUpdateWallet ? 'webhook' : existingMetadata.source),
            }),
        });
        if (shouldUpdateWallet && !alreadyCredited && transaction.user && typeof newBalance === 'number' && 'currencyCode' in paymentObject) {
            try {
                await (0, emails_1.sendFiatTransactionEmail)(transaction.user, transaction, paymentObject.currencyCode, newBalance);
                console_1.logger.success("PAYSAFE", `Confirmation email sent for transaction ${transaction.id}`);
            }
            catch (emailError) {
                console_1.logger.error("PAYSAFE", "Failed to send confirmation email", emailError);
            }
        }
        console_1.logger.success("PAYSAFE", `Webhook processed: ${webhookData.eventType} for ${transaction.id}`);
        return {
            success: true,
            message: 'Webhook processed successfully',
            processed: true,
            transaction_id: transaction.id,
            status: currentStatus,
            event_type: webhookData.eventType,
        };
    }
    catch (error) {
        console_1.logger.error("PAYSAFE", "Webhook processing error", error);
        if (error instanceof utils_1.PaysafeError) {
            throw (0, error_1.createError)({
                statusCode: error.status,
                message: `Paysafe Webhook Error: ${error.message}`,
            });
        }
        if (error.statusCode === 400 || error.statusCode === 404) {
            return {
                success: false,
                message: error.message,
                processed: false,
            };
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || 'Failed to process Paysafe webhook',
        });
    }
};
