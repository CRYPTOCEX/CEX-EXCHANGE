"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const settings_1 = require("@b/utils/pool-backing/settings");
const treasury_1 = require("@b/utils/pool-backing/treasury");
const ENGINE_STATE_KEY = "poolBackingEngineState";
const ENGINE_DIRECTIONS = ["eco_to_exchange", "exchange_to_eco", "exchange_convert"];
exports.metadata = {
    summary: "Pool backing: liabilities vs holdings per currency, with the open obligations that explain the gap",
    description: "For every currency the platform owes on SPOT or the exchange holds: the latest reconciliation (L with its parallel-stores breakdown, H, gap, residual, drift, and the ecosystem side per chain with its custody read coverage), the live custody read cache coverage, the per-currency anchor (cap, acknowledged drift), the OPEN and CLAIMED obligations grouped by source (and what awaits conversion), and the settlements in flight or needing review, conversions included. Read-only.",
    operationId: "getPoolBackingSummary",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "view.pool.backing",
    responses: {
        200: {
            description: "Summary retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            settings: { type: "object" },
                            ecosystemInstalled: { type: "boolean" },
                            lastRunAt: { type: "string", nullable: true },
                            currencies: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "currency, reconciliation (liabilitiesSplit, parallelStores, holdingsSplit, ecosystemSplit per chain, waivedObligations), custodyReads per chain, open (bySource, convertible), waived (exchange, ecosystem, rows: recognised losses the residual already subtracts), driftRunStreak (the anchor's live streak against settings.driftRuns), drift, capUsd, thresholdUsd, notes",
                                },
                            },
                            settlements: {
                                type: "array",
                                items: { type: "object", description: "In flight or needing review; conversion rows carry `conversion` (order id, fill)" },
                            },
                            engine: {
                                type: "object",
                                description: "mode, paused, autoConvert, ecosystemInstalled, lastCycleAt, lastRefusals, planningSkipped",
                            },
                            treasury: {
                                type: "object",
                                description: "The settlement reserve's system user and how many currencies it holds",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    var _b, _c, _d, _e;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    await (0, settings_1.ensurePoolBackingSettings)();
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the latest reconciliation per currency");
    const recent = (await db_1.models.poolBackingReconciliation.findAll({
        order: [["at", "DESC"]],
        limit: 2000,
        raw: true,
    }));
    const latest = new Map();
    for (const row of recent) {
        const seen = latest.get(row.currency);
        if (!seen || new Date(row.at).getTime() > new Date(seen.at).getTime())
            latest.set(row.currency, row);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading anchors and open obligations");
    const anchors = (await db_1.models.poolBackingCurrency.findAll({ raw: true }));
    const anchorBy = new Map(anchors.map((a) => [String(a.currency), a]));
    const openRows = (await db_1.models.poolBackingObligation.findAll({
        where: { status: ["OPEN", "CLAIMED"] },
        attributes: ["currency", "side", "source", "status", "amount", "nettable", "chain"],
        raw: true,
    }));
    const openBy = new Map();
    for (const r of openRows) {
        let agg = openBy.get(r.currency);
        if (!agg) {
            agg = emptyOpen();
            openBy.set(r.currency, agg);
        }
        const amount = Number(r.amount) || 0;
        if (r.side === "both" || r.side === "exchange")
            agg.exchange += amount;
        if (r.side === "both" || r.side === "ecosystem")
            agg.ecosystem += amount;
        if (r.nettable)
            agg.nettable += amount;
        agg.bySource[r.source] = ((_b = agg.bySource[r.source]) !== null && _b !== void 0 ? _b : 0) + amount;
        agg.rows += 1;
        if (r.source === "conversion" && r.side === "exchange" && r.status === "OPEN" && amount > 0)
            agg.convertible += amount;
    }
    const waivedRows = (await db_1.models.poolBackingObligation.findAll({
        where: { status: "WAIVED" },
        attributes: ["currency", "side", "amount"],
        raw: true,
    }));
    const waivedBy = new Map();
    for (const r of waivedRows) {
        let agg = waivedBy.get(r.currency);
        if (!agg) {
            agg = emptyWaived();
            waivedBy.set(r.currency, agg);
        }
        const amount = Number(r.amount) || 0;
        if (r.side === "both" || r.side === "exchange")
            agg.exchange += amount;
        if (r.side === "both" || r.side === "ecosystem")
            agg.ecosystem += amount;
        agg.rows += 1;
    }
    const inFlight = (await db_1.models.poolBackingSettlement.findAll({
        where: { status: ["PLANNED", "DISPATCHED", "CONFIRMED", "NEEDS_REVIEW"] },
        order: [["createdAt", "DESC"]],
        raw: true,
    }));
    const settlements = inFlight.map(shapeSettlement).sort((a, b) => time(b.createdAt) - time(a.createdAt));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading the custody read cache, the engine state and the treasury");
    const custodyCoverage = await readCustodyCoverage();
    const engineState = await readEngineState();
    const lastSettlementAt = (engineState === null || engineState === void 0 ? void 0 : engineState.lastCycleAt) ? null : await newestSettlementAt();
    const treasuryCurrencies = await db_1.models.wallet.count({
        where: { userId: treasury_1.POOL_BACKING_TREASURY_USER_ID, type: "ECO" },
    });
    let ecosystemInstalled = false;
    try {
        const extensions = await cache_1.CacheManager.getInstance().getExtensions();
        ecosystemInstalled = extensions.has("ecosystem");
    }
    catch (_f) {
        ecosystemInstalled = false;
    }
    const currencies = new Set([...latest.keys(), ...anchorBy.keys(), ...openBy.keys(), ...waivedBy.keys()]);
    const rows = [...currencies].sort().map((currency) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const rec = (_a = latest.get(currency)) !== null && _a !== void 0 ? _a : null;
        const anchor = (_b = anchorBy.get(currency)) !== null && _b !== void 0 ? _b : null;
        const open = (_c = openBy.get(currency)) !== null && _c !== void 0 ? _c : emptyOpen();
        const drift = (anchor === null || anchor === void 0 ? void 0 : anchor.drift) == null ? null : Number(anchor.drift);
        const acknowledged = drift != null &&
            (anchor === null || anchor === void 0 ? void 0 : anchor.driftAcknowledgedAmount) != null &&
            Math.abs(Number(anchor.driftAcknowledgedAmount)) >= Math.abs(drift) - 1e-12;
        const liabilitiesSplit = rec ? parseJson(rec.liabilitiesSplit) : null;
        return {
            currency,
            reconciliation: rec
                ? {
                    at: rec.at,
                    status: rec.status,
                    liabilities: Number(rec.liabilities),
                    liabilitiesSplit,
                    parallelStores: shapeParallelStores(liabilitiesSplit === null || liabilitiesSplit === void 0 ? void 0 : liabilitiesSplit.parallelStores),
                    holdings: rec.holdings == null ? null : Number(rec.holdings),
                    holdingsSplit: parseJson(rec.holdingsSplit),
                    ecosystemSplit: shapeEcosystemSplit(parseJson(rec.ecosystemSplit)),
                    ecosystemError: typeof rec.ecosystemError === "string" && rec.ecosystemError ? rec.ecosystemError : null,
                    inFlight: Number(rec.inFlight) || 0,
                    gap: rec.gap == null ? null : Number(rec.gap),
                    openObligations: Number(rec.openObligations) || 0,
                    residual: rec.residual == null ? null : Number(rec.residual),
                    driftRunStreak: Number(rec.driftRunStreak) || 0,
                    waivedObligations: Number(liabilitiesSplit === null || liabilitiesSplit === void 0 ? void 0 : liabilitiesSplit.waivedObligations) || 0,
                }
                : null,
            custodyReads: (_d = custodyCoverage.get(currency)) !== null && _d !== void 0 ? _d : null,
            open,
            waived: (_e = waivedBy.get(currency)) !== null && _e !== void 0 ? _e : emptyWaived(),
            driftRunStreak: (anchor === null || anchor === void 0 ? void 0 : anchor.residualStreak) != null ? Number(anchor.residualStreak) || 0 : rec ? Number(rec.driftRunStreak) || 0 : 0,
            drift: {
                amount: drift,
                firstSeenAt: (_f = anchor === null || anchor === void 0 ? void 0 : anchor.driftFirstSeenAt) !== null && _f !== void 0 ? _f : null,
                acknowledged,
                acknowledgedAt: (_g = anchor === null || anchor === void 0 ? void 0 : anchor.driftAcknowledgedAt) !== null && _g !== void 0 ? _g : null,
                acknowledgedAmount: (anchor === null || anchor === void 0 ? void 0 : anchor.driftAcknowledgedAmount) == null ? null : Number(anchor.driftAcknowledgedAmount),
            },
            capUsd: (anchor === null || anchor === void 0 ? void 0 : anchor.capUsd) == null ? null : Number(anchor.capUsd),
            thresholdUsd: (anchor === null || anchor === void 0 ? void 0 : anchor.thresholdUsd) == null ? null : Number(anchor.thresholdUsd),
            notes: (_h = anchor === null || anchor === void 0 ? void 0 : anchor.notes) !== null && _h !== void 0 ? _h : null,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Pool backing summary: ${rows.length} currencies`);
    return {
        settings,
        ecosystemInstalled,
        lastRunAt: (_c = (_a = recent[0]) === null || _a === void 0 ? void 0 : _a.at) !== null && _c !== void 0 ? _c : null,
        currencies: rows,
        settlements,
        engine: {
            mode: settings.mode,
            paused: settings.paused,
            autoConvert: settings.autoConvert === true,
            ecosystemInstalled,
            lastCycleAt: (_e = (_d = engineState === null || engineState === void 0 ? void 0 : engineState.lastCycleAt) !== null && _d !== void 0 ? _d : lastSettlementAt) !== null && _e !== void 0 ? _e : null,
            lastCycleSource: (engineState === null || engineState === void 0 ? void 0 : engineState.lastCycleAt) ? "engine" : lastSettlementAt ? "settlements" : null,
            lastRefusals: Array.isArray(engineState === null || engineState === void 0 ? void 0 : engineState.lastRefusals) ? engineState.lastRefusals : [],
            planningSkipped: typeof (engineState === null || engineState === void 0 ? void 0 : engineState.planningSkipped) === "string" && engineState.planningSkipped ? engineState.planningSkipped : null,
        },
        treasury: {
            userId: treasury_1.POOL_BACKING_TREASURY_USER_ID,
            email: treasury_1.POOL_BACKING_TREASURY_EMAIL,
            currencies: Number(treasuryCurrencies) || 0,
        },
    };
};
function emptyOpen() {
    return { exchange: 0, ecosystem: 0, nettable: 0, bySource: {}, rows: 0, convertible: 0 };
}
function emptyWaived() {
    return { exchange: 0, ecosystem: 0, rows: 0 };
}
function shapeSettlement(s) {
    var _a, _b;
    const proof = parseJson(s.proof);
    return {
        ...s,
        amountRequested: Number(s.amountRequested) || 0,
        amountSent: s.amountSent == null ? null : Number(s.amountSent),
        amountReceived: s.amountReceived == null ? null : Number(s.amountReceived),
        txid: (_a = s.txid) !== null && _a !== void 0 ? _a : null,
        proof,
        fees: parseJson(s.fees),
        note: (_b = s.note) !== null && _b !== void 0 ? _b : null,
        conversion: String(s.direction) === "exchange_convert" ? shapeConversion(proof) : null,
    };
}
function shapeConversion(proof) {
    const p = proof && typeof proof === "object" ? proof : {};
    const fee = p.fee && typeof p.fee === "object" ? p.fee : null;
    return {
        exchangeOrderId: p.exchangeOrderId == null ? null : String(p.exchangeOrderId),
        symbol: typeof p.symbol === "string" ? p.symbol : null,
        side: typeof p.side === "string" ? p.side : null,
        requested: numberOrNull(p.requested),
        filled: numberOrNull(p.filled),
        cost: numberOrNull(p.cost),
        average: numberOrNull(p.average),
        fee: fee ? { cost: numberOrNull(fee.cost), currency: fee.currency == null ? null : String(fee.currency) } : numberOrNull(p.fee),
    };
}
function shapeParallelStores(value) {
    const v = parseJson(value);
    if (!v || typeof v !== "object")
        return null;
    const num = (k) => Number(v[k]) || 0;
    return {
        copyTrading: num("copyTrading"),
        investment: num("investment"),
        aiInvestment: num("aiInvestment"),
        staking: num("staking"),
        forex: num("forex"),
        fxTrading: num("fxTrading"),
        total: num("total"),
        notes: Array.isArray(v.notes) ? v.notes.filter((n) => typeof n === "string") : [],
    };
}
function shapeEcosystemSplit(value) {
    var _a, _b;
    const v = parseJson(value);
    if (!v || typeof v !== "object" || Array.isArray(v))
        return null;
    const out = {};
    for (const [chain, raw] of Object.entries(v)) {
        if (!raw || typeof raw !== "object")
            continue;
        const status = raw.status === "ok" || raw.status === "partial" || raw.status === "unknown" ? raw.status : "unknown";
        const heByKind = {};
        if (raw.heByKind && typeof raw.heByKind === "object") {
            for (const [kind, n] of Object.entries(raw.heByKind))
                heByKind[kind] = Number(n) || 0;
        }
        out[chain] = {
            le: Number(raw.le) || 0,
            leTreasury: Number(raw.leTreasury) || 0,
            leUnattributed: Number(raw.leUnattributed) || 0,
            he: status === "ok" ? numberOrNull(raw.he) : null,
            heKnown: Number(raw.heKnown) || 0,
            heByKind,
            addressesTotal: Number(raw.addressesTotal) || 0,
            addressesRead: Number(raw.addressesRead) || 0,
            addressesErrored: Number(raw.addressesErrored) || 0,
            oldestReadAt: (_a = raw.oldestReadAt) !== null && _a !== void 0 ? _a : null,
            newestReadAt: (_b = raw.newestReadAt) !== null && _b !== void 0 ? _b : null,
            gapE: numberOrNull(raw.gapE),
            status,
            unknownReason: status === "unknown" && typeof raw.unknownReason === "string" && raw.unknownReason ? raw.unknownReason : null,
            mirror: numberOrNull(raw.mirror),
            openObligations: Number(raw.openObligations) || 0,
            waivedObligations: Number(raw.waivedObligations) || 0,
            residual: numberOrNull(raw.residual),
        };
    }
    return Object.keys(out).length ? out : null;
}
async function readCustodyCoverage() {
    var _a, _b;
    const out = new Map();
    const model = db_1.models.poolBackingCustodyRead;
    if (!model || typeof model.findAll !== "function")
        return out;
    try {
        const rows = (await model.findAll({
            attributes: [
                "currency",
                "chain",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "total"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("balance")), "read"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("error")), "errored"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN kind IN ('treasury', 'master') AND error IS NOT NULL THEN 1 ELSE 0 END")), "anchorsErrored"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN source = 'mirror' THEN 1 ELSE 0 END")), "mirrored"],
                [(0, sequelize_1.fn)("MIN", (0, sequelize_1.col)("readAt")), "oldestReadAt"],
                [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("readAt")), "newestReadAt"],
            ],
            group: ["currency", "chain"],
            raw: true,
        }));
        for (const r of rows !== null && rows !== void 0 ? rows : []) {
            const currency = String((_a = r.currency) !== null && _a !== void 0 ? _a : "");
            const chain = String((_b = r.chain) !== null && _b !== void 0 ? _b : "");
            if (!currency || !chain)
                continue;
            const total = Number(r.total) || 0;
            const read = Number(r.read) || 0;
            let perChain = out.get(currency);
            if (!perChain) {
                perChain = {};
                out.set(currency, perChain);
            }
            perChain[chain] = {
                total,
                read,
                neverRead: Math.max(0, total - read),
                errored: Number(r.errored) || 0,
                anchorsErrored: Number(r.anchorsErrored) || 0,
                mirrored: Number(r.mirrored) || 0,
                oldestReadAt: isoOrNull(r.oldestReadAt),
                newestReadAt: isoOrNull(r.newestReadAt),
            };
        }
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Custody read coverage unreadable: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    return out;
}
function isoOrNull(value) {
    if (value == null || value === "")
        return null;
    const t = new Date(value).getTime();
    return Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null;
}
function numberOrNull(value) {
    if (value == null || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function time(value) {
    var _a;
    const n = new Date((_a = value) !== null && _a !== void 0 ? _a : 0).getTime();
    return Number.isFinite(n) ? n : 0;
}
async function readEngineState() {
    try {
        const row = (await db_1.models.settings.findOne({
            where: { key: ENGINE_STATE_KEY },
            attributes: ["value"],
            raw: true,
        }));
        if (!(row === null || row === void 0 ? void 0 : row.value))
            return null;
        let v = row.value;
        for (let pass = 0; pass < 2 && typeof v === "string"; pass++)
            v = JSON.parse(v);
        return v && typeof v === "object" ? v : null;
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Engine state unreadable: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
async function newestSettlementAt() {
    var _a;
    const rows = (await db_1.models.poolBackingSettlement.findAll({
        where: { direction: ENGINE_DIRECTIONS },
        attributes: ["createdAt", "updatedAt"],
        order: [["updatedAt", "DESC"]],
        limit: 1,
        raw: true,
    }));
    let best = 0;
    for (const r of rows)
        best = Math.max(best, time((_a = r.updatedAt) !== null && _a !== void 0 ? _a : r.createdAt));
    return best ? new Date(best).toISOString() : null;
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
