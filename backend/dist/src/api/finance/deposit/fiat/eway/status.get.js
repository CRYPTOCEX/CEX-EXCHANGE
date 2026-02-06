"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get eWAY payment status",
    description: "Retrieve current payment status from eWAY API without updating local database",
    operationId: "getEwayPaymentStatus",
    tags: ["Finance", "Status"],
    parameters: [
        {
            name: "access_code",
            in: "query",
            description: "eWAY access code to check",
            schema: { type: "string" },
        },
        {
            name: "transaction_id",
            in: "query",
            description: "eWAY transaction ID to check",
            schema: { type: "string" },
        },
        {
            name: "reference",
            in: "query",
            description: "Internal reference ID to check",
            schema: { type: "string" },
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
                                    transaction_status: { type: "boolean" },
                                    transaction_type: { type: "string" },
                                    authorisation_code: { type: "string" },
                                    response_code: { type: "string" },
                                    response_message: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    customer: { type: "object" },
                                    beagle_score: { type: "number" },
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
    var _a, _b, _c, _d;
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    }
    try {
        const { access_code, transaction_id, reference } = query;
        if (!access_code && !transaction_id && !reference) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Access code, transaction ID, or reference is required" });
        }
        let ewayResponse;
        if (access_code) {
            ewayResponse = await (0, utils_1.makeEwayRequest)(`/GetAccessCodeResult/${access_code}`, "GET");
        }
        else if (transaction_id) {
            ewayResponse = await (0, utils_1.makeEwayRequest)(`/Transaction/${transaction_id}`, "GET");
        }
        else {
            const transaction = await db_1.models.transaction.findOne({
                where: {
                    referenceId: reference,
                    userId: user.id
                },
            });
            if (!transaction || !((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.eway_transaction_id)) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found or does not have eWAY transaction ID" });
            }
            ewayResponse = await (0, utils_1.makeEwayRequest)(`/Transaction/${transaction.metadata.eway_transaction_id}`, "GET");
        }
        if (ewayResponse.Errors) {
            throw new utils_1.EwayError("eWAY API Error", 400, { errors: ewayResponse.Errors });
        }
        return {
            success: true,
            data: {
                transaction_id: (_b = ewayResponse.TransactionID) === null || _b === void 0 ? void 0 : _b.toString(),
                transaction_status: ewayResponse.TransactionStatus,
                transaction_type: ewayResponse.TransactionType,
                authorisation_code: ewayResponse.AuthorisationCode,
                response_code: ewayResponse.ResponseCode,
                response_message: ewayResponse.ResponseMessage,
                amount: (_c = ewayResponse.Payment) === null || _c === void 0 ? void 0 : _c.TotalAmount,
                currency: (_d = ewayResponse.Payment) === null || _d === void 0 ? void 0 : _d.CurrencyCode,
                customer: ewayResponse.Customer,
                beagle_score: ewayResponse.BeagleScore,
                transaction_datetime: ewayResponse.TransactionDateTime,
                max_refund: ewayResponse.MaxRefund,
                original_transaction_id: ewayResponse.OriginalTransactionId,
                source: ewayResponse.Source,
            },
        };
    }
    catch (error) {
        console_1.logger.error("EWAY", "Status check error", error);
        if (error instanceof utils_1.EwayError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `eWAY Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: error.message || "Failed to check eWAY payment status" });
    }
};
