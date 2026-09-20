"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const exchange_io_1 = require("@b/utils/pool-backing/exchange-io");
const engine_1 = require("@b/utils/pool-backing/engine");
exports.metadata = {
    summary: "Fails a settlement and returns its obligations to OPEN",
    description: "Marks a PLANNED, DISPATCHED, CONFIRMED or NEEDS_REVIEW settlement FAILED with a mandatory reason: its claimed obligations return to OPEN and the in-flight lock is released. Refused on SETTLED, and on a PLANNED row whose dispatch has started (wait for DISPATCHED or NEEDS_REVIEW). A row on which the coins may have moved — a txid on the row, an exchange withdrawal the exchange accepted, reported COMPLETED or may have accepted (indeterminate), a dispatch that started and was parked without a hash, or an exchange conversion order the venue accepted or may have accepted (an order id, a client order id, or an indeterminate request) — is refused unless confirmNotBroadcast is true, because FAILED also stops the deposit guard protecting the hash and the next cycle ships the same coins (or places the same order) again.",
    operationId: "markPoolBackingSettlementFailed",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "manage.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Mark pool-backing settlement failed",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Settlement id" },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Why the movement is known not to have happened (at least 10 characters)" },
                        confirmNotBroadcast: {
                            type: "boolean",
                            description: "Required when the coins may have moved (a txid on the row; an exchange withdrawal accepted, reported COMPLETED or indeterminate; a dispatch that started and was parked without a hash; an exchange conversion order placed, placed under a client id, or indeterminate): the operator verified on the chain or at the exchange that nothing was broadcast, honoured or filled",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Failed; obligations reopened" },
        400: { description: "Not failable" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Settlement"),
        409: { description: "The engine declined" },
        500: query_1.serverErrorResponse,
    },
};
const FAILABLE = new Set(["PLANNED", "DISPATCHED", "CONFIRMED", "NEEDS_REVIEW"]);
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const reason = typeof (body === null || body === void 0 ? void 0 : body.reason) === "string" ? body.reason.trim() : "";
    if (reason.length < 10) {
        throw (0, error_1.createError)({ statusCode: 400, message: "A reason of at least 10 characters is required to fail a settlement" });
    }
    const existing = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: "Settlement not found" });
    const status = String(existing.status);
    if (String(existing.direction) === "external") {
        throw (0, error_1.createError)({ statusCode: 400, message: "An external (hand-recorded) settlement cannot be failed; it records a movement the operator made" });
    }
    if (status === "SETTLED") {
        throw (0, error_1.createError)({ statusCode: 400, message: "A SETTLED settlement cannot be failed: the receiving side's own evidence settled it" });
    }
    if (!FAILABLE.has(status)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Only a PLANNED, DISPATCHED, CONFIRMED or NEEDS_REVIEW settlement can be failed; this one is ${status}` });
    }
    const proof = proofOf(existing);
    const direction = String(existing.direction);
    if (status === "PLANNED" && proof.dispatchStartedAt) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This settlement is mid-dispatch since ${proof.dispatchStartedAt}; wait for it to become DISPATCHED or NEEDS_REVIEW ` +
                `(the engine parks it after 30 minutes), then check the chain or the exchange before failing it`,
        });
    }
    const txid = (_a = (0, exchange_io_1.normaliseTxid)(existing.txid)) !== null && _a !== void 0 ? _a : (0, exchange_io_1.normaliseTxid)(proof.txid);
    const exchangeMayHaveHonoured = direction === "exchange_to_eco" && (status === "CONFIRMED" || !!proof.exchangeWithdrawalId || proof.indeterminate === true);
    const dispatchMayHaveSent = direction === "eco_to_exchange" && status !== "PLANNED" && !!proof.dispatchStartedAt && proof.nothingSent !== true;
    const orderMayHaveFilled = direction === "exchange_convert" &&
        status !== "PLANNED" &&
        (!!proof.exchangeOrderId || proof.indeterminate === true || !!proof.clientOrderId) &&
        proof.nothingSent !== true;
    if ((txid || exchangeMayHaveHonoured || dispatchMayHaveSent || orderMayHaveFilled) && (body === null || body === void 0 ? void 0 : body.confirmNotBroadcast) !== true) {
        const tail = "then resend with confirmNotBroadcast: true";
        if (txid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This settlement carries txid ${txid}. Failing it reopens its obligations and stops the deposit guard protecting that hash, ` +
                    `which is only safe if the transaction never reached the chain. Verify that on the chain or at the exchange, ${tail}`,
            });
        }
        if (exchangeMayHaveHonoured) {
            const what = status === "CONFIRMED"
                ? "reported COMPLETED"
                : proof.exchangeWithdrawalId
                    ? `accepted (id ${proof.exchangeWithdrawalId})`
                    : "may have accepted (the request was indeterminate)";
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This settlement is an exchange withdrawal the exchange ${what}; failing it reopens its obligations and the next cycle withdraws the same amount again. ` +
                    `Verify at the exchange that the withdrawal was refused, cancelled or never created, ${tail}`,
            });
        }
        if (orderMayHaveFilled) {
            const what = proof.exchangeOrderId
                ? `accepted (order ${proof.exchangeOrderId}${proof.symbol ? ` on ${proof.symbol}` : ""})`
                : proof.indeterminate === true
                    ? `may have accepted (the request was indeterminate${proof.clientOrderId ? `; client id ${proof.clientOrderId}` : ""}${proof.symbol ? ` on ${proof.symbol}` : ""})`
                    : `may have accepted under client id ${proof.clientOrderId}${proof.symbol ? ` on ${proof.symbol}` : ""}`;
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This settlement is an exchange conversion order the exchange ${what}; failing it reopens its obligations and the next cycle places the same order again with the pool's funds. ` +
                    `Verify at the exchange that the order was never placed, or was cancelled or rejected with nothing filled, ${tail}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This settlement's dispatch started at ${proof.dispatchStartedAt} and was parked without a hash: the mover may have broadcast before it was interrupted. ` +
                `Check the source address on the chain for a transfer to ${(_b = proof.toAddress) !== null && _b !== void 0 ? _b : "the exchange's deposit address"} around that time, ${tail}`,
        });
    }
    const confirmed = (body === null || body === void 0 ? void 0 : body.confirmNotBroadcast) === true && (txid || exchangeMayHaveHonoured || dispatchMayHaveSent || orderMayHaveFilled);
    const claimedIds = (await db_1.models.poolBackingObligation.findAll({
        where: { settlementId: id, status: "CLAIMED" },
        attributes: ["id"],
        raw: true,
    })).map((r) => String(r.id));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Failing settlement ${id}: ${reason}`);
    await (0, engine_1.failSettlement)(id, {
        reason: confirmed
            ? txid
                ? `${reason} [operator confirmed txid ${txid} was never broadcast]`
                : exchangeMayHaveHonoured
                    ? `${reason} [operator confirmed at the exchange that the withdrawal was not honoured]`
                    : orderMayHaveFilled
                        ? `${reason} [operator confirmed at the exchange that no order filled]`
                        : `${reason} [operator confirmed on the chain that nothing was broadcast]`
            : reason,
        actor: user.id,
    });
    const after = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!after || String(after.status) !== "FAILED") {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `The engine did not fail ${id} (status ${(_c = after === null || after === void 0 ? void 0 : after.status) !== null && _c !== void 0 ? _c : "unknown"}); reload and try again`,
        });
    }
    const reopened = claimedIds.length
        ? await db_1.models.poolBackingObligation.count({ where: { id: claimedIds, status: "OPEN" } })
        : 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Settlement ${id} FAILED; ${reopened} obligation(s) back to OPEN`);
    return {
        message: `Settlement failed. ${reopened} obligation(s) are OPEN again and will be planned in the next cycle.`,
        settlement: { id, status: after.status, activeKey: (_d = after.activeKey) !== null && _d !== void 0 ? _d : null, reopened },
    };
};
function proofOf(row) {
    const p = row === null || row === void 0 ? void 0 : row.proof;
    if (p == null)
        return {};
    if (typeof p === "string") {
        try {
            const parsed = JSON.parse(p);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return typeof p === "object" ? p : {};
}
