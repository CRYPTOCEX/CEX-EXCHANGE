"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verify eWAY payment status",
    description: "Verify an eWAY payment status using access code and update transaction accordingly",
    operationId: "verifyEwayPayment",
    tags: ["Finance", "Verification"],
    logModule: "EWAY_DEPOSIT",
    logTitle: "Verify eWAY payment",
    requestBody: {
        description: "Payment verification request",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        access_code: {
                            type: "string",
                            description: "eWAY access code from redirect",
                        },
                        transaction_id: {
                            type: "string",
                            description: "Internal transaction ID",
                        },
                        reference: {
                            type: "string",
                            description: "Payment reference ID",
                        },
                    },
                    required: ["access_code"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Payment verification result",
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
                                    status: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    gateway_transaction_id: { type: "string" },
                                    authorisation_code: { type: "string" },
                                    response_code: { type: "string" },
                                    response_message: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request parameters",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction"),
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    }
    try {
        const { access_code, transaction_id, reference } = body;
        if (!access_code) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Access code is required" });
        }
        let transaction;
        if (transaction_id) {
            transaction = await db_1.models.transaction.findOne({
                where: {
                    id: transaction_id,
                    userId: user.id,
                    status: "PENDING"
                },
                include: [{ model: db_1.models.wallet, as: "wallet" }],
            });
        }
        else if (reference) {
            transaction = await db_1.models.transaction.findOne({
                where: {
                    referenceId: reference,
                    userId: user.id,
                    status: "PENDING"
                },
                include: [{ model: db_1.models.wallet, as: "wallet" }],
            });
        }
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found or already processed" });
        }
        const ewayResponse = await (0, utils_1.makeEwayRequest)(`/GetAccessCodeResult/${access_code}`, "GET");
        if (ewayResponse.Errors) {
            console_1.logger.error("EWAY", "Verification error", ewayResponse.Errors);
            await transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...transaction.metadata,
                    eway_errors: ewayResponse.Errors,
                    eway_response_code: ewayResponse.ResponseCode,
                    eway_response_message: ewayResponse.ResponseMessage,
                    verified_at: new Date().toISOString(),
                }),
            });
            return {
                success: false,
                data: {
                    transaction_id: transaction.id,
                    status: "FAILED",
                    amount: transaction.amount,
                    currency: transaction.metadata.currency,
                    response_code: ewayResponse.ResponseCode,
                    response_message: ewayResponse.ResponseMessage,
                    errors: ewayResponse.Errors,
                },
            };
        }
        const isSuccessful = ewayResponse.TransactionStatus === true;
        const newStatus = isSuccessful ? "COMPLETED" : "FAILED";
        if (isSuccessful) {
            const wallet = transaction.wallet;
            const currency = ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.currency) || 'AUD';
            const feeAmount = transaction.fee || 0;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: transaction.amount,
                fee: feeAmount,
                referenceId: ((_b = ewayResponse.TransactionID) === null || _b === void 0 ? void 0 : _b.toString()) || access_code,
                method: "EWAY",
                description: `eWAY deposit - ${transaction.amount} ${currency}`,
                metadata: {
                    eway_transaction_id: ewayResponse.TransactionID,
                    eway_authorisation_code: ewayResponse.AuthorisationCode,
                },
                idempotencyKey: `eway_deposit_${ewayResponse.TransactionID || access_code}`,
                ctx,
            });
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(user, transaction, currency, depositResult.newBalance);
            }
            catch (emailError) {
                console_1.logger.error("EWAY", "Failed to send deposit confirmation email", emailError);
            }
        }
        await transaction.update({
            status: newStatus,
            metadata: JSON.stringify({
                ...transaction.metadata,
                eway_transaction_id: ewayResponse.TransactionID,
                eway_authorisation_code: ewayResponse.AuthorisationCode,
                eway_response_code: ewayResponse.ResponseCode,
                eway_response_message: ewayResponse.ResponseMessage,
                eway_transaction_type: ewayResponse.TransactionType,
                eway_beagle_score: ewayResponse.BeagleScore,
                verified_at: new Date().toISOString(),
            }),
        });
        return {
            success: true,
            data: {
                transaction_id: transaction.id,
                status: newStatus,
                amount: transaction.amount,
                currency: transaction.metadata.currency,
                gateway_transaction_id: (_c = ewayResponse.TransactionID) === null || _c === void 0 ? void 0 : _c.toString(),
                authorisation_code: ewayResponse.AuthorisationCode,
                response_code: ewayResponse.ResponseCode,
                response_message: ewayResponse.ResponseMessage,
                beagle_score: ewayResponse.BeagleScore,
            },
        };
    }
    catch (error) {
        console_1.logger.error("EWAY", "Verification error", error);
        if (error instanceof utils_1.EwayError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `eWAY Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message || "Failed to verify eWAY payment" });
    }
};
