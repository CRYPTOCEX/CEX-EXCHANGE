"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const fees_1 = require("@b/utils/fees");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
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
        if (status === "succeeded") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
            const userPk = await db_1.models.user.findByPk(user.id);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate transaction");
            const existingTransaction = await db_1.models.transaction.findOne({
                where: { referenceId: sessionId },
            });
            if (existingTransaction)
                return {
                    id: session.id,
                    status,
                    line_items: mappedLineItems,
                };
            const { currency, amount } = mappedLineItems[0];
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating wallet");
            const walletCreationResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
            const wallet = walletCreationResult.wallet;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
            const currencyData = await db_1.models.currency.findOne({
                where: { id: wallet.currency },
            });
            if (!currencyData) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency not found");
                throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
            const fee = ((_a = mappedLineItems[1]) === null || _a === void 0 ? void 0 : _a.amount) || 0;
            let newBalance = wallet.balance;
            newBalance += Number(amount);
            newBalance = parseFloat(newBalance.toFixed(currencyData.precision || 2));
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Starting database transaction");
            const walletResult = await db_1.sequelize.transaction(async (t) => {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balance via wallet service");
                const idempotencyKey = `stripe_session_${sessionId}`;
                const result = await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: user.id,
                    walletId: wallet.id,
                    walletType: "FIAT",
                    currency,
                    amount,
                    operationType: "DEPOSIT",
                    referenceId: sessionId,
                    description: `Stripe deposit of ${amount} ${currency}`,
                    metadata: {
                        method: "STRIPE",
                        sessionId,
                        fee,
                    },
                    transaction: t,
                });
                if (fee > 0) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting platform fee");
                    await (0, fees_1.collectPlatformFee)({
                        userId: user.id,
                        currency: wallet.currency,
                        walletType: "FIAT",
                        feeAmount: fee,
                        type: "DEPOSIT",
                        description: `Platform fee from Stripe deposit of ${fee} ${wallet.currency}`,
                        referenceId: result.transactionId,
                        metadata: { method: "stripe", userId: user.id },
                    });
                }
                return result;
            });
            const transaction = await db_1.models.transaction.findByPk(walletResult.transactionId);
            try {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification email");
                await (0, emails_1.sendFiatTransactionEmail)(userPk, transaction, currency, newBalance);
            }
            catch (error) {
                console_1.logger.error("STRIPE", "Error sending email", error);
            }
        }
        return {
            id: session.id,
            status,
            line_items: mappedLineItems,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving session and line items: ${error.message}`
        });
    }
};
