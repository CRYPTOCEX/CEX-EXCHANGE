"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const ledger_1 = require("@b/utils/pool-backing/ledger");
const exchange_io_1 = require("@b/utils/pool-backing/exchange-io");
exports.metadata = {
    summary: "Attaches the on-chain txid to a settlement that has none",
    description: "For a DISPATCHED or NEEDS_REVIEW settlement without a txid: records the hash on the row and in its proof, sets the status back to DISPATCHED so the verifier resumes, and re-takes the currency's in-flight lock. Refused when the row already carries a txid, when another settlement holds that hash, or when another settlement of the same currency and direction is in flight.",
    operationId: "attachPoolBackingSettlementTxid",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Attach txid to pool-backing settlement",
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
                        txid: { type: "string", description: "The transaction hash as the chain or the exchange shows it" },
                    },
                    required: ["txid"],
                },
            },
        },
    },
    responses: {
        200: { description: "Attached; the settlement is DISPATCHED again" },
        400: { description: "Not attachable" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Settlement"),
        409: { description: "Another settlement holds the hash or the in-flight lock" },
        500: query_1.serverErrorResponse,
    },
};
const ATTACHABLE = new Set(["DISPATCHED", "NEEDS_REVIEW"]);
const NEVER_BROADCAST = new Set(["FAILED", "CANCELLED"]);
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const raw = typeof (body === null || body === void 0 ? void 0 : body.txid) === "string" ? body.txid.trim() : "";
    const txid = (0, exchange_io_1.normaliseTxid)(raw);
    if (!txid)
        throw (0, error_1.createError)({ statusCode: 400, message: "txid is required" });
    if (txid.length > 191)
        throw (0, error_1.createError)({ statusCode: 400, message: "txid is too long to be a transaction hash" });
    const existing = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: "Settlement not found" });
    assertAttachable(existing);
    const holders = (await db_1.models.poolBackingSettlement.findAll({
        where: { txid: txid === raw ? txid : [txid, raw] },
        attributes: ["id", "status"],
        raw: true,
    }));
    const other = holders.find((h) => String(h.id) !== id && !NEVER_BROADCAST.has(String(h.status)));
    if (other) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `Transaction ${txid} already belongs to settlement ${other.id} (${other.status})`,
        });
    }
    const currency = String(existing.currency);
    const direction = String(existing.direction);
    const activeKey = `${currency}|${direction}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Attaching txid ${txid} to settlement ${id}`);
    try {
        await db_1.sequelize.transaction(async (t) => {
            await (0, ledger_1.withCurrencyAnchor)(currency, t);
            const row = await db_1.models.poolBackingSettlement.findOne({
                where: { id },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!row)
                throw (0, error_1.createError)({ statusCode: 404, message: "Settlement not found" });
            assertAttachable(row);
            if (row.activeKey !== activeKey) {
                const inFlight = await db_1.models.poolBackingSettlement.findOne({
                    where: { activeKey },
                    attributes: ["id", "status"],
                    transaction: t,
                });
                if (inFlight && String(inFlight.id) !== id) {
                    throw (0, error_1.createError)({
                        statusCode: 409,
                        message: `A ${direction} settlement for ${currency} is already in flight (${inFlight.id}, ${inFlight.status}); resolve it before re-activating this one`,
                    });
                }
            }
            const proof = proofOf(row);
            await row.update({
                txid,
                status: "DISPATCHED",
                activeKey,
                proof: {
                    ...proof,
                    txid,
                    ...(raw !== txid ? { txidRaw: raw } : {}),
                    txidAttachedBy: user.id,
                    txidAttachedAt: new Date().toISOString(),
                },
            }, { transaction: t });
        });
    }
    catch (error) {
        if (error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `A ${direction} settlement for ${currency} is already in flight; resolve it before re-activating this one`,
            });
        }
        throw error;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`txid ${txid} attached to settlement ${id}; the verifier resumes`);
    return {
        message: `Transaction ${txid} attached; the settlement is DISPATCHED again and the verifier will confirm its arrival`,
        settlement: { id, status: "DISPATCHED", txid, activeKey },
    };
};
function assertAttachable(row) {
    var _a;
    if (String(row.direction) === "external") {
        throw (0, error_1.createError)({ statusCode: 400, message: "An external (hand-recorded) settlement has no engine movement to attach a txid to" });
    }
    if (String(row.direction) === "exchange_convert") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "An exchange conversion is a market order on the venue, not a chain transaction; there is no txid to attach. Mark it arrived with the order's fill, or mark it failed",
        });
    }
    if (!ATTACHABLE.has(String(row.status))) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Only a DISPATCHED or NEEDS_REVIEW settlement can have a txid attached; this one is ${row.status}`,
        });
    }
    const have = (_a = (0, exchange_io_1.normaliseTxid)(row.txid)) !== null && _a !== void 0 ? _a : (0, exchange_io_1.normaliseTxid)(proofOf(row).txid);
    if (have) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `This settlement already carries txid ${have}; mark it arrived or failed instead`,
        });
    }
}
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
