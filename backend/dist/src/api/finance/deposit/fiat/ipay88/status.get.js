"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Checks iPay88 payment status",
    description: "Queries iPay88 for the current status of a payment transaction using the reference number. This endpoint can be used to check payment status when webhook notifications are not received.",
    operationId: "checkIpay88PaymentStatus",
    tags: ["Finance", "Payment"],
    parameters: [
        {
            name: "reference",
            in: "query",
            required: true,
            schema: {
                type: "string",
            },
            description: "Transaction reference number",
        },
        {
            name: "amount",
            in: "query",
            required: true,
            schema: {
                type: "number",
            },
            description: "Transaction amount",
        },
        {
            name: "currency",
            in: "query",
            required: true,
            schema: {
                type: "string",
            },
            description: "Transaction currency",
        },
    ],
    responses: {
        200: {
            description: "Payment status retrieved successfully",
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
                                    response_message: { type: "string" },
                                    payment_method: { type: "string" },
                                    signature_valid: { type: "boolean" },
                                    last_updated: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Bad request - Invalid parameters",
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction not found"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b;
    const { user, query } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    }
    try {
        const { reference, amount, currency } = query;
        if (!reference) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Reference number is required" });
        }
        if (!amount || isNaN(Number(amount))) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Valid amount is required" });
        }
        if (!currency) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Currency is required" });
        }
        const config = (0, utils_1.getIpay88Config)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                userId: user.id,
                metadata: {
                    ipay88_reference: reference,
                },
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Transaction not found for reference: ${reference}` });
        }
        const ipay88Amount = Math.round(Number(amount) * 100).toString();
        const signature = (0, utils_1.generateIpay88Signature)(config.merchantKey, config.merchantCode, reference, ipay88Amount, currency.toUpperCase());
        const requeryRequest = {
            MerchantCode: config.merchantCode,
            RefNo: reference,
            Amount: ipay88Amount,
            Currency: currency.toUpperCase(),
            Signature: signature,
        };
        try {
            const response = await (0, utils_1.makeIpay88Request)("/api/requery.asp", "POST", requeryRequest);
            const responseParams = new URLSearchParams(response);
            const requeryResponse = {
                MerchantCode: responseParams.get("MerchantCode") || "",
                PaymentId: responseParams.get("PaymentId") || "",
                RefNo: responseParams.get("RefNo") || "",
                Amount: responseParams.get("Amount") || "",
                Currency: responseParams.get("Currency") || "",
                Remark: responseParams.get("Remark") || "",
                TransId: responseParams.get("TransId") || "",
                AuthCode: responseParams.get("AuthCode") || "",
                Status: responseParams.get("Status") || "",
                ErrDesc: responseParams.get("ErrDesc") || "",
                Signature: responseParams.get("Signature") || "",
                CCName: responseParams.get("CCName") || undefined,
                CCNo: responseParams.get("CCNo") || undefined,
                S_bankname: responseParams.get("S_bankname") || undefined,
                S_country: responseParams.get("S_country") || undefined,
            };
            const isSignatureValid = (0, utils_1.verifyIpay88Signature)(config.merchantKey, requeryResponse.MerchantCode, requeryResponse.PaymentId, requeryResponse.RefNo, requeryResponse.Amount, requeryResponse.Currency, requeryResponse.Status, requeryResponse.Signature);
            if (!isSignatureValid) {
                console_1.logger.error("IPAY88", "Requery response signature verification failed", {
                    reference: reference,
                    response: requeryResponse,
                });
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature in iPay88 response" });
            }
            const actualAmount = (0, utils_1.convertFromIpay88Amount)(requeryResponse.Amount);
            const mappedStatus = utils_1.IPAY88_STATUS_MAPPING[requeryResponse.Status] || "FAILED";
            if (transaction.status !== mappedStatus) {
                const updateData = {
                    status: mappedStatus,
                    metadata: {
                        ...transaction.metadata,
                        ipay88_transaction_id: requeryResponse.TransId,
                        ipay88_auth_code: requeryResponse.AuthCode,
                        ipay88_status: requeryResponse.Status,
                        ipay88_error_desc: requeryResponse.ErrDesc,
                        ipay88_remark: requeryResponse.Remark,
                        signature_valid: true,
                        ipay88_requery_response: requeryResponse,
                        last_status_check: new Date().toISOString(),
                    },
                };
                if (requeryResponse.CCName || requeryResponse.CCNo) {
                    updateData.metadata.payment_method_details = {
                        type: "credit_card",
                        card_holder: requeryResponse.CCName,
                        masked_number: requeryResponse.CCNo,
                    };
                }
                else if (requeryResponse.S_bankname) {
                    updateData.metadata.payment_method_details = {
                        type: "online_banking",
                        bank_name: requeryResponse.S_bankname,
                        country: requeryResponse.S_country,
                    };
                }
                if (mappedStatus === "COMPLETED" && transaction.status !== "COMPLETED") {
                    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(transaction.userId, "FIAT", transaction.metadata.currency);
                    const wallet = walletResult.wallet;
                    const idempotencyKey = `ipay88_status_${transaction.id}`;
                    await wallet_1.walletService.credit({
                        idempotencyKey,
                        userId: transaction.userId,
                        walletId: wallet.id,
                        walletType: "FIAT",
                        currency: transaction.metadata.currency,
                        amount: transaction.amount,
                        operationType: "DEPOSIT",
                        referenceId: reference,
                        description: `iPay88 deposit of ${transaction.amount} ${transaction.metadata.currency}`,
                        metadata: {
                            method: "IPAY88",
                            transactionId: transaction.id,
                        },
                    });
                    updateData.metadata.wallet_updated = true;
                    updateData.metadata.wallet_updated_at = new Date().toISOString();
                }
                await transaction.update(updateData);
            }
            const responseMessage = utils_1.IPAY88_RESPONSE_CODES[requeryResponse.AuthCode] || requeryResponse.ErrDesc || "Unknown response";
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: requeryResponse.RefNo,
                    status: mappedStatus,
                    amount: actualAmount,
                    currency: requeryResponse.Currency,
                    gateway: "ipay88",
                    ipay88_transaction_id: requeryResponse.TransId,
                    auth_code: requeryResponse.AuthCode,
                    response_message: responseMessage,
                    payment_method: ((_a = transaction.metadata.payment_method_details) === null || _a === void 0 ? void 0 : _a.type) || "unknown",
                    signature_valid: true,
                    last_updated: transaction.updatedAt,
                    requery_timestamp: new Date().toISOString(),
                },
            };
        }
        catch (requeryError) {
            console_1.logger.warn("IPAY88", `Requery failed, returning current transaction status: ${requeryError.message}`);
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: reference,
                    status: transaction.status,
                    amount: transaction.amount,
                    currency: transaction.metadata.currency,
                    gateway: "ipay88",
                    ipay88_transaction_id: transaction.metadata.ipay88_transaction_id || "",
                    auth_code: transaction.metadata.ipay88_auth_code || "",
                    response_message: "Status check from local database (requery unavailable)",
                    payment_method: ((_b = transaction.metadata.payment_method_details) === null || _b === void 0 ? void 0 : _b.type) || "unknown",
                    signature_valid: transaction.metadata.signature_valid || false,
                    last_updated: transaction.updatedAt,
                    requery_error: requeryError.message,
                },
            };
        }
    }
    catch (error) {
        console_1.logger.error("IPAY88", "Status check error", error);
        if (error instanceof utils_1.Ipay88Error) {
            throw (0, error_1.createError)({ statusCode: 400, message: `iPay88 Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message || "Failed to check iPay88 payment status" });
    }
};
