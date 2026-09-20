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
const credit_contract_1 = require("../credit-contract");
exports.metadata = {
    summary: "eWAY webhook handler",
    description: "Confirms eWAY transactions independently of the browser return, and reverses refunds. HMAC-verified against the raw request body; every amount is re-read from the eWAY API rather than from the payload.",
    operationId: "ewayWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "eWAY webhook",
    requiresAuth: false,
    requestBody: {
        description: "eWAY notification payload",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        TransactionID: { type: "string" },
                        EventType: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Notification acknowledged" },
        400: { description: "Signature verification failed" },
        503: { description: "Webhook secret not configured" },
    },
};
function transactionIdFrom(body) {
    var _a, _b, _c;
    const candidates = [
        body === null || body === void 0 ? void 0 : body.TransactionID,
        body === null || body === void 0 ? void 0 : body.TransactionId,
        body === null || body === void 0 ? void 0 : body.transactionID,
        body === null || body === void 0 ? void 0 : body.transactionId,
        (_a = body === null || body === void 0 ? void 0 : body.Transaction) === null || _a === void 0 ? void 0 : _a.TransactionID,
        (_b = body === null || body === void 0 ? void 0 : body.Data) === null || _b === void 0 ? void 0 : _b.TransactionID,
        (_c = body === null || body === void 0 ? void 0 : body.data) === null || _c === void 0 ? void 0 : _c.TransactionID,
    ];
    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
            return String(candidate).trim();
        }
    }
    return null;
}
exports.default = async (data) => {
    var _a, _b;
    var _c, _d, _e, _f;
    const { body, headers, ctx } = data;
    const secret = process.env.APP_EWAY_WEBHOOK_SECRET;
    if (!secret) {
        console_1.logger.error("EWAY", "Webhook received but APP_EWAY_WEBHOOK_SECRET is not set; refusing");
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "eWAY webhook secret is not configured",
        });
    }
    const rawBody = typeof data.rawBodyString === "string" &&
        data.rawBodyString.length
        ? data.rawBodyString
        : JSON.stringify(body);
    const received = String((_d = (_c = headers === null || headers === void 0 ? void 0 : headers["x-eway-signature"]) !== null && _c !== void 0 ? _c : headers === null || headers === void 0 ? void 0 : headers["x-eway-signature-256"]) !== null && _d !== void 0 ? _d : "");
    const valid = (0, utils_2.verifyEwayWebhookSignature)(received, rawBody, secret);
    if (!valid) {
        console_1.logger.warn("EWAY", "Webhook signature verification failed");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid signature" });
    }
    const transactionId = transactionIdFrom(body);
    if (!transactionId) {
        console_1.logger.warn("EWAY", "Webhook carries no transaction id; ignoring");
        return { received: true };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Re-reading the transaction from eWAY");
    let ewayTransaction;
    try {
        const response = await (0, utils_2.makeEwayRequest)(`/Transaction/${transactionId}`, "GET");
        ewayTransaction = (_e = (_a = response === null || response === void 0 ? void 0 : response.Transactions) === null || _a === void 0 ? void 0 : _a[0]) !== null && _e !== void 0 ? _e : response;
    }
    catch (error) {
        console_1.logger.error("EWAY", `Could not read transaction ${transactionId}`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not read the transaction from eWAY",
        });
    }
    if (!ewayTransaction) {
        console_1.logger.warn("EWAY", `eWAY returned no transaction for ${transactionId}`);
        return { received: true };
    }
    const currency = String(ewayTransaction.CurrencyCode || "AUD").toUpperCase();
    const refundedId = (_f = ewayTransaction.OriginalTransactionID) !== null && _f !== void 0 ? _f : (_b = ewayTransaction.TransactionCaptured) === null || _b === void 0 ? void 0 : _b.OriginalTransactionID;
    if (ewayTransaction.TransactionType === "Refund" || refundedId) {
        await reverseTransaction(String(refundedId !== null && refundedId !== void 0 ? refundedId : ""), transactionId, ewayTransaction, currency);
        return { received: true };
    }
    if (ewayTransaction.TransactionStatus === true) {
        await confirmTransaction(transactionId, ewayTransaction, currency, ctx);
    }
    else {
        console_1.logger.debug("EWAY", `Transaction ${transactionId} is not approved (${ewayTransaction.ResponseCode}); nothing credited`);
    }
    return { received: true };
};
async function confirmTransaction(transactionId, ewayTransaction, currency, ctx) {
    var _a;
    var _b;
    const reference = (_b = ewayTransaction.InvoiceReference) !== null && _b !== void 0 ? _b : (_a = ewayTransaction.Customer) === null || _a === void 0 ? void 0 : _a.Reference;
    const pending = await db_1.models.transaction.findOne({
        where: reference
            ? { referenceId: String(reference) }
            : { referenceId: transactionId },
    });
    if (!pending) {
        console_1.logger.info("EWAY", `Approved transaction ${transactionId} matches no pending deposit; ignored`);
        return;
    }
    if (pending.status === "COMPLETED") {
        console_1.logger.debug("EWAY", `Deposit ${reference} already credited`);
        return;
    }
    const depositCurrency = (0, credit_contract_1.resolveDepositCurrency)(pending, currency);
    try {
        await (0, utils_1.processFiatDeposit)({
            userId: pending.userId,
            currency: depositCurrency,
            amount: Number(pending.amount),
            fee: Number(pending.fee) || 0,
            referenceId: transactionId,
            method: "EWAY",
            description: `eWAY deposit - ${pending.amount} ${depositCurrency}`,
            metadata: {
                eway_transaction_id: transactionId,
                eway_authorisation_code: ewayTransaction.AuthorisationCode,
                eway_total: (0, utils_2.ewayFromMinorUnits)(Number(ewayTransaction.TotalAmount) || 0, currency),
            },
            idempotencyKey: `eway_deposit_${transactionId}`,
            ctx,
        });
        await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: pending.id } });
        console_1.logger.success("EWAY", `Transaction ${transactionId} credited by webhook`);
    }
    catch (error) {
        if (error instanceof wallet_1.DuplicateOperationError) {
            await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: pending.id } });
            console_1.logger.debug("EWAY", `Transaction ${transactionId} already credited; row reconciled`);
            return;
        }
        throw error;
    }
}
async function reverseTransaction(originalId, refundId, ewayTransaction, currency) {
    if (!originalId) {
        console_1.logger.warn("EWAY", `Refund ${refundId} names no original transaction; nothing reversed`);
        return;
    }
    const result = await (0, reversal_1.reverseDepositByReference)({
        provider: "eway",
        kind: "refund",
        depositReference: originalId,
        eventReference: refundId,
        reportedAmount: (0, utils_2.ewayFromMinorUnits)(Number(ewayTransaction.TotalAmount) || 0, currency),
        metadata: { ewayRefundId: refundId, ewayOriginalId: originalId },
    });
    if (result.outcome === "no_wallet") {
        console_1.logger.error("EWAY", `[CRITICAL] refund ${refundId} on ${originalId} could not be applied: no wallet. Manual reversal required.`);
    }
}
