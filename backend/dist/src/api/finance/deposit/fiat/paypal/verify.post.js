"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
const credit_contract_1 = require("../credit-contract");
exports.metadata = {
    summary: "Verifies a Stripe checkout session",
    description: "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
    operationId: "verifyStripeCheckoutSession",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "PAYPAL_DEPOSIT",
    logTitle: "Verify PayPal order",
    parameters: [
        {
            name: "orderId",
            in: "query",
            description: "The PayPal order ID",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Checkout session verified successfully. Returns the session ID, payment intent status, and detailed line items.",
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
                                    id: { type: "string", description: "Session ID" },
                                    status: {
                                        type: "string",
                                        description: "Payment intent status",
                                        nullable: true,
                                    },
                                    lineItems: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string", description: "Line item ID" },
                                                description: {
                                                    type: "string",
                                                    description: "Line item description",
                                                },
                                                amountSubtotal: {
                                                    type: "number",
                                                    description: "Subtotal amount",
                                                },
                                                amountTotal: {
                                                    type: "number",
                                                    description: "Total amount",
                                                },
                                                currency: {
                                                    type: "string",
                                                    description: "Currency code",
                                                },
                                            },
                                        },
                                        description: "List of line items associated with the checkout session",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Paypal"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk)
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    const { orderId } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up pending order");
    const pendingTransaction = await db_1.models.transaction.findOne({
        where: { referenceId: orderId },
    });
    if (!pendingTransaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Unknown PayPal order");
        throw (0, error_1.createError)({ statusCode: 404, message: "Unknown PayPal order" });
    }
    if (pendingTransaction.userId !== user.id) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`User ${user.id} attempted to verify order owned by ${pendingTransaction.userId}`);
        throw (0, error_1.createError)({ statusCode: 403, message: "This order does not belong to you" });
    }
    if (pendingTransaction.status === "COMPLETED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Transaction already completed");
        throw (0, error_1.createError)({ statusCode: 409, message: "Transaction already completed" });
    }
    const ordersController = (0, utils_1.paypalOrdersController)();
    try {
        const { result: captureDetails } = await ordersController.captureOrder({
            id: orderId,
        });
        if (!captureDetails.purchaseUnits ||
            captureDetails.purchaseUnits.length === 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "No purchase units found in capture details." });
        }
        const purchaseUnit = captureDetails.purchaseUnits[0];
        const captures = (_a = purchaseUnit.payments) === null || _a === void 0 ? void 0 : _a.captures;
        if (!captures || captures.length === 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "No captures found in purchase unit." });
        }
        const capture = captures[0];
        const grossAmount = parseFloat(((_b = capture.amount) === null || _b === void 0 ? void 0 : _b.value) || "0");
        const currency = ((_c = capture.amount) === null || _c === void 0 ? void 0 : _c.currencyCode) || "";
        const pendingMetadata = JSON.parse(pendingTransaction.metadata || "{}");
        if (pendingMetadata.currency && pendingMetadata.currency !== currency) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency mismatch");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Currency mismatch: pending=${pendingMetadata.currency}, captured=${currency}`,
            });
        }
        if (grossAmount + 0.01 < pendingTransaction.amount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Amount mismatch");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Amount mismatch: pending=${pendingTransaction.amount}, captured=${grossAmount}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
        const paypalGateway = await db_1.models.depositGateway.findOne({
            where: { alias: "paypal" },
        });
        if (!paypalGateway) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "PayPal gateway not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
        const currencyData = await db_1.models.currency.findOne({
            where: { id: currency },
        });
        if (!currencyData) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
        const fixedFee = paypalGateway.getFixedFee(currency);
        const percentageFee = paypalGateway.getPercentageFee(currency);
        const taxAmount = Number(((grossAmount * percentageFee) / 100 + fixedFee).toFixed(currencyData.precision || 2));
        const depositResult = await (0, utils_2.processFiatDeposit)({
            userId: user.id,
            currency,
            amount: grossAmount,
            fee: taxAmount,
            referenceId: (0, credit_contract_1.creditReferenceId)(pendingTransaction, orderId),
            method: "PAYPAL",
            description: `Deposit of ${grossAmount - taxAmount} ${currency} to ${userPk.firstName} ${userPk.lastName} wallet by PayPal.`,
            metadata: { currency },
            idempotencyKey: `paypal_deposit_${orderId}`,
            ctx,
        });
        await db_1.models.transaction.update({
            status: "COMPLETED",
            description: `PayPal deposit of ${grossAmount} ${currency} completed`,
            metadata: JSON.stringify({
                ...pendingMetadata,
                completedTransactionId: depositResult.transactionId,
                captureId: capture.id,
                completedAt: new Date().toISOString(),
            }),
        }, { where: { id: pendingTransaction.id } });
        const createdTransaction = await db_1.models.transaction.findByPk(depositResult.transactionId);
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
            await (0, emails_1.sendFiatTransactionEmail)(userPk, createdTransaction, currency, depositResult.newBalance);
        }
        catch (error) {
            console_1.logger.error("PAYPAL", "Error sending email", error);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Paypal deposit completed successfully");
        return {
            transaction: createdTransaction,
            balance: depositResult.newBalance.toFixed(2),
            currency,
            method: "PAYPAL",
            confirmed: true,
            status: "COMPLETED",
        };
    }
    catch (error) {
        console_1.logger.error("PAYPAL", "Error verifying PayPal order", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Error verifying PayPal order: ${error.message}` });
    }
};
