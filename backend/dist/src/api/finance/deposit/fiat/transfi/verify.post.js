"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/utils");
const query_1 = require("@b/utils/query");
const utils_2 = require("./utils");
exports.metadata = {
    summary: "Verifies a TransFi deposit after the customer returns",
    description: "Confirms the order upstream and credits the wallet if it has settled. Shares an idempotency key with the webhook so the two cannot double-credit.",
    operationId: "verifyTransfiDeposit",
    tags: ["Finance", "Deposit", "TransFi"],
    requiresAuth: true,
    logModule: "FIAT_DEPOSIT",
    logTitle: "Verify TransFi deposit",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        order_id: { type: "string", description: "TransFi order id" },
                        transaction_id: { type: "string", description: "Platform transaction id" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Verification result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            status: { type: "string" },
                            data: { type: "object" },
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
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const orderId = String((body === null || body === void 0 ? void 0 : body.order_id) || "").trim();
    const transactionId = String((body === null || body === void 0 ? void 0 : body.transaction_id) || "").trim();
    if (!orderId && !transactionId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "order_id or transaction_id is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating deposit");
    let transaction = null;
    if (transactionId) {
        transaction = await db_1.models.transaction.findOne({
            where: { id: transactionId, userId: user.id, type: "DEPOSIT" },
        });
    }
    if (!transaction && orderId) {
        const candidates = await db_1.models.transaction.findAll({
            where: { userId: user.id, type: "DEPOSIT" },
            order: [["createdAt", "DESC"]],
            limit: 100,
        });
        transaction =
            candidates.find((t) => {
                var _a;
                try {
                    return ((_a = JSON.parse(t.metadata || "{}")) === null || _a === void 0 ? void 0 : _a.transfiOrderId) === orderId;
                }
                catch (_b) {
                    return false;
                }
            }) || null;
    }
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Deposit not found" });
    let meta = {};
    try {
        meta = JSON.parse(transaction.metadata || "{}");
    }
    catch (_b) {
        meta = {};
    }
    if (meta.gateway && String(meta.gateway).toLowerCase() !== "transfi") {
        throw (0, error_1.createError)({ statusCode: 400, message: "This is not a TransFi deposit" });
    }
    if (orderId && meta.transfiOrderId && orderId !== meta.transfiOrderId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Order does not belong to this deposit" });
    }
    const resolvedOrderId = orderId || meta.transfiOrderId;
    if (!resolvedOrderId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "This deposit has no TransFi order reference" });
    }
    if (transaction.status === "COMPLETED") {
        return {
            success: true,
            status: "COMPLETED",
            data: { status: "COMPLETED", orderId: resolvedOrderId, amount: transaction.amount },
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Confirming with TransFi");
    const confirmed = await (0, utils_2.getOrder)(resolvedOrderId);
    const currency = meta.currency || confirmed.destinationCurrency || "";
    if (meta.currency && confirmed.destinationCurrency &&
        String(meta.currency).toUpperCase() !== String(confirmed.destinationCurrency).toUpperCase()) {
        throw (0, error_1.createError)({ statusCode: 409, message: "TransFi order currency does not match the deposit" });
    }
    if (confirmed.onHold) {
        return {
            success: false,
            status: "MANUAL_REVIEW",
            message: "Your deposit is being reviewed. We will update you shortly.",
            data: { status: confirmed.status, orderId: resolvedOrderId },
        };
    }
    if (confirmed.mapped === "COMPLETED" && currency) {
        const settled = (_a = confirmed.destinationAmount) !== null && _a !== void 0 ? _a : transaction.amount;
        let alreadyCredited = false;
        try {
            await (0, utils_1.processFiatDeposit)({
                userId: transaction.userId,
                currency,
                amount: settled,
                fee: Number(transaction.fee) || 0,
                referenceId: `TFO-${resolvedOrderId}`,
                method: "TRANSFI",
                description: `TransFi deposit of ${settled} ${currency}`,
                metadata: {
                    transfiOrderId: resolvedOrderId,
                    transfiStatus: confirmed.status,
                    source: "verify",
                },
                idempotencyKey: `transfi_deposit_${resolvedOrderId}`,
            });
        }
        catch (error) {
            if (error instanceof wallet_1.DuplicateOperationError) {
                alreadyCredited = true;
            }
            else {
                throw error;
            }
        }
        await transaction.update({
            status: "COMPLETED",
            amount: settled,
            metadata: JSON.stringify({
                ...meta,
                transfiStatus: confirmed.status,
                settledAmount: settled,
                alreadyCredited,
                verifiedAt: new Date().toISOString(),
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi deposit ${resolvedOrderId} verified and credited`);
        return {
            success: true,
            status: "COMPLETED",
            data: { status: "COMPLETED", orderId: resolvedOrderId, amount: settled, currency },
        };
    }
    if (confirmed.mapped === "FAILED") {
        await transaction.update({
            status: "FAILED",
            metadata: JSON.stringify({
                ...meta,
                transfiStatus: confirmed.status,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
                verifiedAt: new Date().toISOString(),
            }),
        });
        return {
            success: false,
            status: "FAILED",
            message: confirmed.failureMessage || "The payment did not complete.",
            data: { status: confirmed.status, orderId: resolvedOrderId },
        };
    }
    console_1.logger.debug("TRANSFI", `${resolvedOrderId} still ${confirmed.status} at verify`);
    return {
        success: false,
        status: "PENDING",
        message: "Your payment is still processing. We will credit your wallet once it clears.",
        data: { status: confirmed.status, orderId: resolvedOrderId },
    };
};
