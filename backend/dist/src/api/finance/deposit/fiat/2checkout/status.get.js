"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Check 2Checkout payment status",
    description: "Retrieves the current status of a 2Checkout payment using the order reference",
    operationId: "check2CheckoutStatus",
    tags: ["Finance", "Deposit"],
    parameters: [
        {
            name: "orderReference",
            in: "query",
            required: true,
            schema: {
                type: "string",
            },
            description: "2Checkout order reference to check status for",
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
                            status: {
                                type: "string",
                                enum: ["PENDING", "COMPLETED", "FAILED"],
                                description: "Current transaction status",
                            },
                            transaction: {
                                type: "object",
                                description: "Transaction details",
                            },
                            paymentDetails: {
                                type: "object",
                                description: "2Checkout payment details from metadata",
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
    var _a;
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { orderReference } = query;
    if (!orderReference) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Order reference is required",
        });
    }
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                userId: user.id,
                description: {
                    [sequelize_1.Op.like]: `%${orderReference}%`,
                },
                type: "DEPOSIT",
            },
            include: [
                {
                    model: db_1.models.wallet,
                    as: "wallet",
                    attributes: ["id", "currency", "balance"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Transaction not found",
            });
        }
        let paymentDetails = {};
        try {
            const metadata = JSON.parse(transaction.metadata || "{}");
            paymentDetails = {
                gateway: metadata.gateway,
                refNo: metadata.refNo,
                orderNo: metadata.orderNo,
                externalReference: metadata.externalReference,
                orderStatus: metadata.orderStatus,
                paymentStatus: metadata.paymentStatus,
                processedAt: metadata.processedAt,
                verifiedAt: metadata.verifiedAt,
                failureReason: metadata.failureReason,
            };
        }
        catch (error) {
            console_1.logger.error("2CHECKOUT", "Error parsing transaction metadata", error);
        }
        return {
            status: transaction.status,
            transaction: {
                id: transaction.id,
                amount: transaction.amount,
                fee: transaction.fee,
                currency: (_a = transaction.wallet) === null || _a === void 0 ? void 0 : _a.currency,
                description: transaction.description,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
            },
            paymentDetails,
        };
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error checking payment status: ${error.message}`,
        });
    }
};
