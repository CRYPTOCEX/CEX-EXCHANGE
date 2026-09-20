"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const reversal_1 = require("../reversal");
const credit_contract_1 = require("../credit-contract");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: 'Handles Mollie webhook notifications',
    description: 'Processes payment status updates from Mollie backend notifications',
    operationId: 'mollieWebhook',
    tags: ['Finance', 'Deposit', 'Mollie', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "Mollie webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/x-www-form-urlencoded': {
                schema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Mollie payment ID',
                        },
                    },
                    required: ['id'],
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
        400: { description: 'Bad request' },
        404: { description: 'Payment not found' },
        500: { description: 'Internal server error' },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    var _f;
    const { body } = data;
    if (!body.id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Payment ID is required',
        });
    }
    (0, utils_1.validateMollieConfig)();
    try {
        const molliePaymentId = body.id;
        const molliePayment = await (0, utils_1.makeApiRequest)(`/payments/${molliePaymentId}`);
        if (!molliePayment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Payment not found at Mollie',
            });
        }
        const targetTransaction = await db_1.models.transaction.findOne({
            where: {
                type: 'DEPOSIT',
                [sequelize_1.Op.or]: [
                    { referenceId: molliePaymentId },
                    { metadata: { [sequelize_1.Op.like]: `%"molliePaymentId":"${molliePaymentId}"%` } },
                ],
            },
        });
        if (!targetTransaction) {
            console_1.logger.warn("MOLLIE", `No transaction found for Mollie payment ID: ${molliePaymentId}`);
            return 'OK';
        }
        const transactionMetadata = typeof targetTransaction.metadata === 'string'
            ? JSON.parse(targetTransaction.metadata || '{}')
            : (targetTransaction.metadata || {});
        const currentMollieStatus = transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.mollieStatus;
        if (currentMollieStatus === molliePayment.status && targetTransaction.status === 'COMPLETED') {
            return 'OK';
        }
        const newStatus = (0, utils_1.mapMollieStatus)(molliePayment.status);
        const user = await db_1.models.user.findByPk(targetTransaction.userId);
        if (!user) {
            console_1.logger.error("MOLLIE", `User not found for transaction: ${targetTransaction.id}`);
            return 'OK';
        }
        if (molliePayment.status === 'paid' && targetTransaction.status !== 'COMPLETED') {
            const currency = (transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.currency) || 'EUR';
            if (!((_a = molliePayment.amount) === null || _a === void 0 ? void 0 : _a.value) || !((_b = molliePayment.amount) === null || _b === void 0 ? void 0 : _b.currency)) {
                console_1.logger.error("MOLLIE", `Payment ${molliePaymentId} has no amount`);
                return 'OK';
            }
            if (molliePayment.amount.currency.toUpperCase() !== currency.toUpperCase()) {
                console_1.logger.error("MOLLIE", `Currency mismatch for ${molliePaymentId}: txn=${currency}, mollie=${molliePayment.amount.currency}`);
                await db_1.models.transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...transactionMetadata,
                        mollieStatus: molliePayment.status,
                        rejectionReason: 'currency_mismatch',
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                }, { where: { id: targetTransaction.id } });
                return 'OK';
            }
            const mollieMinor = Math.round(parseFloat(molliePayment.amount.value) * 100);
            const expectedMinor = Math.round(targetTransaction.amount * 100);
            if (mollieMinor + 1 < expectedMinor) {
                console_1.logger.error("MOLLIE", `Amount mismatch for ${molliePaymentId}: expected>=${expectedMinor}, got ${mollieMinor}`);
                await db_1.models.transaction.update({
                    status: 'REJECTED',
                    metadata: JSON.stringify({
                        ...transactionMetadata,
                        mollieStatus: molliePayment.status,
                        rejectionReason: 'amount_mismatch',
                        webhookProcessedAt: new Date().toISOString(),
                    }),
                }, { where: { id: targetTransaction.id } });
                return 'OK';
            }
            let mollieProcessingFee = 0;
            if (molliePayment.settlementAmount && molliePayment.amount) {
                const originalMinor = (0, utils_1.parseMollieAmount)(molliePayment.amount.value, molliePayment.amount.currency);
                const settlementMinor = (0, utils_1.parseMollieAmount)(molliePayment.settlementAmount.value, molliePayment.settlementAmount.currency);
                mollieProcessingFee = Math.max(0, (originalMinor - settlementMinor) / 100);
            }
            let newBalance;
            let alreadyCredited = false;
            try {
                const depositResult = await (0, utils_2.processFiatDeposit)({
                    userId: user.id,
                    currency,
                    amount: targetTransaction.amount,
                    fee: (_f = targetTransaction.fee) !== null && _f !== void 0 ? _f : 0,
                    referenceId: (0, credit_contract_1.creditReferenceId)(targetTransaction, molliePayment.id),
                    method: 'MOLLIE',
                    description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
                    metadata: {
                        molliePaymentId: molliePayment.id,
                        paymentMethod: molliePayment.method || 'unknown',
                        mollieProcessingFee,
                        source: 'webhook',
                    },
                    idempotencyKey: `mollie_deposit_${molliePayment.id}`,
                });
                newBalance = depositResult.newBalance;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info("MOLLIE", `Deposit for ${molliePaymentId} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            await db_1.models.transaction.update({
                status: 'COMPLETED',
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    paymentMethod: molliePayment.method || 'unknown',
                    paidAt: molliePayment.createdAt,
                    settlementAmount: molliePayment.settlementAmount,
                    mollieProcessingFee,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, { where: { id: targetTransaction.id } });
            if (!alreadyCredited && typeof newBalance === 'number') {
                try {
                    await (0, emails_1.sendFiatTransactionEmail)(user, {
                        id: targetTransaction.id,
                        type: 'DEPOSIT',
                        amount: targetTransaction.amount,
                        status: 'COMPLETED',
                        description: `Mollie deposit - ${targetTransaction.amount} ${currency}`,
                    }, currency, newBalance);
                }
                catch (emailError) {
                    console_1.logger.error('MOLLIE', 'Failed to send confirmation email', emailError);
                }
            }
        }
        else if (['refunded', 'charged_back'].includes(molliePayment.status)) {
            const result = await (0, reversal_1.reverseDepositByReference)({
                provider: "mollie",
                kind: molliePayment.status === 'charged_back' ? "chargeback" : "refund",
                depositReference: targetTransaction.referenceId,
                eventReference: molliePayment.id,
                reportedAmount: (_c = molliePayment.amountRefunded) === null || _c === void 0 ? void 0 : _c.value,
                metadata: { mollieStatus: molliePayment.status, molliePaymentId: molliePayment.id },
            });
            if (result.outcome === "no_wallet") {
                console_1.logger.error("MOLLIE", `[CRITICAL] ${molliePayment.status} on ${molliePayment.id} could not be applied: no wallet. Manual reversal required.`);
            }
        }
        else if (['failed', 'canceled', 'expired'].includes(molliePayment.status)) {
            await db_1.models.transaction.update({
                status: newStatus,
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    failureReason: ((_d = molliePayment.details) === null || _d === void 0 ? void 0 : _d.failureReason) || 'Payment failed',
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, {
                where: { id: targetTransaction.id },
            });
            try {
                const currency = (transactionMetadata === null || transactionMetadata === void 0 ? void 0 : transactionMetadata.currency) || 'EUR';
                await (0, emails_1.sendFiatTransactionEmail)(user, {
                    id: targetTransaction.id,
                    type: 'DEPOSIT',
                    amount: targetTransaction.amount,
                    status: newStatus,
                    description: `Mollie deposit failed - ${targetTransaction.amount} ${currency}`,
                }, currency, 0);
            }
            catch (emailError) {
                console_1.logger.error('MOLLIE', 'Failed to send failure notification email', emailError);
            }
        }
        else {
            await db_1.models.transaction.update({
                metadata: JSON.stringify({
                    ...transactionMetadata,
                    molliePaymentId: molliePayment.id,
                    mollieStatus: molliePayment.status,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, {
                where: { id: targetTransaction.id },
            });
        }
        console_1.logger.success("MOLLIE", `Webhook processed: Payment ${molliePaymentId} status ${molliePayment.status}`);
        return 'OK';
    }
    catch (error) {
        console_1.logger.error('MOLLIE', 'Webhook processing error', error);
        if ((_e = error === null || error === void 0 ? void 0 : error.message) === null || _e === void 0 ? void 0 : _e.includes('API key')) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: 'Configuration error',
            });
        }
        return 'OK';
    }
};
