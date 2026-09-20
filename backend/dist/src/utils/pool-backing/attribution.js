"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARALLEL_STORE_CANCELLED_REASON = exports.MAX_ATTRIBUTION_DAYS = exports.POOL_BACKING_ATTRIBUTED_THROUGH_KEY = void 0;
exports.parseMetadata = parseMetadata;
exports.counterWalletIds = counterWalletIds;
exports.deriveMinted = deriveMinted;
exports.utcDay = utcDay;
exports.addDays = addDays;
exports.daysToAttribute = daysToAttribute;
exports.retireParallelStoreRows = retireParallelStoreRows;
exports.attributeDays = attributeDays;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
exports.POOL_BACKING_ATTRIBUTED_THROUGH_KEY = "poolBackingAttributedThrough";
exports.MAX_ATTRIBUTION_DAYS = 30;
const TOLERANCE = 1e-8;
const PAYOUT_OPS = new Set([
    "INVESTMENT_ROI",
    "AI_INVESTMENT_ROI",
    "FOREX_INVESTMENT_ROI",
    "STAKING_REWARD",
    "REFERRAL_REWARD",
    "BINARY_ORDER_WIN",
    "BINARY_ORDER_LOSS",
    "PLATFORM_LOSS",
    "MARKETPLACE_SALE",
]);
const PARALLEL_STORE_OPS = new Set([
    "INVESTMENT",
    "AI_INVESTMENT",
    "FOREX_INVESTMENT",
    "STAKING",
    "STAKING_DEPOSIT",
    "STAKING_WITHDRAW",
    "FOREX_DEPOSIT",
    "FOREX_WITHDRAW",
    "FX_TRADING_DEPOSIT",
    "FX_TRADING_WITHDRAW",
    "FX_TRADING_WITHDRAW_REFUND",
    "TRANSFER_OUT",
    "TRANSFER_IN",
]);
const COMMERCE_OPS = new Set([
    "GATEWAY_PAYMENT",
    "ECOMMERCE_PURCHASE",
    "ORDER_PASSTHROUGH",
    "NFT_PURCHASE",
    "NFT_SALE",
    "ICO_CONTRIBUTION",
    "MARKETPLACE_PURCHASE",
    "TRADING_FEE",
    "REFUND",
    "REFUND_TRANSFER",
    "ECO_REFUND",
    "COPY_TRADING_REVERSAL",
]);
const COMMERCE_PREFIXES = ["P2P_", "NFT_"];
const HOUSE_OPS = new Set(["PLATFORM_FEE", "FEE", "ECO_FEE"]);
const EXCLUDED_OPS = new Set([
    "DEPOSIT",
    "ECO_DEPOSIT",
    "WITHDRAW",
    "ECO_WITHDRAW",
    "REFUND_WITHDRAWAL",
    "EXCHANGE_ORDER",
    "EXCHANGE_ORDER_FILL",
    "EXCHANGE_ORDER_CANCEL",
    "TRADE_DEBIT",
    "TRADE_CREDIT",
    "HOLD",
    "RELEASE",
    "ADMIN_ADJUSTMENT",
    "ADMIN_ADJUSTMENT_CREDIT",
    "ADMIN_ADJUSTMENT_DEBIT",
    "ADJUSTMENT",
    "ADJUSTMENT_ANCHOR",
]);
const TRANSFER_OPS = new Set(["OUTGOING_TRANSFER", "INCOMING_TRANSFER"]);
const PARALLEL_WALLET_TYPES = new Set(["COPY_TRADING", "FUTURES"]);
const POOL_WALLET_TYPES = new Set(["ECO", "FIAT", "SPOT"]);
const BACKED_FEE_SOURCES = new Set(["DEPOSIT", "WITHDRAW", "TRADE", "EXCHANGE_ORDER"]);
function parseMetadata(raw) {
    let value = raw;
    for (let i = 0; i < 2 && typeof value === "string"; i++) {
        const s = value.trim();
        if (!s)
            return null;
        try {
            value = JSON.parse(s);
        }
        catch (_a) {
            return null;
        }
    }
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function parseRow(row) {
    const meta = parseMetadata(row.metadata);
    const op = meta && typeof meta.operationType === "string" && meta.operationType.trim() ? meta.operationType.trim() : String(row.type || "").trim();
    const rawFlow = meta && typeof meta.flow === "string" ? meta.flow.trim().toUpperCase() : "";
    const flow = rawFlow === "IN" || rawFlow === "OUT" || rawFlow === "INTERNAL" ? rawFlow : null;
    return { row, meta, operation: op || "UNTYPED", flow };
}
function num(value) {
    if (value === null || value === undefined || value === "")
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function counterWalletId(p) {
    var _a, _b;
    if (!p.meta)
        return null;
    const m = p.meta;
    const candidate = p.operation === "OUTGOING_TRANSFER"
        ? (_a = m.toWalletId) !== null && _a !== void 0 ? _a : m.targetWalletId : p.operation === "INCOMING_TRANSFER"
        ? (_b = m.fromWalletId) !== null && _b !== void 0 ? _b : m.sourceWalletId : null;
    return candidate ? String(candidate) : null;
}
function counterWalletIds(rows) {
    const ids = new Set();
    for (const row of rows) {
        const p = parseRow(row);
        if (!TRANSFER_OPS.has(p.operation))
            continue;
        const id = counterWalletId(p);
        if (id)
            ids.add(id);
    }
    return [...ids];
}
function classify(p, walletTypes, byId, memo) {
    const cached = memo.get(p.row.id);
    if (cached)
        return cached;
    const verdict = classifyUncached(p, walletTypes, byId, memo);
    memo.set(p.row.id, verdict);
    return verdict;
}
function classifyUncached(p, walletTypes, byId, memo) {
    if (!p.meta)
        return "unknown";
    const op = p.operation;
    if (TRANSFER_OPS.has(op)) {
        const id = counterWalletId(p);
        if (!id)
            return p.meta.source === "GATEWAY_PAYOUT" ? "commerce" : "unknown";
        const type = walletTypes === null || walletTypes === void 0 ? void 0 : walletTypes.get(id);
        if (!type)
            return "unknown";
        if (PARALLEL_WALLET_TYPES.has(type))
            return "parallel_store";
        if (POOL_WALLET_TYPES.has(type))
            return "excluded";
        return "unknown";
    }
    if (HOUSE_OPS.has(op))
        return classifyFee(p, walletTypes, byId, memo);
    if (EXCLUDED_OPS.has(op))
        return "excluded";
    if (PAYOUT_OPS.has(op))
        return "payout";
    if (PARALLEL_STORE_OPS.has(op))
        return "parallel_store";
    if (COMMERCE_OPS.has(op))
        return "commerce";
    if (COMMERCE_PREFIXES.some((prefix) => op.startsWith(prefix)))
        return "commerce";
    return "unknown";
}
function classifyFee(p, walletTypes, byId, memo) {
    var _a, _b;
    const meta = p.meta;
    const kind = String((_a = meta.type) !== null && _a !== void 0 ? _a : "");
    if (kind.startsWith("FUTURES_INSURANCE"))
        return "house";
    const source = String((_b = meta.sourceType) !== null && _b !== void 0 ? _b : "").trim().toUpperCase();
    if (BACKED_FEE_SOURCES.has(source))
        return "excluded";
    if (source === "TRANSFER") {
        const raw = meta.referenceId != null ? String(meta.referenceId) : stripFeeSuffix(p.row.referenceId);
        const payer = raw ? byId.get(raw) : undefined;
        if (payer && payer !== p && classify(payer, walletTypes, byId, memo) === "excluded")
            return "excluded";
    }
    return "house";
}
function stripFeeSuffix(ref) {
    const s = ref ? String(ref) : "";
    return s.endsWith("_fee") ? s.slice(0, -4) : s;
}
function deriveMinted(rows, day, walletTypes) {
    var _a, _b;
    var _c, _d;
    const parsed = rows.map(parseRow);
    const byId = new Map();
    for (const p of parsed)
        byId.set(String(p.row.id), p);
    const memo = new Map();
    const drafts = new Map();
    for (const p of parsed) {
        if (p.flow === "INTERNAL")
            continue;
        const verdict = classify(p, walletTypes, byId, memo);
        if (verdict === "excluded")
            continue;
        const key = `${p.row.currency}\u0000${verdict}`;
        let draft = drafts.get(key);
        if (!draft) {
            draft = { currency: String(p.row.currency), day, family: verdict, amount: 0, rows: 0, credits: 0, debits: 0, operations: {} };
            drafts.set(key, draft);
        }
        const tally = ((_a = (_c = draft.operations)[_d = p.operation]) !== null && _a !== void 0 ? _a : (_c[_d] = { rows: 0, net: 0 }));
        draft.rows += 1;
        tally.rows += 1;
        if (p.flow === "IN") {
            const signed = num(p.row.amount);
            draft.amount += signed;
            draft.credits += signed;
            tally.net += signed;
        }
        else if (p.flow === "OUT") {
            const signed = -(num(p.row.amount) + num(p.row.fee));
            draft.amount += signed;
            draft.debits += -signed;
            tally.net += signed;
        }
        else {
            tally.unsigned = ((_b = tally.unsigned) !== null && _b !== void 0 ? _b : 0) + 1;
        }
    }
    return [...drafts.values()].sort((a, b) => a.currency.localeCompare(b.currency) || a.family.localeCompare(b.family));
}
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function utcDay(date) {
    return date.toISOString().slice(0, 10);
}
function addDays(day, n) {
    const d = new Date(`${day}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return utcDay(d);
}
function assertDay(day, what) {
    if (day === undefined)
        return undefined;
    const parsed = DAY_RE.test(day) ? new Date(`${day}T00:00:00.000Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || utcDay(parsed) !== day) {
        throw (0, error_1.createError)({ statusCode: 400, message: `${what} must be a UTC day as YYYY-MM-DD, got "${day}"` });
    }
    return day;
}
function daysToAttribute(p) {
    var _a, _b;
    const maxDays = Math.max(1, Math.floor((_a = p.maxDays) !== null && _a !== void 0 ? _a : exports.MAX_ATTRIBUTION_DAYS));
    const yesterday = addDays(utcDay(p.now), -1);
    const through = p.through && p.through < yesterday ? p.through : yesterday;
    let from = (_b = p.from) !== null && _b !== void 0 ? _b : (p.marker ? addDays(p.marker, 1) : through);
    const earliest = addDays(through, -(maxDays - 1));
    if (from < earliest)
        from = earliest;
    const days = [];
    for (let day = from; day <= through; day = addDays(day, 1))
        days.push(day);
    return days;
}
async function loadDayRows(day) {
    const rows = (await db_1.sequelize.query(`SELECT t.id, t.walletId, w.currency, t.type, t.amount, t.fee, t.referenceId, t.metadata
       FROM transaction t
       JOIN wallet w ON w.id = t.walletId
      WHERE t.deletedAt IS NULL
        AND t.createdAt >= :dayStart
        AND t.createdAt < :dayEnd
        AND w.type = 'SPOT'`, {
        replacements: { dayStart: `${day} 00:00:00`, dayEnd: `${addDays(day, 1)} 00:00:00` },
        type: sequelize_1.QueryTypes.SELECT,
    }));
    return rows;
}
async function resolveWalletTypes(ids) {
    const out = new Map();
    if (!ids.length)
        return out;
    const rows = await db_1.models.wallet.findAll({
        where: { id: ids },
        attributes: ["id", "type"],
        raw: true,
        paranoid: false,
    });
    for (const r of rows)
        out.set(String(r.id), String(r.type));
    return out;
}
async function readAttributedThrough() {
    const row = (await db_1.models.settings.findOne({
        where: { key: "poolBackingAttributedThrough" },
        attributes: ["value"],
        raw: true,
    }));
    const value = (row === null || row === void 0 ? void 0 : row.value) != null ? String(row.value).trim() : "";
    return DAY_RE.test(value) ? value : null;
}
async function writeAttributedThrough(day) {
    const [updated] = await db_1.models.settings.update({ value: day }, { where: { key: "poolBackingAttributedThrough" } });
    if (!updated)
        await db_1.models.settings.create({ key: "poolBackingAttributedThrough", value: day });
}
function isUniqueError(error) {
    return error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError";
}
exports.PARALLEL_STORE_CANCELLED_REASON = "principal now counted in L (phase 3)";
function isParallelStoreRow(row) {
    var _a;
    const evidence = parseMetadata(row.evidence);
    if (evidence && typeof evidence.family === "string")
        return evidence.family === "parallel_store";
    return String((_a = row.sourceRef) !== null && _a !== void 0 ? _a : "").endsWith(":parallel_store");
}
async function retireParallelStoreRows(now = new Date()) {
    var _a;
    const rows = (await db_1.models.poolBackingObligation.findAll({
        where: { source: "minted", status: "OPEN" },
        attributes: ["id", "sourceRef", "evidence"],
    }));
    let cancelled = 0;
    for (const row of rows) {
        if (!isParallelStoreRow(row))
            continue;
        const evidence = (_a = parseMetadata(row.evidence)) !== null && _a !== void 0 ? _a : {};
        const [updated] = await db_1.models.poolBackingObligation.update({
            status: "CANCELLED",
            evidence: { ...evidence, cancelledReason: exports.PARALLEL_STORE_CANCELLED_REASON, cancelledAt: now.toISOString() },
        }, { where: { id: row.id, status: "OPEN" } });
        cancelled += Number(updated) || 0;
    }
    if (cancelled) {
        console_1.logger.info("POOL_BACKING", `Attribution: ${cancelled} OPEN parallel_store minted row(s) cancelled — ${exports.PARALLEL_STORE_CANCELLED_REASON}`);
    }
    return cancelled;
}
async function attributeDays(options = {}) {
    var _a;
    const now = (_a = options.now) !== null && _a !== void 0 ? _a : new Date();
    const from = assertDay(options.from, "from");
    const through = assertDay(options.through, "through");
    const summary = {
        days: [],
        written: 0,
        alreadyPresent: 0,
        withinTolerance: 0,
        parallelStoreDerived: 0,
        parallelStoreCancelled: 0,
        unknown: [],
        through: null,
    };
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.mode === "off") {
        summary.skipped = "poolBackingMode is off";
        return summary;
    }
    if (!options.dryRun)
        summary.parallelStoreCancelled = await retireParallelStoreRows(now);
    const marker = await readAttributedThrough();
    summary.through = marker;
    const days = daysToAttribute({ marker, now, maxDays: options.maxDays, from, through });
    if (!days.length) {
        summary.skipped = marker ? `already attributed through ${marker}` : "no finished day to attribute";
        return summary;
    }
    for (const day of days) {
        const rows = await loadDayRows(day);
        const walletTypes = await resolveWalletTypes(counterWalletIds(rows));
        const drafts = deriveMinted(rows, day, walletTypes);
        for (const draft of drafts) {
            if (draft.family === "unknown") {
                summary.unknown.push({ day, currency: draft.currency, rows: draft.rows, amount: draft.amount, operations: Object.keys(draft.operations).sort() });
            }
            if (draft.family === "parallel_store") {
                summary.parallelStoreDerived += 1;
                continue;
            }
            if (Math.abs(draft.amount) <= TOLERANCE) {
                summary.withinTolerance += 1;
                continue;
            }
            if (options.dryRun) {
                summary.written += 1;
                continue;
            }
            try {
                await db_1.models.poolBackingObligation.create({
                    currency: draft.currency,
                    side: "exchange",
                    chain: null,
                    amount: draft.amount,
                    source: "minted",
                    status: "OPEN",
                    nettable: false,
                    sourceRef: `minted:${draft.currency}:${day}:${draft.family}`,
                    legs: null,
                    evidence: { day, family: draft.family, rows: draft.rows, credits: draft.credits, debits: draft.debits, operations: draft.operations },
                    createdBy: null,
                });
                summary.written += 1;
            }
            catch (error) {
                if (!isUniqueError(error))
                    throw error;
                summary.alreadyPresent += 1;
            }
        }
        summary.days.push(day);
        if (!options.dryRun && (!marker || day > marker) && (!summary.through || day > summary.through)) {
            await writeAttributedThrough(day);
            summary.through = day;
        }
    }
    console_1.logger.info("POOL_BACKING", `Attribution: ${summary.days.length} day(s) ${summary.days[0]}..${summary.days[summary.days.length - 1]}, ${summary.written} minted row(s) written, ${summary.alreadyPresent} already present, ${summary.withinTolerance} within tolerance, ${summary.parallelStoreDerived} parallel-store famil${summary.parallelStoreDerived === 1 ? "y" : "ies"} derived and not persisted, ${summary.parallelStoreCancelled} earlier parallel-store row(s) cancelled, ${summary.unknown.length} unknown famil${summary.unknown.length === 1 ? "y" : "ies"}${options.dryRun ? " (dry run)" : ""}`);
    return summary;
}
