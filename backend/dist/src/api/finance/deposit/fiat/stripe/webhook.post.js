"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("./utils");
const reversal_1 = require("../reversal");
exports.metadata = {
    summary: "Stripe webhook handler",
    description: "Confirms Stripe Checkout payments independently of the browser return, and reverses refunds and disputes. Signature-verified against the raw request body.",
    operationId: "stripeWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "Stripe webhook",
    requiresAuth: false,
    requestBody: {
        description: "Stripe event payload",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        type: { type: "string" },
                        data: { type: "object" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Event acknowledged" },
        400: { description: "Signature verification failed" },
        500: { description: "Event could not be processed" },
    },
};
exports.default = async (data) => {
    const { body, headers, ctx } = data;
    const secret = process.env.APP_STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console_1.logger.error("STRIPE", "Webhook received but APP_STRIPE_WEBHOOK_SECRET is not set; refusing");
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "Stripe webhook secret is not configured",
        });
    }
    const signature = headers === null || headers === void 0 ? void 0 : headers["stripe-signature"];
    if (!signature) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing stripe-signature" });
    }
    const rawBody = typeof data.rawBodyString === "string" &&
        data.rawBodyString.length
        ? data.rawBodyString
        : JSON.stringify(body);
    const stripe = (0, utils_2.useStripe)();
    let event;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Stripe signature");
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    }
    catch (error) {
        console_1.logger.warn("STRIPE", `Webhook signature verification failed: ${error.message}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature" });
    }
    console_1.logger.info("STRIPE", `Webhook: ${event.type} (${event.id})`);
    switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
            await confirmSession(event.data.object, ctx);
            break;
        case "charge.refunded":
            await reverseCharge(event.data.object, "refund", stripe);
            break;
        case "charge.dispute.created":
            await reverseDispute(event.data.object, stripe);
            break;
        default:
            console_1.logger.debug("STRIPE", `Ignoring event type ${event.type}`);
    }
    return { received: true };
};
async function confirmSession(session, ctx) {
    var _a;
    if (session.payment_status !== "paid") {
        console_1.logger.debug("STRIPE", `Session ${session.id} completed but payment_status=${session.payment_status}; not crediting`);
        return;
    }
    const userId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        console_1.logger.warn("STRIPE", `Session ${session.id} has no userId metadata; ignoring`);
        return;
    }
    const user = await db_1.models.user.findByPk(userId);
    if (!user) {
        console_1.logger.error("STRIPE", `Session ${session.id} names unknown user ${userId}`);
        return;
    }
    const stripe = (0, utils_2.useStripe)();
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const mapped = lineItems.data.map((item) => ({
        description: item.description,
        currency: (item.currency || "").toUpperCase(),
        amount: (0, utils_2.fromStripeAmount)(item.amount_subtotal, item.currency),
    }));
    const depositLine = mapped.find((l) => (l.description || "").toLowerCase() === "deposit") ||
        mapped[0];
    const feeLine = mapped.find((l) => (l.description || "").toLowerCase() === "tax") ||
        mapped[1];
    if (!depositLine) {
        console_1.logger.error("STRIPE", `Session ${session.id} has no deposit line item`);
        return;
    }
    const { currency, amount } = depositLine;
    const fee = (feeLine === null || feeLine === void 0 ? void 0 : feeLine.amount) || 0;
    const grossAmount = amount + fee;
    try {
        await (0, utils_1.processFiatDeposit)({
            userId: String(userId),
            currency,
            amount: grossAmount,
            fee,
            referenceId: session.id,
            method: "STRIPE",
            description: `Deposit of ${amount} ${currency} by Stripe.`,
            idempotencyKey: `stripe_deposit_${session.id}`,
            ctx,
        });
        console_1.logger.success("STRIPE", `Session ${session.id} credited by webhook`);
    }
    catch (error) {
        if (error instanceof wallet_1.DuplicateOperationError) {
            console_1.logger.debug("STRIPE", `Session ${session.id} already credited`);
            return;
        }
        throw error;
    }
}
async function reverseCharge(charge, kind, stripe) {
    const sessionId = await sessionIdForCharge(charge, stripe);
    if (!sessionId)
        return;
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "stripe",
        kind,
        depositReference: sessionId,
        eventReference: String(charge.id),
        reportedAmount: (0, utils_2.fromStripeAmount)(charge.amount_refunded, charge.currency),
        metadata: { chargeId: charge.id, paymentIntent: charge.payment_intent },
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("STRIPE", `[CRITICAL] refund on charge ${charge.id} could not be applied: no wallet. Manual reversal required.`);
    }
}
async function reverseDispute(dispute, stripe) {
    const charge = await stripe.charges.retrieve(String(dispute.charge));
    const sessionId = await sessionIdForCharge(charge, stripe);
    if (!sessionId)
        return;
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "stripe",
        kind: "chargeback",
        depositReference: sessionId,
        eventReference: String(dispute.id),
        reportedAmount: (0, utils_2.fromStripeAmount)(dispute.amount, dispute.currency),
        metadata: { disputeId: dispute.id, chargeId: charge.id, reason: dispute.reason },
        detail: dispute.reason ? `Reason: ${dispute.reason}.` : undefined,
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("STRIPE", `[CRITICAL] dispute ${dispute.id} could not be applied: no wallet. Manual reversal required.`);
    }
}
async function sessionIdForCharge(charge, stripe) {
    var _a, _b;
    const paymentIntent = charge === null || charge === void 0 ? void 0 : charge.payment_intent;
    if (!paymentIntent) {
        console_1.logger.info("STRIPE", `Charge ${charge === null || charge === void 0 ? void 0 : charge.id} has no payment intent; ignoring`);
        return null;
    }
    try {
        const sessions = await stripe.checkout.sessions.list({
            payment_intent: String(paymentIntent),
            limit: 1,
        });
        const sessionId = (_b = (_a = sessions === null || sessions === void 0 ? void 0 : sessions.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
        if (!sessionId) {
            console_1.logger.info("STRIPE", `No checkout session for payment intent ${paymentIntent}; not a deposit from this platform`);
            return null;
        }
        return String(sessionId);
    }
    catch (error) {
        console_1.logger.error("STRIPE", `Failed to resolve session for ${paymentIntent}`, error);
        throw error;
    }
}
