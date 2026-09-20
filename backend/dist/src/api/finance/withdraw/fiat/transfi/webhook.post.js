"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/finance/utils");
const utils_2 = require("@b/api/finance/deposit/fiat/transfi/utils");
const utils_3 = require("./utils");
const dispatch_1 = require("./dispatch");
exports.metadata = {
    summary: "Handles TransFi payout webhook notifications",
    description: "Verifies the TransFi HMAC signature, confirms the payout upstream and settles or fails the withdrawal.",
    operationId: "handleTransfiPayoutWebhook",
    tags: ["Finance", "Withdraw", "TransFi", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "TransFi payout webhook",
    requiresAuth: false,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        eventId: { type: "string" },
                        eventType: { type: "string" },
                        entityId: { type: "string" },
                        status: { type: "string" },
                        order: { type: "object" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Webhook accepted" },
        401: { description: "Signature verification failed" },
        500: query_1.serverErrorResponse,
    },
};
function header(headers, name) {
    if (!headers)
        return undefined;
    const target = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === target)
            return Array.isArray(v) ? v[0] : v;
    }
    return undefined;
}
exports.default = async (data) => {
    const { body, headers, rawBodyString, ctx } = data;
    (0, utils_2.assertTransfiWebhookSecret)();
    const signature = header(headers, utils_2.TRANSFI_SIGNATURE_HEADER);
    const raw = typeof rawBodyString === "string" && rawBodyString.length
        ? rawBodyString
        : JSON.stringify(body !== null && body !== void 0 ? body : {});
    const verification = (0, utils_2.verifyTransfiWebhookSignature)(raw, signature, body);
    if (!verification.valid) {
        console_1.logger.warn("TRANSFI", `payout webhook signature rejected: ${verification.reason}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Signature rejected: ${verification.reason}`);
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid signature" });
    }
    if (verification.variant)
        void (0, utils_2.recordObservedSignatureVariant)(verification.variant);
    const eventId = body === null || body === void 0 ? void 0 : body.eventId;
    const payload = (body === null || body === void 0 ? void 0 : body.order) || body;
    const normalised = (0, utils_2.normaliseOrder)(payload, "payout");
    const orderId = normalised.orderId || (body === null || body === void 0 ? void 0 : body.entityId);
    if (!orderId)
        return { success: true, message: "No order reference; ignored" };
    const partnerId = (payload === null || payload === void 0 ? void 0 : payload.partnerId) || (body === null || body === void 0 ? void 0 : body.partnerId);
    let row = partnerId ? await db_1.models.transaction.findByPk(partnerId) : null;
    if (!row)
        row = await db_1.models.transaction.findOne({ where: { referenceId: orderId } });
    if (!row) {
        console_1.logger.warn("TRANSFI", `payout webhook: no local withdrawal for ${orderId}; acknowledging`);
        return { success: true, message: "Unknown payout; ignored" };
    }
    if (row.type !== "WITHDRAW") {
        console_1.logger.warn("TRANSFI", `payout webhook matched a ${row.type} row; ignoring`);
        return { success: true, message: "Wrong transaction type; ignored" };
    }
    if (["COMPLETED", "FAILED", "REJECTED", "CANCELLED"].includes(row.status)) {
        return { success: true, message: `Already ${row.status}` };
    }
    let meta = {};
    try {
        meta = JSON.parse(row.metadata || "{}");
    }
    catch (_a) {
        meta = {};
    }
    let confirmed;
    try {
        confirmed = await (0, utils_3.getPayoutOrder)(orderId);
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `could not confirm payout ${orderId}: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({ statusCode: 503, message: "Upstream confirmation unavailable" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`TransFi payout ${orderId} is ${confirmed.status}`);
    if (confirmed.onHold) {
        await row.update({
            metadata: JSON.stringify({
                ...meta,
                transfiStatus: confirmed.status,
                complianceHold: true,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
                webhookAt: new Date().toISOString(),
            }),
        });
        return { success: true, message: "Payout under compliance review" };
    }
    if (confirmed.mapped === "COMPLETED") {
        await row.update({
            status: "COMPLETED",
            metadata: JSON.stringify({
                ...meta,
                transfiStatus: confirmed.status,
                settledAmount: confirmed.destinationAmount,
                webhookAt: new Date().toISOString(),
                eventId,
            }),
        });
        try {
            await (0, utils_1.collectWithdrawalFeeOnSettlement)(row);
        }
        catch (error) {
            console_1.logger.error("TRANSFI", `fee booking failed for ${orderId}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi payout ${orderId} settled`);
        return { success: true, message: "Payout settled" };
    }
    if (confirmed.mapped === "FAILED") {
        const reason = confirmed.failureMessage || confirmed.failureCode || `Payout ${confirmed.status}`;
        await row.update({
            referenceId: null,
            metadata: JSON.stringify({
                ...meta,
                transfiOrderId: orderId,
                transfiStatus: confirmed.status,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
                webhookAt: new Date().toISOString(),
                eventId,
            }),
        });
        const refunded = await (0, dispatch_1.refundWithdrawal)(row.id, reason);
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`TransFi payout ${orderId} failed: ${reason} (refunded: ${refunded})`);
        return { success: true, message: refunded ? "Payout failed and refunded" : "Payout failed" };
    }
    await row.update({
        metadata: JSON.stringify({
            ...meta,
            transfiStatus: confirmed.status,
            webhookAt: new Date().toISOString(),
            eventId,
        }),
    });
    return { success: true, message: `Payout ${confirmed.status}` };
};
