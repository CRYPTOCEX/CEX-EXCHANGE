"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUN_STATE_CARRY_DEFAULT_MS = exports.RUST_OWNS_ENV = void 0;
exports.parseRustOwns = parseRustOwns;
exports.rustOwns = rustOwns;
exports.rustOwnsTokens = rustOwnsTokens;
exports.rustOwnsNothing = rustOwnsNothing;
exports.reportRustOwnsTokens = reportRustOwnsTokens;
exports.preserveRustOwnedRunState = preserveRustOwnedRunState;
const console_1 = require("@b/utils/console");
exports.RUST_OWNS_ENV = "RUST_OWNS";
const REFUSED_TOKENS = new Set(["all", "*"]);
const LOOP_TOKENS = [
    "eco.withdrawals",
    "eco.monitors",
    "backgroundDepositScanner",
    "btcDepositScanner",
    "spot.deposit.pollers",
    "spot.fill-watcher",
    "nft.lifecycle",
    "binary.settlement",
    "ws.relay.all",
    "vault.signing",
    "trading.bot",
    "binary.ai",
    "ai.market_maker",
    "copy.queue",
    "exchange.session",
];
const ECO_DEPOSITS_NAMESPACE = "eco.deposits.";
const WILDCARD_TOKENS = [`${ECO_DEPOSITS_NAMESPACE}*`];
function wildcardPrefix(token) {
    return WILDCARD_TOKENS.includes(token) ? token.slice(0, -1) : null;
}
const ECO_DEPOSITS_CHAIN = /^[a-z0-9][a-z0-9_-]*$/;
const LEASE_NAMESPACE = "lease.";
const LEASE_CANDIDATE = "lease.candidate";
const LEASE_KEYS = [
    "ecosystem-matching",
    "futures-matching",
    "forex-trading",
    "ai-market-maker",
    "dex-confirmations",
    "dex-pool-index",
];
const JOB_ALIASES = {
    processTradingBotEngine: ["trading.bot"],
    processBinaryAiEngine: ["binary.ai"],
    processAiMarketMakerEngine: ["ai.market_maker"],
    processPendingCopyTrades: ["copy.queue"],
    monitorCopyTradingStopLevels: ["copy.queue"],
};
let parsed = null;
const EMPTY = Object.freeze({
    list: Object.freeze([]),
    exact: new Set(),
    prefixes: Object.freeze([]),
    refused: Object.freeze([]),
    inert: Object.freeze([]),
});
function parseRustOwns(raw) {
    let text;
    try {
        text = typeof raw === "string" ? raw : "";
    }
    catch (_a) {
        return EMPTY;
    }
    if (!text.trim())
        return EMPTY;
    const list = [];
    const seen = new Set();
    const exact = new Set();
    const prefixes = [];
    const refused = [];
    const inert = [];
    for (const piece of text.split(",")) {
        const token = piece.trim();
        if (!token)
            continue;
        if (REFUSED_TOKENS.has(token)) {
            if (!refused.includes(token))
                refused.push(token);
            continue;
        }
        if (seen.has(token))
            continue;
        seen.add(token);
        list.push(token);
        const prefix = wildcardPrefix(token);
        if (prefix !== null) {
            exact.add(token);
            prefixes.push(prefix);
            continue;
        }
        if (token.includes("*")) {
            inert.push(token);
            continue;
        }
        exact.add(token);
    }
    return Object.freeze({
        list: Object.freeze(list),
        exact,
        prefixes: Object.freeze(prefixes),
        refused: Object.freeze(refused),
        inert: Object.freeze(inert),
    });
}
function tokens() {
    if (parsed)
        return parsed;
    try {
        parsed = parseRustOwns(process.env[exports.RUST_OWNS_ENV]);
    }
    catch (_a) {
        parsed = EMPTY;
    }
    return parsed;
}
function rustOwns(token) {
    try {
        const t = tokens();
        if (t.exact.size === 0)
            return false;
        if (typeof token !== "string" || token === "")
            return false;
        if (t.exact.has(token))
            return true;
        for (const prefix of t.prefixes) {
            if (token.startsWith(prefix))
                return true;
        }
        if (token.startsWith(LEASE_NAMESPACE) && t.exact.has(LEASE_CANDIDATE)) {
            return true;
        }
        const aliases = Object.prototype.hasOwnProperty.call(JOB_ALIASES, token)
            ? JOB_ALIASES[token]
            : undefined;
        if (aliases) {
            for (const alias of aliases) {
                if (t.exact.has(alias))
                    return true;
            }
        }
        return false;
    }
    catch (_a) {
        return false;
    }
}
function rustOwnsTokens() {
    return tokens().list;
}
function rustOwnsNothing() {
    return tokens().exact.size === 0;
}
function tokenIsKnown(token, jobNames) {
    if (jobNames.has(token))
        return true;
    if (LOOP_TOKENS.includes(token))
        return true;
    if (token === LEASE_CANDIDATE)
        return true;
    if (token.startsWith(LEASE_NAMESPACE)) {
        return LEASE_KEYS.includes(token.slice(LEASE_NAMESPACE.length));
    }
    if (wildcardPrefix(token) !== null)
        return true;
    if (token.startsWith(ECO_DEPOSITS_NAMESPACE)) {
        return ECO_DEPOSITS_CHAIN.test(token.slice(ECO_DEPOSITS_NAMESPACE.length));
    }
    return false;
}
let reported = false;
function reportRustOwnsTokens(registered, buildable = registered) {
    const empty = {
        tokens: [],
        unknown: [],
        refused: [],
        unregistered: [],
    };
    try {
        const t = tokens();
        if (t.list.length === 0 && t.refused.length === 0)
            return empty;
        const registeredSet = new Set(registered);
        const buildableSet = new Set(buildable);
        for (const name of registeredSet)
            buildableSet.add(name);
        const unknown = [];
        const unregistered = [];
        for (const token of t.list) {
            if (!tokenIsKnown(token, buildableSet)) {
                unknown.push(token);
            }
            else if (buildableSet.has(token) && !registeredSet.has(token)) {
                unregistered.push(token);
            }
        }
        const honoured = t.list.filter((token) => !unknown.includes(token));
        const report = {
            tokens: honoured,
            unknown,
            refused: t.refused,
            unregistered,
        };
        if (reported)
            return report;
        reported = true;
        if (honoured.length) {
            console_1.logger.info("RUST_OWNS", `Rust owns ${honoured.length} of this process's jobs and loops: ${honoured.join(", ")}. ` +
                "Node keeps them registered and skips their work.");
        }
        for (const token of t.refused) {
            console_1.logger.error("RUST_OWNS", `RUST_OWNS contains "${token}", which is refused: it would stand this process down ` +
                "for every job and every loop at once. Name the jobs you mean. Nothing was handed over for it.");
        }
        for (const token of unregistered) {
            console_1.logger.warn("RUST_OWNS", `RUST_OWNS names "${token}", which this build defines but has not registered here ` +
                "(its extension is switched off). Nothing on this process was going to run it.");
        }
        for (const token of unknown) {
            const nearMiss = [...buildableSet, ...LOOP_TOKENS].find((name) => name.toLowerCase() === token.toLowerCase());
            console_1.logger.error("RUST_OWNS", `RUST_OWNS names "${token}", and NOTHING on this process is called that. ` +
                (nearMiss
                    ? `Did you mean "${nearMiss}"? Tokens are case-sensitive, because the Rust scheduler's are. `
                    : "") +
                (t.inert.includes(token)
                    ? `"*" is not a wildcard here except in ${WILDCARD_TOKENS.join(", ")} — nothing was handed over for it. ` +
                        "Name the jobs, loops or lease keys you mean, one per comma. "
                    : "") +
                "This process is still doing that work. If the Rust side spelled it correctly, " +
                "BOTH stacks are now doing it.");
        }
        return report;
    }
    catch (_a) {
        return empty;
    }
}
exports.RUN_STATE_CARRY_DEFAULT_MS = 24 * 60 * 60 * 1000;
function entryLastRunAt(entry) {
    if (!entry || typeof entry !== "object")
        return null;
    const lastRun = entry.lastRun;
    if (lastRun == null)
        return null;
    if (typeof lastRun !== "string" && typeof lastRun !== "number" && !(lastRun instanceof Date)) {
        return null;
    }
    const at = new Date(lastRun).getTime();
    return Number.isFinite(at) ? at : null;
}
function preserveRustOwnedRunState(previousRaw, nodeSnapshot, options = {}) {
    var _a;
    const merged = { ...nodeSnapshot };
    if (rustOwnsNothing())
        return merged;
    const now = typeof options.now === "number" ? options.now : Date.now();
    const windows = (_a = options.staleAfterMs) !== null && _a !== void 0 ? _a : {};
    const fallbackWindow = typeof options.defaultStaleAfterMs === "number"
        ? options.defaultStaleAfterMs
        : exports.RUN_STATE_CARRY_DEFAULT_MS;
    let previous = {};
    try {
        const decoded = previousRaw ? JSON.parse(previousRaw) : null;
        if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
            previous = decoded;
        }
    }
    catch (_b) {
        previous = {};
    }
    const names = new Set([
        ...Object.keys(merged),
        ...Object.keys(previous),
    ]);
    for (const name of names) {
        if (!rustOwns(name))
            continue;
        if (!Object.prototype.hasOwnProperty.call(previous, name)) {
            delete merged[name];
            continue;
        }
        const entry = previous[name];
        const lastRunAt = entryLastRunAt(entry);
        const window = Object.prototype.hasOwnProperty.call(windows, name)
            ? windows[name]
            : fallbackWindow;
        if (lastRunAt === null || now - lastRunAt > window) {
            delete merged[name];
            continue;
        }
        merged[name] = entry;
    }
    return merged;
}
