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
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Verifies a Stripe checkout session",
    description: "Confirms the validity of a Stripe checkout session by its session ID, ensuring the session is authenticated and retrieving associated payment intent and line items details.",
    operationId: "verifyStripeCheckoutSession",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "STRIPE_DEPOSIT",
    logTitle: "Verify and complete Stripe deposit",
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
        if (((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId) !== String(user.id)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session does not belong to caller");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Session does not belong to the authenticated user",
            });
        }
        const paymentIntentId = session.payment_intent;
        const paymentIntent = paymentIntentId
            ? await stripe.paymentIntents.retrieve(paymentIntentId)
            : null;
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
        const mappedLineItems = lineItems.data.map((item) => ({
            id: item.id,
            description: item.description,
            currency: (item.currency || "").toUpperCase(),
            amount: (0, utils_1.fromStripeAmount)(item.amount_subtotal, item.currency),
        }));
        const depositLine = mappedLineItems.find((l) => (l.description || "").toLowerCase() === "deposit") ||
            mappedLineItems[0];
        const feeLine = mappedLineItems.find((l) => (l.description || "").toLowerCase() === "tax") ||
            mappedLineItems[1];
        const status = paymentIntent ? paymentIntent.status : "unknown";
        if (status === "succeeded") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
            const userPk = await db_1.models.user.findByPk(user.id);
            if (!depositLine) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Stripe session has no deposit line item" });
            }
            const { currency, amount } = depositLine;
            const fee = (feeLine === null || feeLine === void 0 ? void 0 : feeLine.amount) || 0;
            const grossAmount = amount + fee;
            let newBalance;
            let transactionId;
            try {
                const result = await (0, utils_2.processFiatDeposit)({
                    userId: user.id,
                    currency,
                    amount: grossAmount,
                    fee,
                    referenceId: sessionId,
                    method: "STRIPE",
                    description: `Stripe deposit of ${amount} ${currency}`,
                    metadata: { sessionId, source: "verified" },
                    idempotencyKey: `stripe_deposit_${sessionId}`,
                    ctx,
                });
                newBalance = result.newBalance;
                transactionId = result.transactionId;
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    console_1.logger.info("STRIPE", `Session ${sessionId} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            if (transactionId) {
                const transaction = await db_1.models.transaction.findByPk(transactionId);
                try {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                    await (0, emails_1.sendFiatTransactionEmail)(userPk, transaction, currency, newBalance !== null && newBalance !== void 0 ? newBalance : 0);
                }
                catch (error) {
                    console_1.logger.error("STRIPE", "Error sending email", error);
                }
            }
        }
        return {
            id: session.id,
            status,
            line_items: mappedLineItems,
        };
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.statusCode)
            throw error;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving session and line items: ${error.message}`
        });
    }
};
