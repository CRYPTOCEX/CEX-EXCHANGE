"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Checks Klarna order status",
    description: "Retrieves the current status of a Klarna order and updates the local transaction record.",
    operationId: "checkKlarnaOrderStatus",
    tags: ["Finance", "Deposit"],
    parameters: [
        {
            name: "order_id",
            in: "query",
            description: "Klarna order ID to check status for",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "transaction_id",
            in: "query",
            description: "Local transaction ID (optional, for validation)",
            required: false,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Order status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            order_id: {
                                type: "string",
                                description: "Klarna order ID",
                            },
                            status: {
                                type: "string",
                                description: "Current order status",
                            },
                            fraud_status: {
                                type: "string",
                                description: "Fraud check status",
                                nullable: true,
                            },
                            klarna_reference: {
                                type: "string",
                                description: "Klarna reference number",
                                nullable: true,
                            },
                            order_amount: {
                                type: "number",
                                description: "Order amount in minor units",
                            },
                            purchase_currency: {
                                type: "string",
                                description: "Purchase currency",
                            },
                            remaining_authorized_amount: {
                                type: "number",
                                description: "Remaining authorized amount",
                                nullable: true,
                            },
                            captured_amount: {
                                type: "number",
                                description: "Amount captured",
                                nullable: true,
                            },
                            refunded_amount: {
                                type: "number",
                                description: "Amount refunded",
                                nullable: true,
                            },
                            expires_at: {
                                type: "string",
                                description: "Authorization expiration time",
                                nullable: true,
                            },
                            local_status: {
                                type: "string",
                                description: "Local transaction status",
                            },
                            transaction_id: {
                                type: "string",
                                description: "Local transaction ID",
                                nullable: true,
                            },
                            updated_at: {
                                type: "string",
                                description: "Last update timestamp",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid order ID or request parameters",
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
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { order_id, transaction_id } = query;
    if (!order_id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Order ID is required" });
    }
    try {
        const whereClause = {
            userId: user.id,
            type: "DEPOSIT",
        };
        if (transaction_id) {
            whereClause.id = transaction_id;
        }
        const transaction = await db_1.models.transaction.findOne({
            where: whereClause,
            order: [["createdAt", "DESC"]],
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const transactionMetadata = JSON.parse(transaction.metadata || "{}");
        if (transactionMetadata.order_id && transactionMetadata.order_id !== order_id) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Order ID does not match transaction" });
        }
        let orderDetails = null;
        let apiError = null;
        try {
            orderDetails = await (0, utils_1.makeKlarnaRequest)(`/ordermanagement/v1/orders/${order_id}`, "GET");
        }
        catch (error) {
            console_1.logger.error("KLARNA", `Failed to retrieve Klarna order ${order_id}`, error);
            apiError = error instanceof utils_1.KlarnaError ? error.message : "API request failed";
        }
        if (orderDetails) {
            const updatedMetadata = {
                ...transactionMetadata,
                order_id: orderDetails.order_id || order_id,
                klarna_reference: orderDetails.klarna_reference,
                current_klarna_status: orderDetails.status,
                fraud_status: orderDetails.fraud_status,
                remaining_authorized_amount: orderDetails.remaining_authorized_amount,
                captured_amount: orderDetails.captured_amount,
                refunded_amount: orderDetails.refunded_amount,
                expires_at: orderDetails.expires_at,
                status_checked_at: new Date().toISOString(),
            };
            const mappedStatus = orderDetails.status ? utils_1.KLARNA_STATUS_MAPPING[orderDetails.status] || transaction.status : transaction.status;
            if (mappedStatus !== transaction.status) {
                await db_1.models.transaction.update({
                    status: mappedStatus,
                    metadata: JSON.stringify(updatedMetadata),
                }, {
                    where: { id: transaction.id },
                });
                console_1.logger.info("KLARNA", `Updated transaction ${transaction.id} status from ${transaction.status} to ${mappedStatus}`);
            }
            else {
                await db_1.models.transaction.update({
                    metadata: JSON.stringify(updatedMetadata),
                }, {
                    where: { id: transaction.id },
                });
            }
            return {
                order_id: orderDetails.order_id || order_id,
                status: orderDetails.status,
                fraud_status: orderDetails.fraud_status,
                klarna_reference: orderDetails.klarna_reference,
                order_amount: orderDetails.order_amount,
                purchase_currency: orderDetails.purchase_currency,
                remaining_authorized_amount: orderDetails.remaining_authorized_amount,
                captured_amount: orderDetails.captured_amount,
                refunded_amount: orderDetails.refunded_amount,
                expires_at: orderDetails.expires_at,
                local_status: mappedStatus,
                transaction_id: transaction.id,
                updated_at: new Date().toISOString(),
            };
        }
        else {
            console_1.logger.warn("KLARNA", `Using local status for order ${order_id} due to API error: ${apiError}`);
            return {
                order_id,
                status: transactionMetadata.current_klarna_status || "UNKNOWN",
                fraud_status: transactionMetadata.fraud_status,
                klarna_reference: transactionMetadata.klarna_reference,
                order_amount: Math.round(transaction.amount * 100),
                purchase_currency: transactionMetadata.purchase_currency,
                remaining_authorized_amount: transactionMetadata.remaining_authorized_amount,
                captured_amount: transactionMetadata.captured_amount,
                refunded_amount: transactionMetadata.refunded_amount,
                expires_at: transactionMetadata.expires_at,
                local_status: transaction.status,
                transaction_id: transaction.id,
                updated_at: transactionMetadata.status_checked_at || transaction.updatedAt,
                api_error: apiError,
                note: "Status retrieved from local database due to API unavailability",
            };
        }
    }
    catch (error) {
        if (error instanceof utils_1.KlarnaError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Klarna status check failed: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Status check failed: ${error.message}` });
    }
};
