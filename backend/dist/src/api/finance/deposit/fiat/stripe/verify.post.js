"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
exports.metadata = {
    summary: "Verifies a Stripe checkout session",
    description: "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
    operationId: "verifyStripeCheckoutSession",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "STRIPE_DEPOSIT",
    logTitle: "Verify Stripe checkout session",
    parameters: [
        {
            index: 0,
            name: "sessionId",
            in: "query",
            description: "Stripe checkout session ID",
            required: true,
            schema: { type: "string" },
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Stripe"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, query, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { sessionId } = query;
    const stripe = (0, utils_1.useStripe)();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving Stripe checkout session");
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntentId = session.payment_intent;
        const paymentIntent = paymentIntentId
            ? await stripe.paymentIntents.retrieve(paymentIntentId)
            : null;
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
        const mappedLineItems = lineItems.data.map((item) => ({
            id: item.id,
            description: item.description,
            currency: item.currency,
            amount: item.amount_subtotal / 100,
        }));
        const status = paymentIntent ? paymentIntent.status : "unknown";
        if (status === "canceled") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Payment was canceled by the user" });
        }
        if (status === "requires_payment_method" || status === "requires_confirmation") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Payment was not completed" });
        }
        if (status !== "succeeded") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment not succeeded");
            throw (0, error_1.createError)({ statusCode: 400, message: `Payment intent not succeeded. Status: ${status}` });
        }
        if (status === "succeeded") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
            const userPk = await db_1.models.user.findByPk(user.id);
            if (!userPk) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
                throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate transaction");
            const existingTransaction = await db_1.models.transaction.findOne({
                where: { referenceId: sessionId },
            });
            if (existingTransaction)
                throw (0, error_1.createError)({ statusCode: 409, message: "Transaction already exists" });
            const { currency, amount } = mappedLineItems[0];
            const fee = ((_a = mappedLineItems[1]) === null || _a === void 0 ? void 0 : _a.amount) || 0;
            const depositResult = await (0, utils_2.processFiatDeposit)({
                userId: user.id,
                currency,
                amount,
                fee,
                referenceId: sessionId,
                method: "STRIPE",
                description: `Deposit of ${amount} ${currency} to ${userPk === null || userPk === void 0 ? void 0 : userPk.firstName} ${userPk === null || userPk === void 0 ? void 0 : userPk.lastName} wallet by Stripe.`,
                idempotencyKey: `stripe_deposit_${sessionId}`,
                ctx,
            });
            const result = await db_1.models.transaction.findByPk(depositResult.transactionId);
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(userPk, result, currency, depositResult.newBalance);
            }
            catch (error) {
                console_1.logger.error("STRIPE", "Error sending email", error);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Stripe deposit completed successfully");
            return {
                transaction: result,
                balance: depositResult.newBalance,
                currency,
                method: "Stripe",
            };
        }
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving session and line items: ${error.message}`
        });
    }
};
