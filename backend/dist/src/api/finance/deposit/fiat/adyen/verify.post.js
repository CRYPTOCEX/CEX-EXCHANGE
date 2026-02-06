"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verifies an Adyen payment",
    description: "Manually verifies an Adyen payment by checking the payment status and updating the transaction accordingly. This endpoint is used for manual verification when automatic webhook processing is not available.",
    operationId: "verifyAdyenPayment",
    tags: ["Finance", "Deposit"],
    logModule: "ADYEN_DEPOSIT",
    logTitle: "Verify Adyen payment",
    requestBody: {
        description: "Payment verification data",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reference: {
                            type: "string",
                            description: "Transaction reference",
                        },
                        pspReference: {
                            type: "string",
                            description: "Adyen PSP reference",
                            nullable: true,
                        },
                    },
                    required: ["reference"],
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
                            success: {
                                type: "boolean",
                                description: "Whether the verification was successful",
                            },
                            status: {
                                type: "string",
                                description: "Payment status",
                            },
                            message: {
                                type: "string",
                                description: "Verification message",
                            },
                            transaction: {
                                type: "object",
                                description: "Updated transaction details",
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
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { reference, pspReference } = body;
    try {
        const transaction = await db_1.models.transaction.findOne({
            where: {
                referenceId: reference,
                userId: user.id,
                type: "DEPOSIT",
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "PROCESSING"],
                },
            },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found or already processed" });
        }
        const config = (0, utils_1.getAdyenConfig)();
        let paymentData;
        if (pspReference) {
            try {
                const paymentDetailsRequest = {
                    pspReference,
                };
                paymentData = await (0, utils_1.makeAdyenApiRequest)("/payments/details", paymentDetailsRequest, config);
            }
            catch (error) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Failed to fetch payment details: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
            }
        }
        else {
            const metadata = transaction.metadata;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.pspReference) {
                const paymentDetailsRequest = {
                    pspReference: metadata.pspReference,
                };
                paymentData = await (0, utils_1.makeAdyenApiRequest)("/payments/details", paymentDetailsRequest, config);
            }
            else {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "PSP reference not provided and not found in transaction metadata"
                });
            }
        }
        const resultCode = paymentData.resultCode;
        let newStatus;
        let shouldUpdateWallet = false;
        switch (resultCode) {
            case "Authorised":
                newStatus = "COMPLETED";
                shouldUpdateWallet = true;
                break;
            case "Cancelled":
            case "Error":
            case "Refused":
                newStatus = "FAILED";
                break;
            case "Pending":
            case "Received":
                newStatus = "PROCESSING";
                break;
            default:
                newStatus = "FAILED";
                break;
        }
        const updatedTransaction = await db_1.models.transaction.update({
            status: newStatus,
            metadata: JSON.stringify({
                ...transaction.metadata,
                pspReference: paymentData.pspReference,
                resultCode,
                verifiedAt: new Date().toISOString(),
                verificationMethod: "manual",
            }),
        }, {
            where: { id: transaction.id },
            returning: true,
        });
        if (shouldUpdateWallet) {
            const currency = ((_a = transaction.metadata) === null || _a === void 0 ? void 0 : _a.currency) || "USD";
            await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount: transaction.amount,
                fee: transaction.fee || 0,
                referenceId: paymentData.pspReference,
                method: "ADYEN",
                description: `Adyen deposit - ${transaction.amount} ${currency}`,
                metadata: {
                    pspReference: paymentData.pspReference,
                    resultCode,
                },
                idempotencyKey: `adyen_deposit_${paymentData.pspReference}`,
            });
        }
        return {
            success: shouldUpdateWallet,
            status: newStatus,
            message: shouldUpdateWallet
                ? "Payment verified and wallet updated successfully"
                : `Payment verification completed with status: ${resultCode}`,
            transaction: updatedTransaction[1][0],
            pspReference: paymentData.pspReference,
            resultCode,
        };
    }
    catch (error) {
        console_1.logger.error("ADYEN", "Payment verification error", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Payment verification failed: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
    }
};
