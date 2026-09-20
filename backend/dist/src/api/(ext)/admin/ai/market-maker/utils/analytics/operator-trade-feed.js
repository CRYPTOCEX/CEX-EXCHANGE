"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOperatorTrades = mergeOperatorTrades;
exports.resolveRealTradeWindow = resolveRealTradeWindow;
exports.realTradeCoverage = realTradeCoverage;
exports.summarisePerformancePrints = summarisePerformancePrints;
exports.targetAchievement = targetAchievement;
exports.ledgerEpochCoverage = ledgerEpochCoverage;
function mergeOperatorTrades(sources, page, perPage) {
    const safePerPage = Math.max(1, Math.floor(perPage) || 1);
    const safePage = Math.max(1, Math.floor(page) || 1);
    const offset = (safePage - 1) * safePerPage;
    const depth = offset + safePerPage;
    const incompleteSources = sources
        .filter((s) => s.rows.length < Math.min(s.total, depth))
        .map((s) => s.id);
    const merged = sources
        .flatMap((s) => s.rows)
        .sort((a, b) => {
        const at = Date.parse(a.timestamp);
        const bt = Date.parse(b.timestamp);
        if (bt !== at)
            return bt - at;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    const total = sources.reduce((sum, s) => sum + s.total, 0);
    return {
        rows: merged.slice(offset, offset + safePerPage),
        total,
        totalPages: Math.ceil(total / safePerPage),
        incompleteSources,
    };
}
const MS_PER_DAY = 86400000;
function utcMidnight(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function resolveRealTradeWindow(opts) {
    var _a, _b, _c;
    const now = (_a = opts.now) !== null && _a !== void 0 ? _a : new Date();
    const defaultDays = (_b = opts.defaultDays) !== null && _b !== void 0 ? _b : 30;
    const maxDays = (_c = opts.maxDays) !== null && _c !== void 0 ? _c : 90;
    let days = defaultDays;
    if (opts.startDate) {
        const start = new Date(opts.startDate);
        if (!Number.isNaN(start.getTime())) {
            const spanned = Math.round((utcMidnight(now).getTime() - utcMidnight(start).getTime()) / MS_PER_DAY) + 1;
            days = Math.max(1, spanned);
        }
    }
    days = Math.max(1, Math.min(maxDays, days));
    return {
        days,
        windowStart: new Date(utcMidnight(now).getTime() - (days - 1) * MS_PER_DAY),
    };
}
function realTradeCoverage(opts) {
    const windowStartIso = opts.windowStart.toISOString();
    if (opts.requestedStart && !Number.isNaN(opts.requestedStart.getTime())) {
        if (opts.requestedStart.getTime() < opts.windowStart.getTime()) {
            return {
                complete: false,
                reason: `real fills between the requested ${opts.requestedStart.toISOString()} and ` +
                    `${windowStartIso} are not included: the per-trade ledger is read over a ` +
                    `bounded window`,
            };
        }
        return { complete: true, reason: null };
    }
    if (opts.ledgerBeginsAt && !Number.isNaN(opts.ledgerBeginsAt.getTime())) {
        if (opts.ledgerBeginsAt.getTime() < opts.windowStart.getTime()) {
            return {
                complete: false,
                reason: `real fills before ${windowStartIso} are not included: the per-trade ledger ` +
                    `begins at ${opts.ledgerBeginsAt.toISOString()}, earlier than the window read`,
            };
        }
        return { complete: true, reason: null };
    }
    return {
        complete: false,
        reason: `no real fill has ever been recorded for this market, so it cannot be established ` +
            `whether any exist before ${windowStartIso}`,
    };
}
function parsedAt(timestamp) {
    return Date.parse(String(timestamp));
}
function summarisePerformancePrints(prints) {
    var _a;
    const buckets = new Map();
    const pricePoints = [];
    let totalTrades = 0;
    let aiOnlyTrades = 0;
    let realTrades = 0;
    let periodVolume = 0;
    let undatedPrints = 0;
    for (const print of prints) {
        totalTrades++;
        if (print.type === "REAL")
            realTrades++;
        else
            aiOnlyTrades++;
        const amount = Number(print.amount);
        const size = Number.isFinite(amount) && amount > 0 ? amount : 0;
        periodVolume += size;
        const at = parsedAt(print.timestamp);
        if (Number.isNaN(at)) {
            undatedPrints++;
        }
        else {
            const key = `${new Date(at).toISOString().slice(0, 13)}:00:00.000Z`;
            const bucket = (_a = buckets.get(key)) !== null && _a !== void 0 ? _a : {
                timestamp: key,
                volume: 0,
                aiOnlyVolume: 0,
                realVolume: 0,
            };
            bucket.volume += size;
            if (print.type === "REAL")
                bucket.realVolume += size;
            else
                bucket.aiOnlyVolume += size;
            buckets.set(key, bucket);
        }
        const price = Number(print.price);
        if (!Number.isNaN(at) && Number.isFinite(price) && price > 0) {
            pricePoints.push({
                timestamp: new Date(at).toISOString(),
                price,
                type: print.type,
            });
        }
    }
    const volumeHistory = [...buckets.values()].sort((a, b) => a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0);
    pricePoints.sort((a, b) => parsedAt(a.timestamp) - parsedAt(b.timestamp));
    return {
        totalTrades,
        aiOnlyTrades,
        realTrades,
        avgTradeSize: totalTrades > 0 ? periodVolume / totalTrades : null,
        periodVolume,
        volumeHistory,
        pricePoints,
        undatedPrints,
    };
}
function targetAchievement(prints, opts) {
    const target = Number(opts.target);
    const tolerance = Number(opts.tolerance);
    const tolerancePercent = Number.isFinite(tolerance) && tolerance >= 0 ? tolerance * 100 : 0;
    if (!Number.isFinite(target) || target <= 0 || tolerancePercent === 0) {
        return {
            rate: null,
            withinTolerance: 0,
            sampled: 0,
            tolerancePercent,
            target: null,
        };
    }
    let sampled = 0;
    let withinTolerance = 0;
    for (const print of prints) {
        const price = Number(print.price);
        if (!Number.isFinite(price) || price <= 0)
            continue;
        sampled++;
        if (Math.abs(price - target) / target <= tolerance)
            withinTolerance++;
    }
    return {
        rate: sampled > 0 ? (withinTolerance / sampled) * 100 : null,
        withinTolerance,
        sampled,
        tolerancePercent,
        target,
    };
}
function ledgerEpochCoverage(opts) {
    const periodStartIso = opts.periodStart.toISOString();
    if (!opts.ledgerBeginsAt || Number.isNaN(opts.ledgerBeginsAt.getTime())) {
        return {
            covered: false,
            reason: `no fill against a real customer has ever been recorded for this market, so the ` +
                `real half of these figures is empty for a reason that cannot be told apart from ` +
                `a market that simply had no customer fills since ${periodStartIso}`,
        };
    }
    if (opts.ledgerBeginsAt.getTime() > opts.periodStart.getTime()) {
        return {
            covered: false,
            reason: `real fills are only recorded from ${opts.ledgerBeginsAt.toISOString()}; the part ` +
                `of this period before that (from ${periodStartIso}) contributes AI-to-AI prints ` +
                `only, so every merged figure here is a LOWER BOUND`,
        };
    }
    return { covered: true, reason: null };
}
