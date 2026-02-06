"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verify dLocal payment status",
    description: "Manually verify a dLocal payment status and update transaction accordingly",
    operationId: "verifyDLocalPayment",
    tags: ["Finance", "Verification"],
    logModule: "DLOCAL_DEPOSIT",
    logTitle: "Verify dLocal payment",
    requestBody: {
        description: "Payment verification request",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        payment_id: {
                            type: "string",
                            description: "dLocal payment ID to verify",
                        },
                        order_id: {
                            type: "string",
                            description: "Internal order ID to verify",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Payment verification completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            payment_id: { type: "string" },
                            order_id: { type: "string" },
                            status: { type: "string" },
                            amount: { type: "number" },
                            currency: { type: "string" },
                            updated: { type: "boolean" },
                            wallet_updated: { type: "boolean" },
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
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { payment_id, order_id } = body;
    if (!payment_id && !order_id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Either payment_id or order_id is required" });
    }
    try {
        let transaction;
        if (order_id) {
            transaction = await db_1.models.transaction.findOne({
                where: { id: order_id },
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        include: [
                            {
                                model: db_1.models.wallet,
                                as: "wallets",
                            },
                        ],
                    },
                ],
            });
        }
        else if (payment_id) {
            transaction = await db_1.models.transaction.findOne({
                where: { referenceId: payment_id },
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        include: [
                            {
                                model: db_1.models.wallet,
                                as: "wallets",
                            },
                        ],
                    },
                ],
            });
        }
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        const dLocalPaymentId = payment_id || ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.dlocal_payment_id);
        if (!dLocalPaymentId) {
            throw (0, error_1.createError)({ statusCode: 400, message: "dLocal payment ID not found in transaction" });
        }
        const paymentData = await (0, utils_1.makeDLocalRequest)(`/payments/${dLocalPaymentId}`, "GET");
        console_1.logger.info("DLOCAL", `Payment verification: ${dLocalPaymentId}, status: ${paymentData.status}`);
        const internalStatus = utils_1.DLOCAL_STATUS_MAPPING[paymentData.status] || "pending";
        const previousStatus = transaction.status;
        let walletUpdated = false;
        await transaction.update({
            status: internalStatus.toUpperCase(),
            referenceId: paymentData.id,
            metadata: JSON.stringify({
                ...transaction.metadata,
                dlocal_payment_id: paymentData.id,
                dlocal_status: paymentData.status,
                dlocal_status_code: paymentData.status_code,
                dlocal_status_detail: paymentData.status_detail,
                payment_method_type: paymentData.payment_method_type,
                verification_date: new Date().toISOString(),
                verified_by: user.id,
            }),
        });
        if (paymentData.status === "PAID" && previousStatus !== "COMPLETED") {
            const transactionUser = transaction.user;
            const currency = paymentData.currency;
            const depositAmount = transaction.amount;
            const feeAmount = transaction.fee || 0;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit via wallet service");
            await (0, utils_2.processFiatDeposit)({
                userId: transactionUser.id,
                currency,
                amount: depositAmount,
                fee: feeAmount,
                referenceId: paymentData.id,
                method: "DLOCAL",
                description: `dLocal deposit - ${depositAmount} ${currency}`,
                metadata: {
                    dlocal_payment_id: paymentData.id,
                    payment_method_type: paymentData.payment_method_type,
                },
                idempotencyKey: `dlocal_deposit_${paymentData.id}`,
                ctx,
            });
            walletUpdated = true;
            console_1.logger.success("DLOCAL", `Wallet updated for user ${transactionUser.id}: +${depositAmount} ${currency}`);
            console_1.logger.success("DLOCAL", `Deposit verified and completed: ${paymentData.id}, amount: ${depositAmount} ${currency}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Dlocal deposit completed successfully");
        return {
            payment_id: paymentData.id,
            order_id: transaction.id,
            status: paymentData.status,
            amount: paymentData.amount,
            currency: paymentData.currency,
            updated: true,
            wallet_updated: walletUpdated,
        };
    }
    catch (error) {
        console_1.logger.error("DLOCAL", "Payment verification error", error);
        if (error instanceof utils_1.DLocalError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `dLocal API Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Payment verification failed: ${error.message}` });
    }
};
