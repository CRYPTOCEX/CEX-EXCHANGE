"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const settings_1 = require("@b/utils/pool-backing/settings");
const engine_1 = require("@b/utils/pool-backing/engine");
exports.metadata = {
    summary: "Buys a currency the exchange owes but never received, now",
    description: "Runs one conversion cycle for the currency: verifies the settlements in flight and, in manual or auto mode with poolBackingAutoConvert on, claims the currency's exchange-side conversion rows whose C1 leg has settled and places one market order on the exchange for them. Returns the settlement it created or the reason it refused. 409 when the mode is off or monitor, the switch is off, or the engine is paused.",
    operationId: "convertPoolBackingNow",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Convert pool backing now",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string", description: "The currency the exchange owes (C2 of the conversion)" },
                    },
                    required: ["currency"],
                },
            },
        },
    },
    responses: {
        200: { description: "The conversion settlement created, or the refusal reason" },
        400: { description: "Invalid request" },
        401: query_1.unauthorizedResponse,
        409: { description: "The mode, the poolBackingAutoConvert switch or the kill switch forbids converting" },
        500: query_1.serverErrorResponse,
    },
};
const DIRECTION = "exchange_convert";
exports.default = async (data) => {
    var _a;
    var _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").trim().toUpperCase();
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "currency is required" });
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.mode === "off" || settings.mode === "monitor") {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `Pool backing is in ${settings.mode} mode and settles nothing; switch to manual to convert by hand`,
        });
    }
    if (!settings.autoConvert) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "poolBackingAutoConvert is off; the engine places no order on the exchange until it is switched on",
        });
    }
    if (settings.paused) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "The pool-backing engine is paused (poolBackingPause); resume it before converting",
        });
    }
    const startedAt = Date.now();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Running a conversion cycle for ${currency}`);
    const summary = await (0, engine_1.runPoolBackingSettlementCycle)({
        trigger: "admin",
        actorId: user.id,
        only: { currency, direction: DIRECTION },
    });
    if (summary === null || summary === void 0 ? void 0 : summary.skipped) {
        throw (0, error_1.createError)({ statusCode: 409, message: `Conversion skipped: ${summary.skipped}` });
    }
    const settlement = await newestConversionSince(currency, startedAt - 1000);
    const refusal = (_b = refusalFor(summary, currency)) !== null && _b !== void 0 ? _b : (typeof (summary === null || summary === void 0 ? void 0 : summary.planningSkipped) === "string" && summary.planningSkipped ? String(summary.planningSkipped) : null);
    const message = settlement
        ? `Conversion ${settlement.id} ${settlement.status}: ${settlement.amountRequested} ${currency}${((_a = settlement.proof) === null || _a === void 0 ? void 0 : _a.symbol) ? ` via ${settlement.proof.side} on ${settlement.proof.symbol}` : ""}`
        : refusal
            ? `Nothing converted for ${currency}: ${refusal}`
            : `Nothing to convert for ${currency}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(message);
    return { message, settlement, refusal, summary };
};
async function newestConversionSince(currency, sinceMs) {
    var _a, _b, _c;
    const rows = (await db_1.models.poolBackingSettlement.findAll({
        where: { currency, direction: DIRECTION },
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
        amountRequested: Number(row.amountRequested) || 0,
        amountReceived: row.amountReceived == null ? null : Number(row.amountReceived) || 0,
        activeKey: (_a = row.activeKey) !== null && _a !== void 0 ? _a : null,
        proof: parseJson(row.proof),
        fees: parseJson(row.fees),
        note: (_b = row.note) !== null && _b !== void 0 ? _b : null,
        createdAt: (_c = row.createdAt) !== null && _c !== void 0 ? _c : null,
    };
}
function refusalFor(summary, currency) {
    var _a, _b;
    const refusals = summary === null || summary === void 0 ? void 0 : summary.refusals;
    if (!Array.isArray(refusals))
        return null;
    const hit = refusals.find((r) => { var _a, _b; return String((_a = r === null || r === void 0 ? void 0 : r.currency) !== null && _a !== void 0 ? _a : "").toUpperCase() === currency && String((_b = r === null || r === void 0 ? void 0 : r.direction) !== null && _b !== void 0 ? _b : "") === DIRECTION; });
    if (!hit)
        return null;
    return String((_b = (_a = hit.reason) !== null && _a !== void 0 ? _a : hit.message) !== null && _b !== void 0 ? _b : JSON.stringify(hit));
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
