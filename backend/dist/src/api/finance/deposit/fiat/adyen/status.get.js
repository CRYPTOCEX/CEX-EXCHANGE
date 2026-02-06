"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Checks Adyen payment status",
    description: "Retrieves the current status of an Adyen payment by transaction reference. This endpoint provides real-time payment status information for tracking and reconciliation purposes.",
    operationId: "checkAdyenPaymentStatus",
    tags: ["Finance", "Deposit"],
    parameters: [
        {
            name: "reference",
            in: "query",
            required: true,
            schema: {
                type: "string",
                description: "Transaction reference to check status for",
            },
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
                            reference: {
                                type: "string",
                                description: "Transaction reference",
                            },
                            status: {
                                type: "string",
                                description: "Current payment status",
                            },
                            amount: {
                                type: "number",
                                description: "Payment amount",
                            },
                            currency: {
                                type: "string",
                                description: "Payment currency",
                            },
                            fee: {
                                type: "number",
                                description: "Transaction fee",
                                nullable: true,
                            },
                            pspReference: {
                                type: "string",
                                description: "Adyen PSP reference",
                                nullable: true,
                            },
                            sessionId: {
                                type: "string",
                                description: "Adyen session ID",
                                nullable: true,
                            },
                            createdAt: {
                                type: "string",
                                description: "Transaction creation timestamp",
                            },
                            updatedAt: {
                                type: "string",
                                description: "Transaction last update timestamp",
                            },
                            metadata: {
                                type: "object",
                                description: "Additional transaction metadata",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { reference } = query;
    if (!reference) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Transaction reference is required" });
    }
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                id: reference,
                userId: user.id,
                type: "DEPOSIT",
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const metadata = transaction.metadata;
        const gateway = metadata === null || metadata === void 0 ? void 0 : metadata.gateway;
        if (gateway !== "adyen") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Transaction is not an Adyen payment" });
        }
        return {
            reference: transaction.id,
            status: transaction.status,
            amount: transaction.amount,
            currency: (metadata === null || metadata === void 0 ? void 0 : metadata.currency) || "USD",
            fee: transaction.fee,
            pspReference: (metadata === null || metadata === void 0 ? void 0 : metadata.pspReference) || null,
            sessionId: (metadata === null || metadata === void 0 ? void 0 : metadata.sessionId) || null,
            resultCode: (metadata === null || metadata === void 0 ? void 0 : metadata.resultCode) || null,
            eventCode: (metadata === null || metadata === void 0 ? void 0 : metadata.eventCode) || null,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            metadata: {
                gateway: metadata === null || metadata === void 0 ? void 0 : metadata.gateway,
                originalAmount: metadata === null || metadata === void 0 ? void 0 : metadata.originalAmount,
                feeAmount: metadata === null || metadata === void 0 ? void 0 : metadata.feeAmount,
                countryCode: metadata === null || metadata === void 0 ? void 0 : metadata.countryCode,
                verifiedAt: metadata === null || metadata === void 0 ? void 0 : metadata.verifiedAt,
                verificationMethod: metadata === null || metadata === void 0 ? void 0 : metadata.verificationMethod,
                webhookProcessedAt: metadata === null || metadata === void 0 ? void 0 : metadata.webhookProcessedAt,
                captureProcessedAt: metadata === null || metadata === void 0 ? void 0 : metadata.captureProcessedAt,
                captureSuccess: metadata === null || metadata === void 0 ? void 0 : metadata.captureSuccess,
                cancelledAt: metadata === null || metadata === void 0 ? void 0 : metadata.cancelledAt,
            },
        };
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Payment status check error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to check payment status: ${error.message}` });
    }
};
