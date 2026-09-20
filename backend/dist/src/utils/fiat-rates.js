"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_POLICY = exports.DEFAULT_PROVIDER_ORDER = exports.FIAT_RATE_PROVIDERS = void 0;
exports.resolveCurrencyPolicy = resolveCurrencyPolicy;
exports.resolveMergeStrategy = resolveMergeStrategy;
exports.parseRate = parseRate;
exports.resolveFiatRateProviders = resolveFiatRateProviders;
exports.describeFreshness = describeFreshness;
exports.mergeProviderRates = mergeProviderRates;
function fromUnixSeconds(value) {
    const seconds = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(seconds) || seconds <= 0)
        return null;
    return seconds * 1000;
}
function fromIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const ms = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(ms) ? ms : null;
}
exports.FIAT_RATE_PROVIDERS = [
    {
        id: "openexchangerates",
        label: "OpenExchangeRates",
        keyEnv: "APP_OPENEXCHANGERATES_APP_ID",
        family: "oxr",
        buildUrl: (base) => `https://openexchangerates.org/api/latest.json?app_id=${process.env.APP_OPENEXCHANGERATES_APP_ID}&base=${base}`,
        extract: (payload) => payload === null || payload === void 0 ? void 0 : payload.rates,
        extractPublishedAt: (payload) => fromUnixSeconds(payload === null || payload === void 0 ? void 0 : payload.timestamp),
        staleAfterHours: 6,
    },
    {
        id: "exchangerate-api",
        label: "ExchangeRate-API (keyed)",
        keyEnv: "APP_EXCHANGERATE_API_KEY",
        family: "erapi",
        buildUrl: (base) => `https://v6.exchangerate-api.com/v6/${process.env.APP_EXCHANGERATE_API_KEY}/latest/${base}`,
        extract: (payload) => payload === null || payload === void 0 ? void 0 : payload.conversion_rates,
        extractPublishedAt: (payload) => fromUnixSeconds(payload === null || payload === void 0 ? void 0 : payload.time_last_update_unix),
        staleAfterHours: 30,
    },
    {
        id: "open-er-api",
        label: "open.er-api (keyless)",
        family: "erapi",
        buildUrl: (base) => `https://open.er-api.com/v6/latest/${base}`,
        extract: (payload) => payload === null || payload === void 0 ? void 0 : payload.rates,
        extractPublishedAt: (payload) => fromUnixSeconds(payload === null || payload === void 0 ? void 0 : payload.time_last_update_unix),
        staleAfterHours: 30,
    },
    {
        id: "currency-api",
        label: "currency-api (keyless)",
        family: "currency-api",
        buildUrl: (base) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`,
        extract: (payload) => {
            if (!payload || typeof payload !== "object")
                return undefined;
            const rateKey = Object.keys(payload).find((k) => k !== "date");
            const rates = rateKey ? payload[rateKey] : undefined;
            if (!rates || typeof rates !== "object")
                return undefined;
            const upper = {};
            for (const code of Object.keys(rates))
                upper[code.toUpperCase()] = rates[code];
            return upper;
        },
        extractPublishedAt: (payload) => fromIsoDate(payload === null || payload === void 0 ? void 0 : payload.date),
        staleAfterHours: 30,
    },
    {
        id: "frankfurter",
        label: "Frankfurter / ECB (keyless)",
        family: "ecb",
        buildUrl: (base) => `https://api.frankfurter.app/latest?from=${base}`,
        extract: (payload) => payload === null || payload === void 0 ? void 0 : payload.rates,
        extractPublishedAt: (payload) => fromIsoDate(payload === null || payload === void 0 ? void 0 : payload.date),
        staleAfterHours: 96,
    },
];
exports.DEFAULT_PROVIDER_ORDER = [
    "openexchangerates",
    "exchangerate-api",
    "currency-api",
    "open-er-api",
    "frankfurter",
];
const MIN_PLAUSIBLE_RATE = 1e-9;
const MAX_PLAUSIBLE_RATE = 1e12;
const DISAGREEMENT_WARN_RATIO = 0.02;
exports.CURRENCY_POLICY = {
    ZWL: {
        kind: "retired",
        replacedBy: "ZWG",
        note: "Zimbabwe replaced ZWL with ZWG in April 2024 and ISO withdrew the code. " +
            "No live quote exists (Yahoo delisted USDZWL). The pool's three answers are " +
            "three different ghosts: OXR 322 is the last ZWL fix, erapi 26.69 is ZWG " +
            "under the dead code, currency-api 66,702 is post-collapse ZWL.",
    },
    SYP: {
        kind: "redenominated",
        perUsd: 121.5,
        note: "Syria dropped two zeros from the pound; new notes circulate from Dec 2025. " +
            "Market 2026-07-31: 121.55/USD, matching erapi 121.72. OXR still quotes the " +
            "old unit at 13,002 — 107x out, and no spread test can call that a rate error.",
    },
    CUP: {
        kind: "multi-rate",
        note: "Cuba runs concurrent official windows. Market 2026-07-31: 24.0/USD, matching " +
            "erapi exactly; OXR 25.75 and currency-api 26.49 track other windows. OXR sits " +
            "BETWEEN the other two, so consensus cannot flag it as the outlier.",
    },
    SSP: {
        kind: "multi-rate",
        note: "South Sudan's official and parallel rates diverge widely and no source " +
            "splits the difference. Market 2026-07-31: 2,815/USD against OXR 130 (the " +
            "abandoned peg) and erapi 4,938. Consensus correctly rejects OXR, but the " +
            "value it lands on is not the market either.",
    },
};
const UNIT_SCALE_TOLERANCE = 20;
function resolveCurrencyPolicy() {
    const policy = { ...exports.CURRENCY_POLICY };
    const raw = (process.env.APP_FIAT_RATES_UNITS || "").trim();
    if (!raw)
        return policy;
    for (const entry of raw.split(",")) {
        const [codeRaw, valueRaw] = entry.split("=");
        const code = (codeRaw || "").trim().toUpperCase();
        const value = (valueRaw || "").trim().toLowerCase();
        if (!code || !value)
            continue;
        const note = `Declared by APP_FIAT_RATES_UNITS (${entry.trim()}).`;
        if (value === "retired")
            policy[code] = { kind: "retired", note };
        else if (value === "multi-rate" || value === "multirate")
            policy[code] = { kind: "multi-rate", note };
        else if (value === "auto" || value === "none")
            delete policy[code];
        else {
            const perUsd = parseFloat(value);
            if (Number.isFinite(perUsd) && perUsd > 0)
                policy[code] = { kind: "redenominated", perUsd, note };
        }
    }
    return policy;
}
const CONSENSUS_TOLERANCE = 0.05;
const PRIORITY_OUTLIER_TOLERANCE = 0.01;
const CORROBORATION_MARGIN = 3;
const DRIFT_ALLOWANCE_PER_DAY = 0.06;
function driftAllowance(lagHours) {
    return (DRIFT_ALLOWANCE_PER_DAY * Math.max(0, lagHours)) / 24;
}
function resolveMergeStrategy() {
    return (process.env.APP_FIAT_RATES_MERGE || "").trim().toLowerCase() === "priority"
        ? "priority"
        : "consensus";
}
function relativeGap(a, b) {
    const min = Math.min(a, b);
    if (min <= 0)
        return Infinity;
    return Math.abs(a - b) / min;
}
function consensusOverride(priority, others) {
    if (others.length < 2)
        return null;
    const rates = others.map((o) => o.rate);
    const low = Math.min(...rates);
    const high = Math.max(...rates);
    if (low <= 0)
        return null;
    const gap = priority.rate < low
        ? relativeGap(priority.rate, low)
        : priority.rate > high
            ? relativeGap(priority.rate, high)
            : 0;
    if (gap <= PRIORITY_OUTLIER_TOLERANCE)
        return null;
    const spread = relativeGap(high, low);
    if (spread > CONSENSUS_TOLERANCE)
        return null;
    if (spread * CORROBORATION_MARGIN > gap)
        return null;
    if (gap <= explainableLag(priority, others).allowance)
        return null;
    return others[0];
}
function explainableLag(priority, others) {
    const none = { lagHours: 0, allowance: 0 };
    if (priority.ageMs === null)
        return none;
    const ages = others.map((o) => o.ageMs).filter((a) => a !== null);
    if (ages.length !== others.length || !ages.length)
        return none;
    const freshestChallenger = Math.min(...ages);
    if (freshestChallenger <= priority.ageMs)
        return none;
    const lagHours = (freshestChallenger - priority.ageMs) / 3600000;
    return { lagHours, allowance: driftAllowance(lagHours) };
}
function parseRate(value) {
    const rate = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(rate))
        return null;
    if (rate < MIN_PLAUSIBLE_RATE || rate > MAX_PLAUSIBLE_RATE)
        return null;
    return rate;
}
function resolveFiatRateProviders() {
    const configuredList = (process.env.APP_FIAT_RATES_PROVIDERS || "")
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean);
    let order;
    if (configuredList.length) {
        order = configuredList;
    }
    else {
        const legacy = (process.env.APP_FIAT_RATES_PROVIDER || "").trim().toLowerCase();
        order = legacy
            ? [legacy, ...exports.DEFAULT_PROVIDER_ORDER.filter((id) => id !== legacy)]
            : [...exports.DEFAULT_PROVIDER_ORDER];
    }
    const enabled = [];
    const skipped = [];
    for (const id of order) {
        const provider = exports.FIAT_RATE_PROVIDERS.find((p) => p.id === id);
        if (!provider) {
            skipped.push({ id, reason: "unknown provider id" });
            continue;
        }
        if (provider.keyEnv && !process.env[provider.keyEnv]) {
            skipped.push({ id, reason: `${provider.keyEnv} not configured` });
            continue;
        }
        if (enabled.some((p) => p.id === provider.id))
            continue;
        enabled.push(provider);
    }
    return { enabled, skipped };
}
function formatAge(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 60)
        return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
