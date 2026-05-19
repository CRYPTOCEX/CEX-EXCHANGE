"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get dLocal payment status",
    description: "Retrieve current payment status from dLocal API without updating local database",
    operationId: "getDLocalPaymentStatus",
    tags: ["Finance", "Status"],
    parameters: [
        {
            name: "payment_id",
            in: "query",
            description: "dLocal payment ID to check",
            schema: { type: "string" },
        },
        {
            name: "order_id",
            in: "query",
            description: "Internal order ID to check",
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
                            id: { type: "string" },
                            order_id: { type: "string" },
                            amount: { type: "number" },
                            currency: { type: "string" },
                            country: { type: "string" },
                            status: { type: "string" },
                            status_code: { type: "number" },
                            status_detail: { type: "string" },
                            payment_method_id: { type: "string" },
                            payment_method_type: { type: "string" },
                            payment_method_flow: { type: "string" },
                            created_date: { type: "string" },
                            approved_date: { type: "string", nullable: true },
                            live: { type: "boolean" },
                            payer: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    email: { type: "string" },
                                    document: { type: "string" },
                                    phone: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Payment"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, query } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { payment_id, order_id } = query;
    if (!payment_id && !order_id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Either payment_id or order_id is required" });
    }
    try {
        let dLocalPaymentId = payment_id;
        if (!dLocalPaymentId && order_id) {
            const transaction = await db_1.models.transaction.findOne({
                where: { referenceId: order_id },
            });
            if (!transaction) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
            }
            dLocalPaymentId = ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.dlocal_payment_id) || transaction.referenceId;
            if (!dLocalPaymentId) {
                throw (0, error_1.createError)({ statusCode: 400, message: "dLocal payment ID not found in transaction" });
            }
        }
        const paymentData = await (0, utils_1.makeDLocalRequest)(`/payments/${dLocalPaymentId}`, "GET");
        console_1.logger.info("DLOCAL", `Payment status check: ${dLocalPaymentId}, status: ${paymentData.status}`);
        return {
            id: paymentData.id,
            order_id: paymentData.order_id,
            amount: paymentData.amount,
            currency: paymentData.currency,
            country: paymentData.country,
            status: paymentData.status,
            status_code: paymentData.status_code,
            status_detail: paymentData.status_detail,
            payment_method_id: paymentData.payment_method_id,
            payment_method_type: paymentData.payment_method_type,
            payment_method_flow: paymentData.payment_method_flow,
            created_date: paymentData.created_date,
            approved_date: paymentData.approved_date,
            live: paymentData.live,
            payer: paymentData.payer,
        };
    }
    catch (error) {
        console_1.logger.error("DLOCAL", "Payment status check error", error);
        if (error instanceof utils_1.DLocalError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `dLocal API Error: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Payment status check failed: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
    }
};
