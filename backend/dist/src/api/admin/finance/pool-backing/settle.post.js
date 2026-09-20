"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const settings_1 = require("@b/utils/pool-backing/settings");
const engine_1 = require("@b/utils/pool-backing/engine");
exports.metadata = {
    summary: "Runs one settlement cycle for a currency now",
    description: "Verifies the settlements in flight and, in manual or auto mode, plans, claims and dispatches one settlement for the currency under the engine's own rules. Returns the settlement it created or the reason it refused. 409 when the mode is off or monitor, or the engine is paused.",
    operationId: "settlePoolBackingNow",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Settle pool backing now",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string" },
                        direction: {
                            type: "string",
                            enum: ["eco_to_exchange", "exchange_to_eco"],
                            nullable: true,
                            description: "Restrict the plan to one direction; absent = whichever the net obligation calls for",
                        },
                        chain: { type: "string", nullable: true, description: "Restrict the plan to one ecosystem chain" },
                    },
                    required: ["currency"],
                },
            },
        },
    },
    responses: {
        200: { description: "The settlement created, or the refusal reason" },
        400: { description: "Invalid request" },
        401: query_1.unauthorizedResponse,
        409: { description: "The mode or the kill switch forbids settling" },
        500: query_1.serverErrorResponse,
    },
};
const DIRECTIONS = new Set(["eco_to_exchange", "exchange_to_eco"]);
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").trim().toUpperCase();
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "currency is required" });
    const direction = (body === null || body === void 0 ? void 0 : body.direction) == null || body.direction === "" ? undefined : String(body.direction);
    if (direction !== undefined && !DIRECTIONS.has(direction)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "direction must be eco_to_exchange or exchange_to_eco, or absent" });
    }
    const chain = (body === null || body === void 0 ? void 0 : body.chain) == null || String(body.chain).trim() === "" ? undefined : String(body.chain).trim().toUpperCase();
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.mode === "off" || settings.mode === "monitor") {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `Pool backing is in ${settings.mode} mode and settles nothing; switch to manual to settle by hand`,
        });
    }
    if (settings.paused) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "The pool-backing engine is paused (poolBackingPause); resume it before settling",
        });
    }
    const startedAt = Date.now();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Running a settlement cycle for ${currency}${direction ? ` (${direction})` : ""}${chain ? ` on ${chain}` : ""}`);
    const summary = await (0, engine_1.runPoolBackingSettlementCycle)({
        trigger: "admin",
        actorId: user.id,
        only: { currency, ...(direction ? { direction } : {}), ...(chain ? { chain } : {}) },
    });
    if (summary === null || summary === void 0 ? void 0 : summary.skipped) {
        throw (0, error_1.createError)({ statusCode: 409, message: `Settlement skipped: ${summary.skipped}` });
    }
    const settlement = await newestSettlementSince(currency, startedAt - 1000);
    const refusal = (_a = refusalFor(summary, currency)) !== null && _a !== void 0 ? _a : (typeof (summary === null || summary === void 0 ? void 0 : summary.planningSkipped) === "string" && summary.planningSkipped ? String(summary.planningSkipped) : null);
    const message = settlement
        ? `Settlement ${settlement.id} ${settlement.status}: ${settlement.direction} ${settlement.amountRequested} ${currency}${settlement.chain ? ` on ${settlement.chain}` : ""}`
        : refusal
            ? `Nothing settled for ${currency}: ${refusal}`
            : `Nothing to settle for ${currency}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(message);
    return { message, settlement, refusal, summary };
};
async function newestSettlementSince(currency, sinceMs) {
    var _a, _b, _c, _d, _e, _f;
    const rows = (await db_1.models.poolBackingSettlement.findAll({
        where: { currency, direction: ["eco_to_exchange", "exchange_to_eco"] },
        order: [["createdAt", "DESC"]],
        limit: 5,
        raw: true,
    }));
    const fresh = rows
        .filter((r) => { var _a; return new Date((_a = r.createdAt) !== null && _a !== void 0 ? _a : 0).getTime() >= sinceMs; })
        .sort((a, b) => { var _a, _b; return new Date((_a = b.createdAt) !== null && _a !== void 0 ? _a : 0).getTime() - new Date((_b = a.createdAt) !== null && _b !== void 0 ? _b : 0).getTime(); });
    const row = fresh[0];
    if (!row)
        return null;
    return {
        id: row.id,
        status: row.status,
        direction: row.direction,
        chain: (_a = row.chain) !== null && _a !== void 0 ? _a : null,
        network: (_b = row.network) !== null && _b !== void 0 ? _b : null,
        amountRequested: Number(row.amountRequested) || 0,
        txid: (_c = row.txid) !== null && _c !== void 0 ? _c : null,
        activeKey: (_d = row.activeKey) !== null && _d !== void 0 ? _d : null,
        proof: parseJson(row.proof),
        fees: parseJson(row.fees),
        note: (_e = row.note) !== null && _e !== void 0 ? _e : null,
        createdAt: (_f = row.createdAt) !== null && _f !== void 0 ? _f : null,
    };
}
function refusalFor(summary, currency) {
    var _a, _b, _c, _d, _e;
    const refusals = summary === null || summary === void 0 ? void 0 : summary.refusals;
    if (Array.isArray(refusals)) {
        const hit = refusals.find((r) => { var _a; return String((_a = r === null || r === void 0 ? void 0 : r.currency) !== null && _a !== void 0 ? _a : "").toUpperCase() === currency; });
        if (!hit)
            return null;
        return typeof hit === "string" ? hit : String((_b = (_a = hit.reason) !== null && _a !== void 0 ? _a : hit.message) !== null && _b !== void 0 ? _b : JSON.stringify(hit));
    }
    if (refusals && typeof refusals === "object") {
        const value = (_c = refusals[currency]) !== null && _c !== void 0 ? _c : refusals[currency.toLowerCase()];
        if (value == null)
            return null;
        return typeof value === "string" ? value : String((_e = (_d = value.reason) !== null && _d !== void 0 ? _d : value.message) !== null && _e !== void 0 ? _e : JSON.stringify(value));
    }
    return null;
}
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
