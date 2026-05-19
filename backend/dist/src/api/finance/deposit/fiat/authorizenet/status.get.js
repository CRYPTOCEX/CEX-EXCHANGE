"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Get Authorize.Net transaction status",
    description: "Retrieves the current status of an Authorize.Net transaction by its reference ID.",
    operationId: "getAuthorizeNetTransactionStatus",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    parameters: [
        {
            name: "referenceId",
            in: "query",
            description: "The transaction reference ID",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Transaction status retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    transactionId: {
                                        type: "string",
                                        description: "Transaction ID",
                                    },
                                    referenceId: {
                                        type: "string",
                                        description: "Transaction reference ID",
                                    },
                                    status: {
                                        type: "string",
                                        description: "Transaction status",
                                        enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"],
                                    },
                                    amount: {
                                        type: "number",
                                        description: "Transaction amount",
                                    },
                                    currency: {
                                        type: "string",
                                        description: "Currency code",
                                    },
                                    fee: {
                                        type: "number",
                                        description: "Transaction fee",
                                    },
                                    createdAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Transaction creation timestamp",
                                    },
                                    updatedAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Transaction last update timestamp",
                                    },
                                },
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
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { referenceId } = query;
    if (!referenceId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Reference ID is required" });
    }
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: referenceId,
                userId: user.id
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const metadata = JSON.parse(transaction.metadata || "{}");
        return {
            status: true,
            statusCode: 200,
            data: {
                transactionId: transaction.id,
                referenceId: transaction.referenceId,
                status: transaction.status,
                amount: transaction.amount,
                currency: metadata.currency,
                fee: transaction.fee,
                description: transaction.description,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                metadata: {
                    method: metadata.method,
                    totalAmount: metadata.totalAmount,
                    authorizationId: metadata.authorizationId,
                    captureId: metadata.captureId,
                    responseCode: metadata.responseCode,
                    fraudStatus: metadata.fraudStatus,
                },
            },
        };
    }
    catch (error) {
        console_1.logger.error("AUTHORIZENET", "Status check error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: error instanceof Error ? error.message : "Failed to get transaction status" });
    }
};
