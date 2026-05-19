"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verifies a 2Checkout payment",
    description: "Verifies a 2Checkout payment using the order reference and updates the transaction status accordingly",
    operationId: "verify2CheckoutPayment",
    tags: ["Finance", "Deposit"],
    logModule: "2CHECKOUT_DEPOSIT",
    logTitle: "Verify 2Checkout payment",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        orderReference: {
                            type: "string",
                            description: "2Checkout order reference",
                        },
                        refNo: {
                            type: "string",
                            description: "2Checkout reference number",
                        },
                        signature: {
                            type: "string",
                            description: "2Checkout signature for verification",
                        },
                        status: {
                            type: "string",
                            description: "Payment status from 2Checkout",
                        },
                    },
                    required: ["orderReference", "refNo"],
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
                            success: { type: "boolean" },
                            transaction: { type: "object" },
                            message: { type: "string" },
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
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { orderReference, refNo, signature, status } = body;
    try {
        const config = (0, utils_1.use2Checkout)();
        const transaction = await db_1.models.transaction.findOne({
            where: {
                userId: user.id,
                description: {
                    [sequelize_1.Op.like]: `%${orderReference}%`,
                },
                status: "PENDING",
            },
            include: [
                {
                    model: db_1.models.wallet,
                    as: "wallet",
                },
            ],
        });
        if (!transaction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Transaction not found or already processed",
            });
        }
        if (signature) {
            const verificationParams = {
                orderReference,
                refNo,
                status: status || "COMPLETE",
            };
            const isValidSignature = (0, utils_1.verify2CheckoutSignature)(verificationParams, signature, config.secretKey);
            if (!isValidSignature) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid signature",
                });
            }
        }
        const isSuccessful = status === "COMPLETE" || status === "AUTHRECEIVED";
        if (isSuccessful) {
            await transaction.update({
                status: "COMPLETED",
                metadata: JSON.stringify({
                    ...JSON.parse(transaction.metadata || "{}"),
                    refNo,
                    orderReference,
                    gateway: "2checkout",
                    verifiedAt: new Date().toISOString(),
                }),
            });
            const wallet = transaction.wallet;
            if (wallet) {
                await (0, utils_2.processFiatDeposit)({
                    userId: user.id,
                    currency: wallet.currency,
                    amount: transaction.amount,
                    fee: (_a = transaction.fee) !== null && _a !== void 0 ? _a : 0,
                    referenceId: refNo,
                    method: "2CHECKOUT",
                    description: `2Checkout deposit - ${transaction.amount} ${wallet.currency}`,
                    metadata: {
                        refNo,
                        orderReference,
                    },
                    idempotencyKey: `2checkout_deposit_${refNo}`,
                    ctx,
                });
            }
        }
        else {
            await transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...JSON.parse(transaction.metadata || "{}"),
                    refNo,
                    orderReference,
                    gateway: "2checkout",
                    failureReason: status,
                    verifiedAt: new Date().toISOString(),
                }),
            });
        }
        return {
            success: isSuccessful,
            transaction: await transaction.reload(),
            message: isSuccessful
                ? "Payment verified and processed successfully"
                : `Payment failed with status: ${status}`,
        };
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error verifying 2Checkout payment: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}`,
        });
    }
};
