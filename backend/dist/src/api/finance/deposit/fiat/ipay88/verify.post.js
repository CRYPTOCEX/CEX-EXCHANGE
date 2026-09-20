"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("@b/api/finance/utils");
const credit_contract_1 = require("../credit-contract");
exports.metadata = {
    summary: "Verifies iPay88 payment status",
    description: "Handles iPay88 payment verification from return URL. This endpoint processes the payment response from iPay88 and updates the transaction status accordingly.",
    operationId: "verifyIpay88Payment",
    tags: ["Finance", "Payment"],
    logModule: "IPAY88_DEPOSIT",
    logTitle: "Verify iPay88 payment",
    requestBody: {
        description: "iPay88 payment response data",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        MerchantCode: {
                            type: "string",
                            description: "iPay88 merchant code",
                        },
                        PaymentId: {
                            type: "string",
                            description: "Payment ID",
                        },
                        RefNo: {
                            type: "string",
                            description: "Reference number",
                        },
                        Amount: {
                            type: "string",
                            description: "Payment amount in cents",
                        },
                        Currency: {
                            type: "string",
                            description: "Currency code",
                        },
                        Remark: {
                            type: "string",
                            description: "Payment remark",
                        },
                        TransId: {
                            type: "string",
                            description: "iPay88 transaction ID",
                        },
                        AuthCode: {
                            type: "string",
                            description: "Authorization code",
                        },
                        Status: {
                            type: "string",
                            description: "Payment status",
                        },
                        ErrDesc: {
                            type: "string",
                            description: "Error description",
                        },
                        Signature: {
                            type: "string",
                            description: "iPay88 signature for verification",
                        },
                        CCName: {
                            type: "string",
                            description: "Credit card holder name",
                            nullable: true,
                        },
                        CCNo: {
                            type: "string",
                            description: "Masked credit card number",
                            nullable: true,
                        },
                        S_bankname: {
                            type: "string",
                            description: "Bank name",
                            nullable: true,
                        },
                        S_country: {
                            type: "string",
                            description: "Country code",
                            nullable: true,
                        },
                    },
                    required: [
                        "MerchantCode",
                        "PaymentId",
                        "RefNo",
                        "Amount",
                        "Currency",
                        "TransId",
                        "Status",
                        "Signature"
                    ],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Payment verification completed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    transaction_id: { type: "string" },
                                    reference: { type: "string" },
                                    status: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    gateway: { type: "string" },
                                    ipay88_transaction_id: { type: "string" },
                                    auth_code: { type: "string" },
                                    payment_method: { type: "string" },
                                    signature_valid: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Bad request - Invalid signature or parameters",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                            details: { type: "object" },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Transaction not found"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    }
    try {
        const { MerchantCode, PaymentId, RefNo, Amount, Currency, Remark, TransId, AuthCode, Status, ErrDesc, Signature, CCName, CCNo, S_bankname, S_country } = body;
        if (RefNo && !MerchantCode && !Signature) {
            const transaction = await db_1.models.transaction.findOne({
                where: { referenceId: RefNo, userId: user.id, type: "DEPOSIT" },
            });
            if (!transaction) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Transaction not found for reference: ${RefNo}` });
            }
            const existingMeta = typeof transaction.metadata === 'string'
                ? JSON.parse(transaction.metadata || '{}')
                : (transaction.metadata || {});
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: RefNo,
                    status: transaction.status,
                    amount: transaction.amount,
                    currency: existingMeta.currency || Currency || "",
                    gateway: "ipay88",
                },
            };
        }
        if (!MerchantCode || !RefNo || !Amount || !Currency || !Status || !Signature) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Missing required iPay88 response parameters" });
        }
        const config = (0, utils_1.getIpay88Config)();
        if (MerchantCode !== config.merchantCode) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid merchant code" });
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: RefNo,
                userId: user.id,
                type: "DEPOSIT",
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Transaction not found for reference: ${RefNo}` });
        }
        const isSignatureValid = (0, utils_1.verifyIpay88Signature)(config.merchantKey, MerchantCode, PaymentId, RefNo, Amount, Currency, Status, Signature);
        if (!isSignatureValid) {
            console_1.logger.error("IPAY88", "Signature verification failed", {
                reference: RefNo,
                expected_signature: Signature,
                received_data: { MerchantCode, PaymentId, RefNo, Amount, Currency, Status }
            });
            await transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...(0, utils_2.parseTransactionMetadata)(transaction.metadata),
                    verification_failed: true,
                    signature_valid: false,
                    ipay88_response: body,
                }),
            });
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature - payment verification failed" });
        }
        const actualAmount = (0, utils_1.convertFromIpay88Amount)(Amount);
        if (Math.abs(actualAmount - transaction.amount) > 0.01) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Amount mismatch: expected ${transaction.amount}, received ${actualAmount}` });
        }
        const existingMetadata = typeof transaction.metadata === 'string'
            ? JSON.parse(transaction.metadata || '{}')
            : (transaction.metadata || {});
        const txnCurrency = existingMetadata.currency || Currency;
        const mappedStatus = utils_1.IPAY88_STATUS_MAPPING[Status] || "FAILED";
        const updateData = {
            status: mappedStatus,
            metadata: JSON.stringify({
                ...existingMetadata,
                ipay88_transaction_id: TransId,
                ipay88_auth_code: AuthCode,
                ipay88_status: Status,
                ipay88_error_desc: ErrDesc,
                ipay88_remark: Remark,
                signature_valid: true,
                ipay88_response: body,
            }),
        };
        const parsedMeta = JSON.parse(updateData.metadata);
        if (CCName || CCNo) {
            parsedMeta.payment_method_details = {
                type: "credit_card",
                card_holder: CCName,
                masked_number: CCNo,
            };
        }
        else if (S_bankname) {
            parsedMeta.payment_method_details = {
                type: "online_banking",
                bank_name: S_bankname,
                country: S_country,
            };
        }
        updateData.metadata = JSON.stringify(parsedMeta);
        if (mappedStatus === "COMPLETED") {
            await db_1.sequelize.transaction(async (t) => {
                const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(transaction.userId, "FIAT", txnCurrency, t);
                const wallet = walletResult.wallet;
                const idempotencyKey = `ipay88_deposit_${transaction.referenceId}`;
                try {
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: transaction.userId,
                        walletId: wallet.id,
                        walletType: "FIAT",
                        currency: txnCurrency,
                        amount: transaction.amount,
                        operationType: "DEPOSIT",
                        referenceId: (0, credit_contract_1.creditReferenceId)(transaction, RefNo),
                        description: `iPay88 deposit of ${transaction.amount} ${txnCurrency}`,
                        metadata: {
                            method: "IPAY88",
                            transactionId: TransId,
                            authCode: AuthCode,
                        },
                        transaction: t,
                    });
                }
                catch (err) {
                    if (!(err instanceof wallet_1.DuplicateOperationError))
                        throw err;
                    console_1.logger.info("IPAY88", `Deposit ${RefNo} already credited (idempotency hit)`);
                }
                const finalMeta = JSON.parse(updateData.metadata);
                finalMeta.wallet_updated = true;
                updateData.metadata = JSON.stringify(finalMeta);
                await transaction.update(updateData, { transaction: t });
            });
        }
        else {
            await transaction.update(updateData);
        }
        const responseMessage = utils_1.IPAY88_RESPONSE_CODES[AuthCode] || ErrDesc || "Unknown response";
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                reference: RefNo,
                status: mappedStatus,
                amount: actualAmount,
                currency: Currency,
                gateway: "ipay88",
                ipay88_transaction_id: TransId,
                auth_code: AuthCode,
                response_message: responseMessage,
                payment_method: ((_a = updateData.metadata.payment_method_details) === null || _a === void 0 ? void 0 : _a.type) || "unknown",
                signature_valid: true,
                timestamp: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console_1.logger.error("IPAY88", "Payment verification error", error);
        if (error instanceof utils_1.Ipay88Error) {
            throw (0, error_1.createError)({ statusCode: 400, message: `iPay88 Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message || "Failed to verify iPay88 payment" });
    }
};
