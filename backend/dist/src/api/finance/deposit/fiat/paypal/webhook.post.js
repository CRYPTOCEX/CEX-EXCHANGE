"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
const reversal_1 = require("../reversal");
const credit_contract_1 = require("../credit-contract");
const CONFIRM_EVENTS = new Set([
    "PAYMENT.CAPTURE.COMPLETED",
]);
const REVERSAL_EVENTS = {
    "PAYMENT.CAPTURE.REFUNDED": "refund",
    "PAYMENT.CAPTURE.REVERSED": "chargeback",
};
exports.metadata = {
    summary: "PayPal webhook handler",
    description: "Confirms PayPal captures independently of the browser return, and reverses refunds and reversals. Verified against PayPal's signature-verification API.",
    operationId: "paypalWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "PayPal webhook",
    requiresAuth: false,
    requestBody: {
        description: "PayPal event payload",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        event_type: { type: "string" },
                        resource: { type: "object" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Event acknowledged" },
        400: { description: "Signature verification failed" },
        503: { description: "Webhook id not configured" },
    },
};
function paypalApiBase() {
    return process.env.NODE_ENV === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
}
async function accessToken() {
    const id = process.env.NEXT_PUBLIC_APP_PAYPAL_CLIENT_ID || "";
    const secret = process.env.APP_PAYPAL_CLIENT_SECRET || "";
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    if (!response.ok) {
        throw new Error(`PayPal token request failed: ${response.status}`);
    }
    const json = await response.json();
    return json.access_token;
}
exports.default = async (data) => {
    const { body, headers, ctx } = data;
    const webhookId = process.env.APP_PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
        console_1.logger.error("PAYPAL", "Webhook received but APP_PAYPAL_WEBHOOK_ID is not set; refusing");
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "PayPal webhook id is not configured",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying PayPal signature");
    let verified = false;
    try {
        const token = await accessToken();
        const response = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                auth_algo: headers === null || headers === void 0 ? void 0 : headers["paypal-auth-algo"],
                cert_url: headers === null || headers === void 0 ? void 0 : headers["paypal-cert-url"],
                transmission_id: headers === null || headers === void 0 ? void 0 : headers["paypal-transmission-id"],
                transmission_sig: headers === null || headers === void 0 ? void 0 : headers["paypal-transmission-sig"],
                transmission_time: headers === null || headers === void 0 ? void 0 : headers["paypal-transmission-time"],
                webhook_id: webhookId,
                webhook_event: body,
            }),
        });
        const json = await response.json();
        verified = (json === null || json === void 0 ? void 0 : json.verification_status) === "SUCCESS";
    }
    catch (error) {
        console_1.logger.error("PAYPAL", "Webhook verification request failed", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not verify webhook signature",
        });
    }
    if (!verified) {
        console_1.logger.warn("PAYPAL", `Webhook signature verification failed for ${body === null || body === void 0 ? void 0 : body.id}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature" });
    }
    const eventType = String((body === null || body === void 0 ? void 0 : body.event_type) || "");
    const resource = (body === null || body === void 0 ? void 0 : body.resource) || {};
    console_1.logger.info("PAYPAL", `Webhook: ${eventType} (${body === null || body === void 0 ? void 0 : body.id})`);
    if (CONFIRM_EVENTS.has(eventType)) {
        await confirmCapture(resource, ctx);
        return { received: true };
    }
    const kind = REVERSAL_EVENTS[eventType];
    if (kind) {
        await reverseCapture(resource, kind, eventType);
        return { received: true };
    }
    console_1.logger.debug("PAYPAL", `Ignoring event type ${eventType}`);
    return { received: true };
};
function orderIdFor(resource) {
    var _a, _b;
    const direct = (_b = (_a = resource === null || resource === void 0 ? void 0 : resource.supplementary_data) === null || _a === void 0 ? void 0 : _a.related_ids) === null || _b === void 0 ? void 0 : _b.order_id;
    if (direct)
        return String(direct);
    const up = ((resource === null || resource === void 0 ? void 0 : resource.links) || []).find((l) => (l === null || l === void 0 ? void 0 : l.rel) === "up");
    const match = String((up === null || up === void 0 ? void 0 : up.href) || "").match(/\/checkout\/orders\/([^/?]+)/);
    return match ? match[1] : null;
}
async function confirmCapture(resource, ctx) {
    var _a;
    const orderId = orderIdFor(resource);
    if (!orderId) {
        console_1.logger.warn("PAYPAL", `Capture ${resource === null || resource === void 0 ? void 0 : resource.id} has no resolvable order id`);
        return;
    }
    const pending = await db_1.models.transaction.findOne({
        where: { referenceId: orderId },
    });
    if (!pending) {
        console_1.logger.info("PAYPAL", `Capture for unknown order ${orderId}; ignored`);
        return;
    }
    if (pending.status === "COMPLETED") {
        console_1.logger.debug("PAYPAL", `Order ${orderId} already credited`);
        return;
    }
    const currency = (0, credit_contract_1.resolveDepositCurrency)(pending, ((_a = resource === null || resource === void 0 ? void 0 : resource.amount) === null || _a === void 0 ? void 0 : _a.currency_code) || "USD");
    try {
        await (0, utils_1.processFiatDeposit)({
            userId: pending.userId,
            currency,
            amount: Number(pending.amount),
            fee: Number(pending.fee) || 0,
            referenceId: orderId,
            method: "PAYPAL",
            description: `Deposit of ${pending.amount} ${currency} by PayPal.`,
            idempotencyKey: `paypal_deposit_${orderId}`,
            ctx,
        });
        await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: pending.id } });
        console_1.logger.success("PAYPAL", `Order ${orderId} credited by webhook`);
    }
    catch (error) {
        if (error instanceof wallet_1.DuplicateOperationError) {
            await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: pending.id } });
            console_1.logger.debug("PAYPAL", `Order ${orderId} already credited; row reconciled`);
            return;
        }
        throw error;
    }
}
async function reverseCapture(resource, kind, eventType) {
    var _a, _b;
    var _c;
    const orderId = orderIdFor(resource);
    if (!orderId) {
        console_1.logger.warn("PAYPAL", `${eventType} ${resource === null || resource === void 0 ? void 0 : resource.id} has no resolvable order id`);
        return;
    }
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "paypal",
        kind,
        depositReference: orderId,
        eventReference: String((_c = resource === null || resource === void 0 ? void 0 : resource.id) !== null && _c !== void 0 ? _c : orderId),
        reportedAmount: (_a = resource === null || resource === void 0 ? void 0 : resource.amount) === null || _a === void 0 ? void 0 : _a.value,
        metadata: { eventType, resourceId: resource === null || resource === void 0 ? void 0 : resource.id },
        detail: (_b = resource === null || resource === void 0 ? void 0 : resource.status_details) === null || _b === void 0 ? void 0 : _b.reason,
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("PAYPAL", `[CRITICAL] ${eventType} on order ${orderId} could not be applied: no wallet. Manual reversal required.`);
    }
}
