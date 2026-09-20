"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const settings_1 = require("@b/utils/pool-backing/settings");
const engine_1 = require("@b/utils/pool-backing/engine");
exports.metadata = {
    summary: "Marks a settlement as arrived on the operator's own evidence",
    description: "For a NEEDS_REVIEW, DISPATCHED or CONFIRMED settlement: settles it with the amount the operator saw arrive and the proof they saw it by. The claimed obligations become SETTLED, the in-flight lock is released, and the difference to the requested amount is booked as recognised loss — all inside one transaction. Refused while the engine is paused.",
    operationId: "markPoolBackingSettlementArrived",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Mark pool-backing settlement arrived",
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
                        amountReceived: { type: "number", description: "What arrived on the receiving side, after the venue's fee" },
                        proof: {
                            type: "object",
                            description: "exchangeDepositId, txid, explorer link, note — whatever the operator saw the arrival by",
                        },
                    },
                    required: ["amountReceived", "proof"],
                },
            },
        },
    },
    responses: {
        200: { description: "Settled" },
        400: { description: "Not markable" },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Settlement"),
        409: { description: "The engine is paused, or declined to settle" },
        500: query_1.serverErrorResponse,
    },
};
const MARKABLE = new Set(["NEEDS_REVIEW", "DISPATCHED", "CONFIRMED"]);
exports.default = async (data) => {
    var _a, _b;
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const amountReceived = Number(body === null || body === void 0 ? void 0 : body.amountReceived);
    if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "amountReceived must be a positive number" });
    }
    const proof = (body === null || body === void 0 ? void 0 : body.proof) && typeof body.proof === "object" && !Array.isArray(body.proof) ? body.proof : null;
    if (!proof || !Object.values(proof).some((v) => typeof v === "string" && v.trim())) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "proof must carry at least one reference (exchange deposit id, txid, explorer link or note) the arrival was seen by",
        });
    }
    const existing = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: "Settlement not found" });
    const status = String(existing.status);
    if (String(existing.direction) === "external") {
        throw (0, error_1.createError)({ statusCode: 400, message: "An external (hand-recorded) settlement was recorded as arrived when it was created" });
    }
    if (!MARKABLE.has(status)) {
        if (status === "SETTLED")
            throw (0, error_1.createError)({ statusCode: 400, message: "This settlement is already SETTLED" });
        if (status === "PLANNED") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Nothing has been dispatched for this settlement yet, so nothing can have arrived; wait for the engine or mark it failed",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Only a NEEDS_REVIEW, DISPATCHED or CONFIRMED settlement can be marked arrived; this one is ${status}`,
        });
    }
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.paused) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "The pool-backing engine is paused (poolBackingPause); nothing flips to SETTLED while it is. Resume it, then mark the arrival",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Marking settlement ${id} arrived with ${amountReceived} ${existing.currency}`);
    await (0, engine_1.completeSettlement)(id, {
        amountReceived,
        evidence: { ...proof, markedArrivedBy: user.id, markedArrivedAt: new Date().toISOString() },
        actor: user.id,
    });
    const after = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!after || String(after.status) !== "SETTLED") {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `The engine did not settle ${id} (status ${(_a = after === null || after === void 0 ? void 0 : after.status) !== null && _a !== void 0 ? _a : "unknown"}); it may have been paused. Reload and try again`,
        });
    }
    const requested = Number(after.amountRequested) || 0;
    const received = after.amountReceived == null ? amountReceived : Number(after.amountReceived);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Settlement ${id} SETTLED on the operator's evidence: ${received} of ${requested} ${after.currency}`);
    return {
        message: received + 1e-12 < requested
            ? `Settled. ${received} ${after.currency} arrived of ${requested} requested; the ${(requested - received).toFixed(8)} shortfall is booked as recognised loss.`
            : `Settled. ${received} ${after.currency} arrived.`,
        settlement: {
            id,
            status: after.status,
            amountRequested: requested,
            amountReceived: received,
            fees: parseJson(after.fees),
            activeKey: (_b = after.activeKey) !== null && _b !== void 0 ? _b : null,
        },
    };
};
function parseJson(value) {
    if (value == null)
        return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch (_a) {
            return null;
        }
    }
    return value;
}
