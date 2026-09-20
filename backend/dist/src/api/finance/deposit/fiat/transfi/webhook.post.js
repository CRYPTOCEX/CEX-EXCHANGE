"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/finance/utils");
const utils_2 = require("./utils");
exports.metadata = {
    summary: "Handles TransFi webhook notifications",
    description: "Verifies the TransFi HMAC signature, confirms the order upstream and credits the user's wallet.",
    operationId: "handleTransfiWebhook",
    tags: ["Finance", "Deposit", "TransFi", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "TransFi webhook",
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
        200: {
            description: "Webhook accepted",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { success: { type: "boolean" }, message: { type: "string" } },
                    },
                },
            },
        },
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
    var _a;
    const { body, headers, rawBodyString, ctx } = data;
    (0, utils_2.assertTransfiWebhookSecret)();
    const signature = header(headers, utils_2.TRANSFI_SIGNATURE_HEADER);
    const raw = typeof rawBodyString === "string" && rawBodyString.length
        ? rawBodyString
        : JSON.stringify(body !== null && body !== void 0 ? body : {});
    const verification = (0, utils_2.verifyTransfiWebhookSignature)(raw, signature, body);
    if (!verification.valid) {
        console_1.logger.warn("TRANSFI", `[transfi] webhook signature rejected: ${verification.reason} (eventId=${(body === null || body === void 0 ? void 0 : body.eventId) || "-"})`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Signature rejected: ${verification.reason}`);
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid signature" });
    }
    if (verification.variant === "python-json-dumps") {
        console_1.logger.warn("TRANSFI", "[transfi] signature matched the json.dumps canonicalization, not raw bytes. " +
            "Set APP_TRANSFI_SIGNATURE_VARIANT=python to pin this.");
    }
    if (verification.variant)
        void (0, utils_2.recordObservedSignatureVariant)(verification.variant);
    const eventId = body === null || body === void 0 ? void 0 : body.eventId;
    const orderPayload = (body === null || body === void 0 ? void 0 : body.order) || body;
    const normalised = (0, utils_2.normaliseOrder)(orderPayload, (body === null || body === void 0 ? void 0 : body.orderType) || (orderPayload === null || orderPayload === void 0 ? void 0 : orderPayload.orderType));
    const orderId = normalised.orderId || (body === null || body === void 0 ? void 0 : body.entityId);
    if (!orderId) {
        console_1.logger.warn("TRANSFI", "webhook carried no order id; acknowledging");
        return { success: true, message: "No order reference; ignored" };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`TransFi webhook for order ${orderId} (${normalised.status})`);
    if (eventId) {
        const seen = await db_1.models.transaction.findOne({
            where: { referenceId: `TFE-${eventId}` },
        });
        if (seen) {
            return { success: true, message: "Duplicate event; already processed" };
        }
    }
    const partnerId = (orderPayload === null || orderPayload === void 0 ? void 0 : orderPayload.partnerId) || (body === null || body === void 0 ? void 0 : body.partnerId);
    let transaction = partnerId ? await db_1.models.transaction.findByPk(partnerId) : null;
    if (!transaction) {
        const candidates = await db_1.models.transaction.findAll({
            where: { type: "DEPOSIT", status: "PENDING" },
            order: [["createdAt", "DESC"]],
            limit: 500,
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
    if (!transaction) {
        console_1.logger.warn("TRANSFI", `no local transaction for order ${orderId}; acknowledging`);
        return { success: true, message: "Unknown order; ignored" };
    }
    let existingMetadata = {};
    try {
        existingMetadata = JSON.parse(transaction.metadata || "{}");
    }
    catch (_b) {
        existingMetadata = {};
    }
    let confirmed = normalised;
    try {
        confirmed = await (0, utils_2.getOrder)(orderId);
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `[transfi] could not confirm order ${orderId} upstream (${error === null || error === void 0 ? void 0 : error.message}); ` +
            "refusing to act on the webhook body alone");
        throw (0, error_1.createError)({ statusCode: 503, message: "Upstream confirmation unavailable" });
    }
    const currency = existingMetadata.currency || confirmed.destinationCurrency || "";
    if (!currency) {
        console_1.logger.error("TRANSFI", `order ${orderId} has no resolvable currency; acknowledging`);
        return { success: true, message: "No currency; ignored" };
    }
    if (existingMetadata.currency && confirmed.destinationCurrency &&
        String(existingMetadata.currency).toUpperCase() !== String(confirmed.destinationCurrency).toUpperCase()) {
        console_1.logger.error("TRANSFI", `order ${orderId} currency mismatch: local=${existingMetadata.currency}, provider=${confirmed.destinationCurrency}`);
        throw (0, error_1.createError)({ statusCode: 409, message: "TransFi order currency mismatch" });
    }
    if (["COMPLETED", "FAILED", "REJECTED", "CANCELLED"].includes(transaction.status)) {
        return { success: true, message: `Already ${transaction.status}` };
    }
    if (confirmed.onHold) {
        await transaction.update({
            metadata: JSON.stringify({
                ...existingMetadata,
                transfiStatus: confirmed.status,
                complianceHold: true,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
                webhookAt: new Date().toISOString(),
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Order ${orderId} is under compliance review`);
        return { success: true, message: "Order under compliance review" };
    }
    if (confirmed.mapped === "COMPLETED") {
        const settled = (_a = confirmed.destinationAmount) !== null && _a !== void 0 ? _a : transaction.amount;
        const platformFee = Number(transaction.fee) || 0;
        let alreadyCredited = false;
        try {
            await (0, utils_1.processFiatDeposit)({
                userId: transaction.userId,
                currency,
                amount: settled,
                fee: platformFee,
                referenceId: eventId ? `TFE-${eventId}` : `TFO-${orderId}`,
                method: "TRANSFI",
                description: `TransFi deposit of ${settled} ${currency}`,
                metadata: {
                    transfiOrderId: orderId,
                    transfiStatus: confirmed.status,
                    requestedAmount: transaction.amount,
                    settledAmount: settled,
                    source: "webhook",
                },
                idempotencyKey: `transfi_deposit_${orderId}`,
            });
        }
        catch (error) {
            if (error instanceof wallet_1.DuplicateOperationError) {
                alreadyCredited = true;
                console_1.logger.info("TRANSFI", `order ${orderId} already credited (idempotency hit)`);
            }
            else {
                throw error;
            }
        }
        await transaction.update({
            status: "COMPLETED",
            amount: settled,
            metadata: JSON.stringify({
                ...existingMetadata,
                transfiStatus: confirmed.status,
                settledAmount: settled,
                requestedAmount: transaction.amount,
                alreadyCredited,
                webhookAt: new Date().toISOString(),
                eventId,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi deposit ${orderId} credited: ${settled} ${currency}`);
        return { success: true, message: "Deposit credited" };
    }
    if (confirmed.mapped === "FAILED") {
        await transaction.update({
            status: "FAILED",
            metadata: JSON.stringify({
                ...existingMetadata,
                transfiStatus: confirmed.status,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
                webhookAt: new Date().toISOString(),
                eventId,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`TransFi deposit ${orderId} failed: ${confirmed.failureCode || confirmed.status}`);
        return { success: true, message: "Deposit marked failed" };
    }
    await transaction.update({
        metadata: JSON.stringify({
            ...existingMetadata,
            transfiStatus: confirmed.status,
            webhookAt: new Date().toISOString(),
            eventId,
        }),
    });
    return { success: true, message: `Order ${confirmed.status}` };
};
