"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const intents_1 = require("@b/utils/spot-deposit/intents");
const utils_1 = require("@b/api/finance/deposit/spot/utils");
const utils_2 = require("../utils");
exports.metadata = {
    summary: "Rejects a spot deposit intent, or a pre-intent claim by its own id",
    description: "Closes an intent without crediting: the claim row is FAILED and its hash released so the real sender can submit it again, and the intent becomes CANCELLED (from OPEN) or FAILED. Nothing is credited. An ecosystem-custody intent whose transfer to the exchange is already under way is refused with 409 — closing it would strand a debit the queue will not refund. When the id names no intent but a PENDING pre-intent claim (metadata.review no_intent / no_intent_confirmed), that claim is released the same way.",
    operationId: "rejectSpotDepositIntent",
    tags: ["Admin", "Finance", "Spot Deposit Intents"],
    requiresAuth: true,
    permission: "edit.spot.deposit.intent",
    logModule: "ADMIN_FIN",
    logTitle: "Reject spot deposit intent",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Intent id, or the id of a pre-intent SPOT claim row",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Why this is not being credited AND where the customer's money is, at least 10 characters. Shown to the customer on the intent stream.",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Rejected" },
        400: { description: "Not rejectable" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Spot deposit intent"),
        409: { description: "The intent changed while it was being rejected" },
        500: query_1.serverErrorResponse,
    },
};
const REJECTABLE = new Set(["OPEN", "MATCHED", "SWEEPING", "REVIEW"]);
const LIVE_SWEEP_STATUSES = new Set(["PENDING", "PROCESSING", "COMPLETED"]);
const SWEEP_LOOKUP_LIMIT = 20;
const SWEEP_IN_FLIGHT_STATUSES = new Set(["MATCHED", "SWEEPING"]);
function sweepStillInFlight(intent, status) {
    if (String(intent.mode) !== "ecosystem_custody")
        return false;
    if (!SWEEP_IN_FLIGHT_STATUSES.has(status))
        return false;
    const meta = (0, intents_1.parseIntentMetadata)(intent.metadata);
    return !meta.sweepTxid && !meta.spotClaimTransactionId;
}
async function liveSweepFor(intent) {
    var _a, _b;
    if (String(intent.mode) !== "ecosystem_custody")
        return null;
    if (intent.sweepTransactionId) {
        const row = await db_1.models.transaction.findOne({
            where: { id: String(intent.sweepTransactionId), type: "WITHDRAW" },
        });
        if (row && LIVE_SWEEP_STATUSES.has(String(row.status)))
            return row;
    }
    const rows = (await db_1.models.transaction.findAll({
        where: { userId: String(intent.userId), type: "WITHDRAW" },
        order: [["createdAt", "DESC"]],
        limit: SWEEP_LOOKUP_LIMIT,
    }));
    for (const row of rows) {
        const rowMeta = (_a = (0, utils_1.parseTransactionMetadata)(row.metadata)) !== null && _a !== void 0 ? _a : {};
        if (String((_b = rowMeta.spotSweepIntentId) !== null && _b !== void 0 ? _b : "") !== String(intent.id))
            continue;
        if (LIVE_SWEEP_STATUSES.has(String(row.status)))
            return row;
    }
    return null;
}
function moneyLocation(intent, status) {
    const meta = (0, intents_1.parseIntentMetadata)(intent.metadata);
    if (String(intent.mode) === "ecosystem_custody") {
        if (meta.sweepTxid) {
            return `The sweep ${meta.sweepTxid} is already on chain, so those coins are on the exchange under the platform's account — credit them from the deposit log if they are this customer's.`;
        }
        return "The customer's coins are in their Funding wallet: no transfer to the exchange left the chain for this request.";
    }
    if (status === "OPEN") {
        return "Nothing was submitted against this request.";
    }
    return "Anything already sent is on the exchange under the platform's account; the transaction hash has been released so the real sender can submit it again.";
}
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const reason = typeof (body === null || body === void 0 ? void 0 : body.reason) === "string" ? body.reason.trim() : "";
    if (reason.length < 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A reason of at least 10 characters is required: it has to say where the customer's money is, and the customer is shown it.",
        });
    }
    const intent = await db_1.models.spotDepositIntent.findOne({ where: { id } });
    if (!intent) {
        const claim = await (0, utils_2.findPreIntentClaim)(id);
        if (!claim)
            throw (0, error_1.createError)({ statusCode: 404, message: "Spot deposit intent not found" });
        if (String(claim.status) !== "PENDING") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `A pre-intent claim that is ${claim.status} cannot be rejected: it has already been settled.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Releasing the pre-intent claim's reference");
        const count = await (0, utils_1.releaseDepositReference)(id, "FAILED", `Rejected by admin: ${reason}`);
        if (count === 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This claim changed while it was being rejected. Reload and check its current status.",
            });
        }
        try {
            const { createNotification } = require("@b/utils/notifications");
            await createNotification({
                userId: String(claim.userId),
                relatedId: String(claim.id),
                type: "system",
                title: "Deposit not credited",
                message: reason,
                link: "/finance/history",
                actions: [{ label: "View", link: "/finance/history", primary: true }],
            });
        }
        catch (error) {
            console_1.logger.warn("SPOT_DEPOSIT", `Customer ${claim.userId} not notified of the rejected claim ${id}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Pre-intent spot deposit claim rejected");
        return {
            message: "Claim rejected; nothing was credited. Anything already sent is on the exchange under the platform's account; the transaction hash has been released so the real sender can submit it again.",
            releasedReferences: [{ id, released: true }],
            intent: null,
            transactionId: id,
        };
    }
    const status = String(intent.status);
    if (!REJECTABLE.has(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `An intent that is ${status} cannot be rejected.`,
        });
    }
    const live = sweepStillInFlight(intent, status) ? await liveSweepFor(intent) : null;
    if (live) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `This deposit's transfer to the exchange is already under way (withdrawal ${live.id}, ${live.status}): the customer's Funding wallet has been debited and the coins are moving. ` +
                "Wait for it to be broadcast — the deposit then credits on its own — or to fail, which refunds the customer and leaves the intent FAILED where the resweep door applies.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Releasing the deposit reference");
    const released = [];
    for (const row of await findClaimRows(intent)) {
        const count = await (0, utils_1.releaseDepositReference)(String(row.id), status === "OPEN" ? "CANCELLED" : "FAILED", `Rejected by admin: ${reason}`);
        released.push({ id: String(row.id), released: count > 0 });
        if (count === 0) {
            console_1.logger.warn("SPOT_DEPOSIT", `Claim row ${row.id} for intent ${id} was not PENDING; its reference was left in place`);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Closing the intent");
    const patch = {
        reason,
        metadata: { rejectedBy: String(user.id), rejectedAt: new Date().toISOString(), rejectReason: reason },
        broadcast: { message: reason },
    };
    const closed = status === "OPEN"
        ? await (0, intents_1.markCancelled)(id, { metadata: { ...patch.metadata, failure: reason }, broadcast: patch.broadcast })
        : await (0, intents_1.markFailed)(id, patch);
    if (!closed) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This intent changed while it was being rejected. Reload and check its current status.",
        });
    }
    const appeared = sweepStillInFlight(closed, status) ? await liveSweepFor(closed) : null;
    if (appeared) {
        await (0, intents_1.markSweeping)(id, {
            sweepTransactionId: String(appeared.id),
            metadata: { rejectRacedSweepAt: new Date().toISOString() },
            broadcast: { message: "Moving your deposit to Spot" },
        });
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `The transfer to the exchange (withdrawal ${appeared.id}) started while this was being rejected, so the intent has been put back to SWEEPING. ` +
                "Wait for it to broadcast or fail, then reject if it is still needed.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Spot deposit intent rejected");
    return {
        message: `Intent rejected; nothing was credited. ${moneyLocation(closed, status)}`,
        releasedReferences: released,
        intent: (0, intents_1.serialiseIntent)(closed),
    };
};
async function findClaimRows(intent) {
    const out = new Map();
    if (intent.spotTransactionId) {
        const byId = await db_1.models.transaction.findOne({
            where: { id: String(intent.spotTransactionId), type: "DEPOSIT" },
        });
        if (byId)
            out.set(String(byId.id), byId);
    }
    if (intent.claimedTxid) {
        const byRef = await db_1.models.transaction.findOne({
            where: { referenceId: String(intent.claimedTxid), type: "DEPOSIT" },
        });
        if (byRef)
            out.set(String(byRef.id), byRef);
    }
    return [...out.values()];
}
