"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/utils");
const utils_2 = require("./utils");
const reversal_1 = require("../reversal");
exports.metadata = {
    summary: 'Handles Paystack webhook notifications',
    description: 'Processes real-time payment status updates from Paystack webhooks',
    operationId: 'handlePaystackWebhook',
    tags: ['Finance', 'Deposit', 'Paystack', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Paystack webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        event: {
                            type: 'string',
                            description: 'Webhook event type',
                            example: 'charge.success',
                        },
                        data: {
                            type: 'object',
                            description: 'Transaction data from Paystack',
                        },
                    },
                    required: ['event', 'data'],
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
    var _a;
    var _b, _c, _d, _e, _f;
    const { body, headers, rawBodyString } = data;
    const signature = headers['x-paystack-signature'];
    try {
        const rawBody = typeof rawBodyString === 'string' && rawBodyString.length
            ? rawBodyString
            : JSON.stringify(body);
        if (!signature || !(0, utils_2.validateWebhookSignature)(rawBody, signature)) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Invalid webhook signature',
            });
        }
        const webhookData = body;
        const { event, data: transactionData } = webhookData;
        console_1.logger.info("PAYSTACK", `Received webhook: ${event} - ref: ${transactionData.reference}, status: ${transactionData.status}`);
        if (event === utils_2.PAYSTACK_WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATE ||
            event === 'refund.processed' ||
            event === 'refund.failed') {
            if (event === 'refund.failed') {
                console_1.logger.info("PAYSTACK", `Refund failed for ${(_b = transactionData === null || transactionData === void 0 ? void 0 : transactionData.transaction_reference) !== null && _b !== void 0 ? _b : transactionData === null || transactionData === void 0 ? void 0 : transactionData.reference}; nothing reversed`);
                return { success: true, message: 'Refund failure acknowledged' };
            }
            const reference = (_d = (_c = transactionData === null || transactionData === void 0 ? void 0 : transactionData.transaction_reference) !== null && _c !== void 0 ? _c : transactionData === null || transactionData === void 0 ? void 0 : transactionData.reference) !== null && _d !== void 0 ? _d : (_a = transactionData === null || transactionData === void 0 ? void 0 : transactionData.transaction) === null || _a === void 0 ? void 0 : _a.reference;
            const result = await (0, reversal_1.reverseDepositByReference)({
                provider: "paystack",
                kind: event === utils_2.PAYSTACK_WEBHOOK_EVENTS.CHARGE_DISPUTE_CREATE ? "chargeback" : "refund",
                depositReference: reference,
                eventReference: String((_f = (_e = transactionData === null || transactionData === void 0 ? void 0 : transactionData.id) !== null && _e !== void 0 ? _e : reference) !== null && _f !== void 0 ? _f : ''),
                reportedAmount: (transactionData === null || transactionData === void 0 ? void 0 : transactionData.amount) !== undefined
                    ? Number(transactionData.amount) / 100
                    : undefined,
                metadata: { event, paystackId: transactionData === null || transactionData === void 0 ? void 0 : transactionData.id },
                detail: transactionData === null || transactionData === void 0 ? void 0 : transactionData.reason,
            });
            if (result.outcome === "no_wallet") {
                console_1.logger.error("PAYSTACK", `[CRITICAL] ${event} on ${reference} could not be applied: no wallet. Manual reversal required.`);
            }
            return { success: true, message: `Reversal handled: ${result.outcome}` };
        }
        if (event !== utils_2.PAYSTACK_WEBHOOK_EVENTS.CHARGE_SUCCESS) {
            console_1.logger.debug("PAYSTACK", `Ignoring webhook event: ${event}`);
            return {
                success: true,
                message: `Event ${event} acknowledged but not processed`,
            };
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: transactionData.reference,
                type: 'DEPOSIT',
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
            console_1.logger.warn("PAYSTACK", `Transaction not found for reference: ${transactionData.reference}`);
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
        if (['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(transaction.status)) {
            console_1.logger.debug("PAYSTACK", `Transaction ${transaction.id} already in final state: ${transaction.status}`);
            return {
                success: true,
                message: 'Transaction already processed',
            };
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        const transactionCurrency = existingMetadata.currency || transactionData.currency || 'USD';
        const newStatus = (0, utils_2.mapPaystackStatus)(transactionData.status);
        const actualAmount = (0, utils_2.parsePaystackAmount)(transactionData.amount, transactionData.currency);
        const gatewayFees = (0, utils_2.parsePaystackAmount)(transactionData.fees || 0, transactionData.currency);
        if (actualAmount < transaction.amount - 0.01) {
            console_1.logger.error("PAYSTACK", `Under-payment for transaction ${transaction.id}: expected ${transaction.amount}, got ${actualAmount}`);
            await transaction.update({
                status: 'REJECTED',
                metadata: JSON.stringify({
                    ...existingMetadata,
                    paystack_status: transactionData.status,
                    rejectionReason: 'amount_underpayment',
                    actualAmount,
                    webhook_processed_at: new Date().toISOString(),
                }),
            });
            return { success: true, message: 'Amount underpayment — transaction rejected' };
        }
        if (transactionData.currency !== transactionCurrency) {
            console_1.logger.error("PAYSTACK", `Currency mismatch for transaction ${transaction.id}: expected ${transactionCurrency}, got ${transactionData.currency}`);
            await transaction.update({
                status: 'REJECTED',
                metadata: JSON.stringify({
                    ...existingMetadata,
                    rejectionReason: 'currency_mismatch',
                    gatewayCurrency: transactionData.currency,
                    webhook_processed_at: new Date().toISOString(),
                }),
            });
            return { success: true, message: 'Currency mismatch — transaction rejected' };
        }
        if (newStatus === 'COMPLETED') {
            let newBalance;
            let alreadyCredited = false;
            try {
                const depositResult = await (0, utils_1.processFiatDeposit)({
                    userId: user.id,
                    currency: transactionCurrency,
                    amount: transaction.amount,
                    fee: gatewayFees,
                    referenceId: `PSD-${transactionData.reference}`,
                    method: 'PAYSTACK',
                    description: `Paystack deposit of ${transaction.amount} ${transactionCurrency}`,
                    metadata: {
                        paystack_transaction_id: transactionData.id,
                        channel: transactionData.channel,
                        source: 'webhook',
                    },
                    idempotencyKey: `paystack_deposit_${transactionData.reference}`,
                });
                newBalance = depositResult.newBalance;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info("PAYSTACK", `Deposit ${transactionData.reference} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            await transaction.update({
                status: 'COMPLETED',
                referenceId: transactionData.reference,
                fee: gatewayFees,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    paystack_transaction_id: transactionData.id,
                    paystack_status: transactionData.status,
                    gateway_response: transactionData.gateway_response,
                    paid_at: transactionData.paid_at,
                    channel: transactionData.channel,
                    authorization: transactionData.authorization,
                    customer: transactionData.customer,
                    fees_breakdown: transactionData.fees_breakdown,
                    webhook_processed_at: new Date().toISOString(),
                }),
            });
            console_1.logger.info("PAYSTACK", `Transaction ${transaction.id} updated to status: COMPLETED`);
            if (!alreadyCredited && typeof newBalance === 'number') {
                try {
                    await (0, emails_1.sendFiatTransactionEmail)(user, transaction, transactionCurrency, newBalance);
                    console_1.logger.success("PAYSTACK", `Confirmation email sent for transaction ${transaction.id}`);
                }
                catch (emailError) {
                    console_1.logger.error("PAYSTACK", "Failed to send confirmation email", emailError);
                }
            }
        }
        else {
            await transaction.update({
                status: newStatus,
                referenceId: transactionData.reference,
                fee: gatewayFees,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    paystack_transaction_id: transactionData.id,
                    paystack_status: transactionData.status,
                    gateway_response: transactionData.gateway_response,
                    webhook_processed_at: new Date().toISOString(),
                }),
            });
            console_1.logger.info("PAYSTACK", `Transaction ${transaction.id} updated to status: ${newStatus}`);
        }
        return {
            success: true,
            message: 'Webhook processed successfully',
        };
    }
    catch (error) {
        console_1.logger.error("PAYSTACK", "Error processing webhook", error);
        if (error instanceof utils_2.PaystackError) {
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
            message: 'Failed to process webhook',
        });
    }
};
