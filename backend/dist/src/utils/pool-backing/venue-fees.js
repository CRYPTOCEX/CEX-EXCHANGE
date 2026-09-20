"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FETCH_MY_TRADES_PARAMS = exports.VENUE_FEES_OVERLAP_MS = exports.VENUE_FEES_MAX_LOOKBACK_MS = exports.VENUE_FEES_FIRST_RUN_LOOKBACK_MS = exports.POOL_BACKING_VENUE_FEES_THROUGH_KEY = void 0;
exports.venueFeeSourceRef = venueFeeSourceRef;
exports.draftVenueFees = draftVenueFees;
exports.readVenueOf = readVenueOf;
exports.windowFor = windowFor;
exports.attributeVenueFees = attributeVenueFees;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const fee_decisions_1 = require("@b/utils/fee-decisions");
const settings_1 = require("./settings");
const ledger_1 = require("./ledger");
const LOG = "POOL_BACKING";
const EPSILON = 1e-12;
exports.POOL_BACKING_VENUE_FEES_THROUGH_KEY = "poolBackingVenueFeesThrough";
exports.VENUE_FEES_FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
exports.VENUE_FEES_MAX_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
exports.VENUE_FEES_OVERLAP_MS = 60 * 60 * 1000;
exports.FETCH_MY_TRADES_PARAMS = { paginate: true, type: "spot" };
const ORPHAN_IDS_REPORTED = 20;
function venueFeeSourceRef(provider, tradeId) {
    return `exchange_fee:${provider}:${tradeId}`;
}
function num(value) {
    if (value === null || value === undefined || value === "")
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function messageOf(error) {
    var _a;
    return String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error);
}
function isUniqueError(error) {
    return error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError";
}
function draftVenueFees(provider, trades) {
    var _a, _b, _c;
    const out = { drafts: [], noFee: 0, unusable: 0 };
    for (const raw of Array.isArray(trades) ? trades : []) {
        const trade = raw !== null && raw !== void 0 ? raw : {};
        const id = trade.id != null ? String(trade.id).trim() : "";
        if (!id) {
            out.unusable += 1;
            continue;
        }
        const cost = Number((_a = trade.fee) === null || _a === void 0 ? void 0 : _a.cost);
        if (!(Number.isFinite(cost) && cost > 0)) {
            out.noFee += 1;
            continue;
        }
        const symbol = typeof trade.symbol === "string" ? trade.symbol.trim() : "";
        const side = typeof trade.side === "string" ? trade.side.trim().toLowerCase() : null;
        let currency = typeof ((_b = trade.fee) === null || _b === void 0 ? void 0 : _b.currency) === "string" ? trade.fee.currency.trim().toUpperCase() : "";
        let inferredCurrency = false;
        if (!currency) {
            const [base, quote] = symbol.split("/");
            const inferred = side === "sell" ? quote : side === "buy" ? base : "";
            if (!inferred || !inferred.trim()) {
                out.unusable += 1;
                continue;
            }
            currency = inferred.trim().toUpperCase();
            inferredCurrency = true;
        }
        const rawFeeCurrency = (_c = trade.info) === null || _c === void 0 ? void 0 : _c.feeCurrency;
        if (typeof rawFeeCurrency === "string" && rawFeeCurrency.trim() === "")
            inferredCurrency = true;
        const timestamp = Number(trade.timestamp);
        out.drafts.push({
            sourceRef: venueFeeSourceRef(provider, id),
            currency,
            amount: cost,
            evidence: {
                provider,
                tradeId: id,
                orderId: trade.order != null && String(trade.order).trim() ? String(trade.order).trim() : null,
                symbol: symbol || null,
                side,
                amount: num(trade.amount),
                cost: num(trade.cost),
                timestamp: Number.isFinite(timestamp) ? timestamp : null,
                inferredCurrency,
            },
        });
    }
    out.drafts.sort((a, b) => { var _a, _b; return ((_a = a.evidence.timestamp) !== null && _a !== void 0 ? _a : 0) - ((_b = b.evidence.timestamp) !== null && _b !== void 0 ? _b : 0) || a.sourceRef.localeCompare(b.sourceRef); });
    return out;
}
function readVenueOf(metadata) {
    let value = metadata;
    for (let i = 0; i < 2 && typeof value === "string"; i++) {
        const s = value.trim();
        if (!s)
            return undefined;
        try {
            value = JSON.parse(s);
        }
        catch (_a) {
            return undefined;
        }
    }
    const venue = value && typeof value === "object" ? value.venue : undefined;
    return typeof venue === "string" && venue.trim() ? venue.trim() : undefined;
}
function windowFor(p) {
    const throughMs = p.through.getTime();
    const floor = throughMs - exports.VENUE_FEES_MAX_LOOKBACK_MS;
    let sinceMs;
    let firstRun = false;
    const explicit = p.from ? Date.parse(p.from) : NaN;
    const marker = p.marker ? Date.parse(p.marker) : NaN;
    if (Number.isFinite(explicit)) {
        sinceMs = explicit;
    }
    else if (Number.isFinite(marker)) {
        sinceMs = marker - exports.VENUE_FEES_OVERLAP_MS;
    }
    else {
        sinceMs = throughMs - exports.VENUE_FEES_FIRST_RUN_LOOKBACK_MS;
        firstRun = true;
    }
    const capped = sinceMs < floor;
    if (capped)
        sinceMs = floor;
    if (sinceMs > throughMs)
        sinceMs = throughMs;
    return { sinceMs, firstRun, capped };
}
function resolveInstant(value, what, now) {
    if (value === undefined || value === null || String(value).trim() === "")
        return null;
    const ms = Date.parse(String(value).trim());
    if (!Number.isFinite(ms)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `${what} must be an ISO 8601 instant or a UTC day as YYYY-MM-DD, got "${value}"` });
    }
    return ms > now.getTime() ? now : new Date(ms);
}
async function readVenueFeesThrough() {
    const row = (await db_1.models.settings.findOne({
        where: { key: "poolBackingVenueFeesThrough" },
        attributes: ["value"],
        raw: true,
    }));
    const value = (row === null || row === void 0 ? void 0 : row.value) != null ? String(row.value).trim() : "";
    return value && Number.isFinite(Date.parse(value)) ? value : null;
}
async function writeVenueFeesThrough(iso) {
    const [updated] = await db_1.models.settings.update({ value: iso }, { where: { key: "poolBackingVenueFeesThrough" } });
    if (!updated)
        await db_1.models.settings.create({ key: "poolBackingVenueFeesThrough", value: iso });
}
async function symbolsTouchedSince(provider, since) {
    const rows = (await db_1.models.exchangeOrder.findAll({
        where: { updatedAt: { [sequelize_1.Op.gte]: since } },
        attributes: ["symbol", "metadata"],
        raw: true,
        paranoid: false,
    }));
    const symbols = new Set();
    for (const row of rows) {
        const venue = readVenueOf(row.metadata);
        if (venue && venue !== provider)
            continue;
        const symbol = typeof row.symbol === "string" ? row.symbol.trim() : "";
        if (symbol)
            symbols.add(symbol);
    }
    return [...symbols].sort();
}
async function legsFor(provider, orderIds) {
    const ids = [...new Set(orderIds.filter((id) => typeof id === "string" && id.length > 0))];
    const legs = new Map();
    if (!ids.length)
        return legs;
    const rows = (await db_1.models.exchangeOrder.findAll({
        where: { referenceId: ids },
        attributes: ["id", "referenceId", "userId", "metadata"],
        raw: true,
        paranoid: false,
    }));
    for (const row of rows) {
        const venue = readVenueOf(row.metadata);
        if (venue && venue !== provider)
            continue;
        if (row.referenceId == null)
            continue;
        legs.set(String(row.referenceId), { exchangeOrderId: String(row.id), userId: String(row.userId) });
    }
    return legs;
}
async function findDebit(where, t) {
    const row = (await db_1.models.transaction.findOne({
        where,
        attributes: ["id", "amount"],
        raw: true,
        paranoid: false,
        transaction: t,
    }));
    if (!row || row.id == null)
        return null;
    return { id: String(row.id), amount: num(row.amount) };
}
async function bookVenueFeeLoss(t, draft) {
    var _a;
    const { evidence } = draft;
    let result;
    try {
        const { recordPlatformLoss } = require("@b/utils/fees");
        result = await recordPlatformLoss({
            walletType: "SPOT",
            currency: draft.currency,
            lossAmount: draft.amount,
            type: "POOL_BACKING",
            description: `Venue fee on ${(_a = evidence.symbol) !== null && _a !== void 0 ? _a : "?"} trade ${evidence.tradeId} (${evidence.provider})`,
            referenceId: draft.sourceRef,
            metadata: {
                source: "venue_fee",
                provider: evidence.provider,
                tradeId: evidence.tradeId,
                orderId: evidence.orderId,
                symbol: evidence.symbol,
            },
            transaction: t,
        });
    }
    catch (error) {
        console_1.logger.error(LOG, `Could not book venue fee ${draft.amount} ${draft.currency} (${draft.sourceRef}) as recognised loss: ${messageOf(error)}`);
        return { booked: false, transactionId: null, debited: 0, replayed: false, reason: messageOf(error) };
    }
    if (!result) {
        const replay = await findDebit({ idempotencyKey: (0, fee_decisions_1.platformLossIdempotencyKey)("POOL_BACKING", draft.sourceRef) }, t);
        if (replay)
            return { booked: true, transactionId: replay.id, debited: replay.amount, replayed: true, reason: null };
        console_1.logger.error(LOG, `recordPlatformLoss wrote no row for venue fee ${draft.amount} ${draft.currency} (${draft.sourceRef}): no Super Admin, or the adminProfit write failed`);
        return { booked: false, transactionId: null, debited: 0, replayed: false, reason: "no Super Admin configured, or the adminProfit write failed" };
    }
    if (!result.transactionId) {
        return { booked: true, transactionId: null, debited: 0, replayed: false, reason: "treasury empty, or the debit was refused" };
    }
    const debit = await findDebit({ id: result.transactionId }, t);
    if (!debit) {
        return { booked: true, transactionId: result.transactionId, debited: 0, replayed: false, reason: "the debit row could not be read back" };
    }
    return { booked: true, transactionId: debit.id, debited: debit.amount, replayed: false, reason: null };
}
async function writeVenueFee(draft, legs) {
    return db_1.sequelize.transaction(async (t) => {
        var _a;
        await (0, ledger_1.withCurrencyAnchor)(draft.currency, t);
        let row;
        try {
            row = await db_1.models.poolBackingObligation.create({
                currency: draft.currency,
                side: "exchange",
                chain: null,
                amount: draft.amount,
                source: "exchange_fee",
                status: "OPEN",
                nettable: false,
                sourceRef: draft.sourceRef,
                legs,
                evidence: draft.evidence,
                createdBy: null,
            }, { transaction: t });
        }
        catch (error) {
            if (isUniqueError(error))
                return "already_present";
            throw error;
        }
        const loss = await bookVenueFeeLoss(t, draft);
        const debited = Math.min(Math.max(loss.debited, 0), draft.amount);
        const uncovered = Math.max(draft.amount - debited, 0);
        const settledAt = new Date();
        const evidence = {
            ...draft.evidence,
            loss: {
                booked: loss.booked,
                transactionId: loss.transactionId,
                debited,
                uncovered,
                ...(loss.replayed ? { replayed: true } : {}),
                ...(loss.reason ? { reason: loss.reason } : {}),
            },
        };
        if (uncovered <= EPSILON) {
            await row.update({ status: "SETTLED", settledAt, evidence }, { transaction: t });
            return "settled";
        }
        if (debited > EPSILON) {
            await db_1.models.poolBackingObligation.create({
                currency: draft.currency,
                side: "exchange",
                chain: null,
                amount: debited,
                source: "exchange_fee",
                status: "SETTLED",
                nettable: false,
                sourceRef: `${draft.sourceRef}#${(_a = loss.transactionId) !== null && _a !== void 0 ? _a : "loss"}`,
                legs: { ...legs, splitFrom: row.id },
                evidence,
                settlementId: null,
                createdBy: null,
                settledAt,
            }, { transaction: t });
            await row.update({ amount: uncovered, evidence }, { transaction: t });
            return "partial";
        }
        await row.update({ evidence }, { transaction: t });
        return "unfunded";
    });
}
async function attributeVenueFees(options = {}) {
    var _a;
    var _b, _c, _d;
    const now = (_b = options.now) !== null && _b !== void 0 ? _b : new Date();
    const summary = {
        provider: null,
        since: null,
        through: null,
        symbols: [],
        trades: 0,
        written: 0,
        alreadyPresent: 0,
        settled: 0,
        partial: 0,
        unfunded: 0,
        noFee: 0,
        unusable: 0,
        orphanTrades: 0,
        orphanTradeIds: [],
        failed: [],
    };
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.mode === "off") {
        summary.skipped = "poolBackingMode is off";
        return summary;
    }
    const through = (_c = resolveInstant(options.through, "through", now)) !== null && _c !== void 0 ? _c : now;
    const from = resolveInstant(options.from, "from", now);
    if (from && from.getTime() >= through.getTime()) {
        throw (0, error_1.createError)({ statusCode: 400, message: `from (${from.toISOString()}) must be before through (${through.toISOString()})` });
    }
    const marker = await readVenueFeesThrough();
    summary.through = marker;
    const window = windowFor({ marker, through, from: from ? from.toISOString() : null });
    summary.since = new Date(window.sinceMs).toISOString();
    if (window.sinceMs >= through.getTime()) {
        summary.skipped = `already attributed through ${marker}`;
        return summary;
    }
    if (window.capped) {
        console_1.logger.warn(LOG, `Venue fees: look-back cut at ${exports.VENUE_FEES_MAX_LOOKBACK_MS / 86400000} days (marker ${marker !== null && marker !== void 0 ? marker : "none"}, from ${(_d = options.from) !== null && _d !== void 0 ? _d : "none"}); earlier fees stay in the residual`);
    }
    let exchange = null;
    let provider = null;
    try {
        const ExchangeManager = require("@b/utils/exchange").default;
        exchange = await ExchangeManager.startExchange();
        provider = exchange ? await ExchangeManager.getProvider() : null;
    }
    catch (error) {
        console_1.logger.warn(LOG, `Exchange unavailable for venue fees: ${messageOf(error)}`);
    }
    if (!exchange || !provider) {
        summary.skipped = "exchange not available";
        return summary;
    }
    summary.provider = provider;
    if (typeof exchange.fetchMyTrades !== "function" || ((_a = exchange.has) === null || _a === void 0 ? void 0 : _a.fetchMyTrades) === false) {
        summary.skipped = `${provider} does not support fetchMyTrades`;
        return summary;
    }
    const advance = async () => {
        if (options.dryRun)
            return;
        const markerMs = marker ? Date.parse(marker) : NaN;
        if (Number.isFinite(markerMs) && through.getTime() <= markerMs)
            return;
        await writeVenueFeesThrough(through.toISOString());
        summary.through = through.toISOString();
    };
    const symbols = await symbolsTouchedSince(provider, new Date(window.sinceMs));
    summary.symbols = symbols;
    if (!symbols.length) {
        summary.skipped = `no ${provider} orders touched since ${summary.since}`;
        await advance();
        return summary;
    }
    for (const symbol of symbols) {
        let trades;
        try {
            trades = await exchange.fetchMyTrades(symbol, window.sinceMs, undefined, { ...exports.FETCH_MY_TRADES_PARAMS });
        }
        catch (error) {
            summary.failed.push({ symbol, tradeId: null, reason: `fetchMyTrades(${symbol}) failed: ${messageOf(error)}` });
            continue;
        }
        const inWindow = (Array.isArray(trades) ? trades : []).filter((trade) => {
            const ts = Number(trade === null || trade === void 0 ? void 0 : trade.timestamp);
            return !Number.isFinite(ts) || ts <= through.getTime();
        });
        summary.trades += inWindow.length;
        const drafted = draftVenueFees(provider, inWindow);
        summary.noFee += drafted.noFee;
        summary.unusable += drafted.unusable;
        const legsByOrderId = await legsFor(provider, drafted.drafts.map((d) => d.evidence.orderId));
        for (const draft of drafted.drafts) {
            const legs = draft.evidence.orderId ? legsByOrderId.get(draft.evidence.orderId) : undefined;
            if (!legs) {
                summary.orphanTrades += 1;
                if (summary.orphanTradeIds.length < ORPHAN_IDS_REPORTED)
                    summary.orphanTradeIds.push(draft.evidence.tradeId);
                continue;
            }
            if (options.dryRun) {
                summary.written += 1;
                continue;
            }
            try {
                const outcome = await writeVenueFee(draft, legs);
                if (outcome === "already_present") {
                    summary.alreadyPresent += 1;
                }
                else {
                    summary.written += 1;
                    summary[outcome] += 1;
                }
            }
            catch (error) {
                summary.failed.push({ symbol, tradeId: draft.evidence.tradeId, reason: `${draft.sourceRef}: ${messageOf(error)}` });
            }
        }
    }
    if (!summary.failed.length)
        await advance();
    console_1.logger.info(LOG, `Venue fees on ${provider}: ${summary.trades} trade(s) over ${symbols.length} symbol(s) since ${summary.since}; ` +
        `${summary.written} exchange_fee row(s) written (${summary.settled} settled, ${summary.partial} partly covered, ${summary.unfunded} unfunded), ` +
        `${summary.alreadyPresent} already present, ${summary.noFee} without a fee, ${summary.orphanTrades} not a platform order` +
        `${summary.failed.length ? `, ${summary.failed.length} failure(s) — marker not advanced` : ""}${options.dryRun ? " (dry run)" : ""}`);
    return summary;
}
