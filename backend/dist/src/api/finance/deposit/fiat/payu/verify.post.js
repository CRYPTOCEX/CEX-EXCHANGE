"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const utils_1 = require("./utils");
exports.metadata = {
    summary: 'Verifies a PayU payment',
    description: 'Handles return URL verification after payment completion and updates transaction status',
    operationId: 'verifyPayUPayment',
    tags: ['Finance', 'Deposit', 'PayU'],
    requiresAuth: true,
    logModule: "PAYU_DEPOSIT",
    logTitle: "Verify PayU payment",
    requestBody: {
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        txnid: {
                            type: 'string',
                            description: 'PayU transaction ID',
                        },
                        mihpayid: {
                            type: 'string',
                            description: 'PayU internal payment ID',
                        },
                        status: {
                            type: 'string',
                            description: 'Transaction status from PayU',
                        },
                        hash: {
                            type: 'string',
                            description: 'Hash for verification',
                        },
                        amount: {
                            type: 'string',
                            description: 'Transaction amount',
                        },
                        productinfo: {
                            type: 'string',
                            description: 'Product information',
                        },
                        firstname: {
                            type: 'string',
                            description: 'Customer first name',
                        },
                        email: {
                            type: 'string',
                            description: 'Customer email',
                        },
                        udf1: { type: 'string' },
                        udf2: { type: 'string' },
                        udf3: { type: 'string' },
                        udf4: { type: 'string' },
                        udf5: { type: 'string' },
                        mode: {
                            type: 'string',
                            description: 'Payment mode used',
                        },
                        bankcode: {
                            type: 'string',
                            description: 'Bank code',
                        },
                        bank_ref_num: {
                            type: 'string',
                            description: 'Bank reference number',
                        },
                        error: {
                            type: 'string',
                            description: 'Error message if any',
                        },
                        error_Message: {
                            type: 'string',
                            description: 'Detailed error message',
                        },
                    },
                    required: ['txnid'],
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Payment verified successfully',
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
                                    mihpayid: { type: 'string' },
                                    status: { type: 'string' },
                                    amount: { type: 'number' },
                                    currency: { type: 'string' },
                                    gateway: { type: 'string' },
                                    payment_mode: { type: 'string' },
                                    bank_name: { type: 'string' },
                                    bank_ref_num: { type: 'string' },
                                    verified_at: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: 'Bad request - Invalid verification data',
        },
        401: {
            description: 'Unauthorized - User not authenticated',
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
    const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5, mode, bankcode, bank_ref_num, error, error_Message } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: 'User not authenticated',
        });
    }
    if (!txnid) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: 'Transaction ID is required',
        });
    }
    try {
        (0, utils_1.validatePayUConfig)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: txnid,
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
        if (existingMetadata.gateway !== 'payu') {
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
                    mihpayid: mihpayid || existingMetadata.mihpayid || '',
                    status: 'COMPLETED',
                    amount: transaction.amount,
                    currency: existingMetadata.currency || 'INR',
                    gateway: 'payu',
                    payment_mode: existingMetadata.paymentMode || mode || '',
                    bank_name: existingMetadata.bankName || '',
                    bank_ref_num: existingMetadata.bankRefNum || bank_ref_num || '',
                    verified_at: transaction.updatedAt,
                },
            };
        }
        if (hash && status && amount && productinfo && firstname && email) {
            const verificationParams = {
                key: utils_1.PAYU_CONFIG.MERCHANT_KEY,
                txnid: txnid,
                amount: amount,
                productinfo: productinfo,
                firstname: firstname,
                email: email,
                status: status,
                udf1: udf1 || '',
                udf2: udf2 || '',
                udf3: udf3 || '',
                udf4: udf4 || '',
                udf5: udf5 || '',
            };
            const isValidHash = (0, utils_1.verifyPayUHash)(verificationParams, hash, utils_1.PAYU_CONFIG.MERCHANT_SALT);
            if (!isValidHash) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: 'Invalid hash verification',
                });
            }
        }
        const verifyRequest = {
            key: utils_1.PAYU_CONFIG.MERCHANT_KEY,
            command: 'verify_payment',
            var1: txnid,
            hash: '',
        };
        const verifyHashString = `${utils_1.PAYU_CONFIG.MERCHANT_KEY}|verify_payment|${txnid}|${utils_1.PAYU_CONFIG.MERCHANT_SALT}`;
        verifyRequest.hash = require('crypto').createHash('sha512').update(verifyHashString).digest('hex');
        const verifyResponse = await (0, utils_1.makePayURequest)('/merchant/postservice.php?form=2', {
            method: 'POST',
            body: verifyRequest,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        if (verifyResponse.status !== 1) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: verifyResponse.message || 'Payment verification failed',
            });
        }
        const transactionDetails = verifyResponse.transaction_details[txnid];
        if (!transactionDetails) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: 'Transaction details not found in PayU response',
            });
        }
        const payuStatus = transactionDetails.status;
        const mappedStatus = (0, utils_1.mapPayUStatus)(payuStatus);
        const txnAmount = (0, utils_1.parsePayUAmount)(transactionDetails.amt || amount || '0', existingMetadata.currency || 'INR');
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await transaction.update({
                status: mappedStatus,
                referenceId: mihpayid || transactionDetails.mihpayid || transaction.referenceId,
                metadata: JSON.stringify({
                    ...existingMetadata,
                    mihpayid: mihpayid || transactionDetails.mihpayid,
                    bankRefNum: bank_ref_num || transactionDetails.bank_ref_num,
                    paymentMode: mode || transactionDetails.mode,
                    bankCode: bankcode || transactionDetails.bankcode,
                    bankName: transactionDetails.bank_name,
                    cardType: transactionDetails.card_type,
                    nameOnCard: transactionDetails.name_on_card,
                    cardNum: transactionDetails.cardnum,
                    paymentSource: transactionDetails.payment_source,
                    error: error || transactionDetails.error,
                    errorMessage: error_Message || transactionDetails.error_Message,
                    payuVerifyResponse: transactionDetails,
                    verifiedAt: new Date().toISOString(),
                }),
            }, { transaction: dbTransaction });
            if (mappedStatus === 'COMPLETED') {
                const currency = existingMetadata.currency || 'USD';
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency, dbTransaction);
                const wallet = walletResult.wallet;
                const idempotencyKey = `payu_verify_${transaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount: txnAmount,
                    operationType: "DEPOSIT",
                    referenceId: transaction.id,
                    description: `PayU deposit of ${txnAmount} ${currency}`,
                    metadata: {
                        method: "PAYU",
                        mihpayid: mihpayid || transactionDetails.mihpayid,
                        mode: mode || transactionDetails.mode,
                    },
                    transaction: dbTransaction,
                });
                const newBalance = parseFloat(String(wallet.balance)) + txnAmount;
                await (0, emails_1.sendFiatTransactionEmail)(user, transaction, currency, newBalance);
            }
            await dbTransaction.commit();
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    mihpayid: mihpayid || transactionDetails.mihpayid || '',
                    status: mappedStatus,
                    amount: transaction.amount,
                    currency: existingMetadata.currency || 'INR',
                    gateway: 'payu',
                    payment_mode: mode || transactionDetails.mode || '',
                    bank_name: transactionDetails.bank_name || '',
                    bank_ref_num: bank_ref_num || transactionDetails.bank_ref_num || '',
                    card_type: transactionDetails.card_type || '',
                    name_on_card: transactionDetails.name_on_card || '',
                    payment_source: transactionDetails.payment_source || '',
                    error: error || transactionDetails.error || '',
                    error_message: error_Message || transactionDetails.error_Message || '',
                    verified_at: new Date().toISOString(),
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
            message: error instanceof Error ? error.message : 'Payment verification failed',
        });
    }
};