function describeFreshness(provider, payload, now = Date.now()) {
    var _a;
    var _b;
    const publishedAt = (_b = (_a = provider.extractPublishedAt) === null || _a === void 0 ? void 0 : _a.call(provider, payload)) !== null && _b !== void 0 ? _b : null;
    if (publishedAt === null || !Number.isFinite(publishedAt)) {
        return { publishedAt: null, ageMs: null, stale: false, age: null };
    }
    const ageMs = Math.max(0, now - publishedAt);
    const limitHours = provider.staleAfterHours;
    return {
        publishedAt,
        ageMs,
        stale: limitHours !== undefined && ageMs > limitHours * 3600000,
        age: formatAge(ageMs),
    };
}
function mergeProviderRates(results, strategy = resolveMergeStrategy(), policyTable = resolveCurrencyPolicy()) {
    var _a, _b;
    var _c, _d, _e;
    const merged = {};
    const sourceOf = {};
    const disagreements = [];
    const policyActions = [];
    const allCodes = new Set();
    for (const r of results)
        for (const code of Object.keys((_c = r.rates) !== null && _c !== void 0 ? _c : {}))
            allCodes.add(code);
    for (const code of allCodes) {
        let values = [];
        for (const r of results) {
            const rate = (_a = r.rates) === null || _a === void 0 ? void 0 : _a[code];
            if (rate === undefined)
                continue;
            values.push({
                providerId: r.provider.id,
                family: r.provider.family,
                rate,
                ageMs: (_d = (_b = r.freshness) === null || _b === void 0 ? void 0 : _b.ageMs) !== null && _d !== void 0 ? _d : null,
            });
        }
        if (!values.length)
            continue;
        const policy = policyTable[code];
        if (policy) {
            const keep = policy.kind === "retired"
                ? []
                : policy.kind === "redenominated"
                    ? values.filter((v) => v.rate <= policy.perUsd * UNIT_SCALE_TOLERANCE &&
                        v.rate >= policy.perUsd / UNIT_SCALE_TOLERANCE)
                    : values;
            if (keep.length !== values.length) {
                const kept = new Set(keep);
                policyActions.push({
                    code,
                    policy,
                    dropped: values
                        .filter((v) => !kept.has(v))
                        .map((v) => ({ providerId: v.providerId, rate: v.rate })),
                    unpriced: keep.length === 0,
                });
                values = keep;
            }
            if (!values.length)
                continue;
        }
        const priorityPick = values[0];
        let pick = priorityPick;
        const familyReps = [];
        const seenFamilies = new Set();
        for (const v of values) {
            if (seenFamilies.has(v.family))
                continue;
            seenFamilies.add(v.family);
            familyReps.push(v);
        }
        if (strategy === "consensus") {
            pick = (_e = consensusOverride(familyReps[0], familyReps.slice(1))) !== null && _e !== void 0 ? _e : pick;
        }
        merged[code] = pick.rate;
        sourceOf[code] = pick.providerId;
        if (familyReps.length < 2)
            continue;
        const nums = familyReps.map((v) => v.rate);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        if (min <= 0)
            continue;
        const spread = (max - min) / min;
        const overrode = pick.providerId !== priorityPick.providerId;
        if (spread > DISAGREEMENT_WARN_RATIO || overrode) {
            const oldest = familyReps.reduce((worst, v) => v.ageMs !== null && (worst.ageMs === null || v.ageMs > worst.ageMs) ? v : worst, familyReps[0]);
            const lag = explainableLag(familyReps.reduce((best, v) => v.ageMs !== null && (best.ageMs === null || v.ageMs < best.ageMs) ? v : best, familyReps[0]), [oldest]);
            disagreements.push({
                code,
                spread,
                families: familyReps.length,
                chosen: pick.rate,
                chosenProviderId: pick.providerId,
                values: values.map((v) => ({ providerId: v.providerId, rate: v.rate })),
                overrodePriority: overrode
                    ? { providerId: priorityPick.providerId, rate: priorityPick.rate }
                    : undefined,
                lagExplained: !overrode && lag.allowance > 0 && spread <= lag.allowance ? lag : undefined,
                policy: policyTable[code],
            });
        }
    }
    return { merged, sourceOf, disagreements, policyActions, strategy };
}
