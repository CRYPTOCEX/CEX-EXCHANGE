"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: 'Handles PayU webhook notifications',
    description: 'Processes real-time payment notifications from PayU with hash verification and status updates',
    operationId: 'payuWebhook',
    tags: ['Finance', 'Deposit', 'PayU', 'Webhook'],
    logModule: "WEBHOOK",
    logTitle: "PayU webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            'application/x-www-form-urlencoded': {
                schema: {
                    type: 'object',
                    properties: {
                        mihpayid: { type: 'string' },
                        mode: { type: 'string' },
                        status: { type: 'string' },
                        unmappedstatus: { type: 'string' },
                        key: { type: 'string' },
                        txnid: { type: 'string' },
                        amount: { type: 'string' },
                        addedon: { type: 'string' },
                        productinfo: { type: 'string' },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        address1: { type: 'string' },
                        address2: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        country: { type: 'string' },
                        zipcode: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        udf1: { type: 'string' },
                        udf2: { type: 'string' },
                        udf3: { type: 'string' },
                        udf4: { type: 'string' },
                        udf5: { type: 'string' },
                        udf6: { type: 'string' },
                        udf7: { type: 'string' },
                        udf8: { type: 'string' },
                        udf9: { type: 'string' },
                        udf10: { type: 'string' },
                        hash: { type: 'string' },
                        field1: { type: 'string' },
                        field2: { type: 'string' },
                        field3: { type: 'string' },
                        field4: { type: 'string' },
                        field5: { type: 'string' },
                        field6: { type: 'string' },
                        field7: { type: 'string' },
                        field8: { type: 'string' },
                        field9: { type: 'string' },
                        payment_source: { type: 'string' },
                        PG_TYPE: { type: 'string' },
                        bank_ref_num: { type: 'string' },
                        bankcode: { type: 'string' },
                        error: { type: 'string' },
                        error_Message: { type: 'string' },
                        name_on_card: { type: 'string' },
                        cardnum: { type: 'string' },
                        cardhash: { type: 'string' },
                        amount_split: { type: 'string' },
                        payuMoneyId: { type: 'string' },
                        discount: { type: 'string' },
                        net_amount_debit: { type: 'string' },
                        card_token: { type: 'string' },
                    },
                    required: ['txnid', 'key', 'status', 'hash'],
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
            description: 'Unauthorized - Invalid webhook signature',
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
        (0, utils_1.validatePayUConfig)();
        if (!webhookData.txnid || !webhookData.key || !webhookData.status || !webhookData.hash) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Missing required webhook fields',
            });
        }
        if (webhookData.key !== utils_1.PAYU_CONFIG.MERCHANT_KEY) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid merchant key',
            });
        }
        const verificationParams = {
            key: webhookData.key,
            txnid: webhookData.txnid,
            amount: webhookData.amount,
            productinfo: webhookData.productinfo,
            firstname: webhookData.firstname,
            email: webhookData.email,
            status: webhookData.status,
            udf1: webhookData.udf1 || '',
            udf2: webhookData.udf2 || '',
            udf3: webhookData.udf3 || '',
            udf4: webhookData.udf4 || '',
            udf5: webhookData.udf5 || '',
        };
        const isValidHash = (0, utils_1.verifyPayUHash)(verificationParams, webhookData.hash, utils_1.PAYU_CONFIG.MERCHANT_SALT);
        if (!isValidHash) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: 'Invalid webhook signature',
            });
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: webhookData.txnid,
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
        if (metadata.gateway !== 'payu') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: 'Invalid gateway for this transaction',
            });
        }
        const newStatus = (0, utils_1.mapPayUStatus)(webhookData.status);
        const txnAmount = (0, utils_1.parsePayUAmount)(webhookData.amount || '0', metadata.currency || 'INR');
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
                referenceId: webhookData.mihpayid || transaction.referenceId,
                metadata: JSON.stringify({
                    ...metadata,
                    mihpayid: webhookData.mihpayid,
                    bankRefNum: webhookData.bank_ref_num,
                    paymentMode: webhookData.mode,
                    bankCode: webhookData.bankcode,
                    paymentSource: webhookData.payment_source,
                    pgType: webhookData.PG_TYPE,
                    nameOnCard: webhookData.name_on_card,
                    cardNum: webhookData.cardnum,
                    cardHash: webhookData.cardhash,
                    payuMoneyId: webhookData.payuMoneyId,
                    discount: webhookData.discount,
                    netAmountDebit: webhookData.net_amount_debit,
                    cardToken: webhookData.card_token,
                    error: webhookData.error,
                    errorMessage: webhookData.error_Message,
                    addedOn: webhookData.addedon,
                    webhookProcessedAt: new Date().toISOString(),
                }),
            }, { transaction: dbTransaction });
            if (newStatus === 'COMPLETED') {
                const currency = metadata.currency || 'USD';
                let wallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency,
                        type: 'FIAT',
                    },
                    transaction: dbTransaction,
                });
                if (!wallet) {
                    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, 'FIAT', currency, dbTransaction);
                    wallet = walletResult.wallet;
                }
                if (!wallet) {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: 'Failed to get or create wallet',
                    });
                }
                const idempotencyKey = `payu_webhook_${webhookData.txnid}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: 'FIAT',
                    currency,
                    amount: txnAmount,
                    operationType: 'DEPOSIT',
                    referenceId: webhookData.txnid,
                    description: `PayU deposit - ${txnAmount} ${currency}`,
                    metadata: {
                        method: 'PAYU',
                        mihpayid: webhookData.mihpayid,
                        paymentMode: webhookData.mode,
                    },
                    transaction: dbTransaction,
                });
                const newBalance = parseFloat(String(wallet.balance)) + txnAmount;
                await (0, emails_1.sendFiatTransactionEmail)(user, transaction, currency, newBalance);
            }
            await dbTransaction.commit();
            return {
                success: true,
                message: 'Webhook processed successfully',
                data: {
                    transaction_id: webhookData.txnid,
                    status: newStatus,
                    mihpayid: webhookData.mihpayid,
                    amount: txnAmount,
                    currency: metadata.currency || 'INR',
                    payment_mode: webhookData.mode,
                    processed_at: new Date().toISOString(),
                },
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : 'Webhook processing failed',
        });
    }
};
