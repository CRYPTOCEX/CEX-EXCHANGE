"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcPool = void 0;
exports.parseRpcEndpoints = parseRpcEndpoints;
exports.rpcEndpointsFromEnv = rpcEndpointsFromEnv;
exports.redact = redact;
const DEFAULTS = {
    failureThreshold: 3,
    baseCooldownMs: 15000,
    maxCooldownMs: 300000,
    latencyAlpha: 0.1,
    switchMargin: 0.2,
};
function parseRpcEndpoints(...values) {
    const out = [];
    const seen = new Set();
    for (const value of values) {
        if (!value || typeof value !== "string")
            continue;
        for (const piece of value.split(/[,;\s]+/)) {
            const url = piece.trim().replace(/\/+$/, "");
            if (!url)
                continue;
            if (!/^(https?|wss?):\/\//i.test(url))
                continue;
            const key = url.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push(url);
        }
    }
    return out;
}
function rpcEndpointsFromEnv(chainSymbol, networkName, env = process.env) {
    const prefix = `${chainSymbol}_${String(networkName).toUpperCase()}`;
    return parseRpcEndpoints(env[`${prefix}_RPC`], env[`${prefix}_RPC_FALLBACK`]);
}
class RpcPool {
    constructor(urls, options = {}) {
        var _a, _b, _c, _d, _e, _f;
        this.states = new Map();
        this.order = [];
        this.current = null;
        this.options = {
            now: (_a = options.now) !== null && _a !== void 0 ? _a : (() => Date.now()),
            failureThreshold: (_b = options.failureThreshold) !== null && _b !== void 0 ? _b : DEFAULTS.failureThreshold,
            baseCooldownMs: (_c = options.baseCooldownMs) !== null && _c !== void 0 ? _c : DEFAULTS.baseCooldownMs,
            maxCooldownMs: (_d = options.maxCooldownMs) !== null && _d !== void 0 ? _d : DEFAULTS.maxCooldownMs,
            latencyAlpha: (_e = options.latencyAlpha) !== null && _e !== void 0 ? _e : DEFAULTS.latencyAlpha,
            switchMargin: (_f = options.switchMargin) !== null && _f !== void 0 ? _f : DEFAULTS.switchMargin,
        };
        for (const url of urls) {
            if (this.states.has(url))
                continue;
            this.order.push(url);
            this.states.set(url, {
                url,
                latencyMs: null,
                consecutiveFailures: 0,
                cooldownUntil: 0,
                lastError: null,
                successes: 0,
                failures: 0,
            });
        }
    }
    get size() {
        return this.order.length;
    }
    snapshot() {
        return this.order.map((url) => ({ ...this.states.get(url) }));
    }
    pick() {
        var _a, _b, _c, _d;
        if (this.order.length === 0)
            return null;
        const now = this.options.now();
        const available = this.order
            .map((url) => this.states.get(url))
            .filter((state) => state.cooldownUntil <= now);
        if (available.length === 0) {
            let soonest = this.states.get(this.order[0]);
            for (const url of this.order) {
                const state = this.states.get(url);
                if (state.cooldownUntil < soonest.cooldownUntil)
                    soonest = state;
            }
            this.current = soonest.url;
            return soonest.url;
        }
        const untried = available.find((state) => state.latencyMs === null);
        if (untried) {
            this.current = untried.url;
            return untried.url;
        }
        let best = available[0];
        for (const state of available) {
            if (((_a = state.latencyMs) !== null && _a !== void 0 ? _a : Infinity) < ((_b = best.latencyMs) !== null && _b !== void 0 ? _b : Infinity)) {
                best = state;
            }
        }
        const incumbent = available.find((state) => state.url === this.current);
        if (incumbent &&
            incumbent.url !== best.url &&
            ((_c = best.latencyMs) !== null && _c !== void 0 ? _c : Infinity) >
                ((_d = incumbent.latencyMs) !== null && _d !== void 0 ? _d : Infinity) * (1 - this.options.switchMargin)) {
            return incumbent.url;
        }
        this.current = best.url;
        return best.url;
    }
    reportSuccess(url, latencyMs) {
        const state = this.states.get(url);
        if (!state)
            return;
        state.consecutiveFailures = 0;
        state.cooldownUntil = 0;
        state.lastError = null;
        state.successes += 1;
        if (typeof latencyMs === "number" && Number.isFinite(latencyMs) && latencyMs >= 0) {
            state.latencyMs =
                state.latencyMs === null
                    ? latencyMs
                    : state.latencyMs * (1 - this.options.latencyAlpha) +
                        latencyMs * this.options.latencyAlpha;
        }
    }
    reportFailure(url, error) {
        const state = this.states.get(url);
        if (!state)
            return;
        state.consecutiveFailures += 1;
        state.failures += 1;
        state.lastError = describeError(error);
        if (state.consecutiveFailures >= this.options.failureThreshold) {
            const over = state.consecutiveFailures - this.options.failureThreshold;
            const backoff = Math.min(this.options.baseCooldownMs * Math.pow(2, over), this.options.maxCooldownMs);
            state.cooldownUntil = this.options.now() + backoff;
        }
    }
    isCoolingDown(url) {
        const state = this.states.get(url);
        if (!state)
            return false;
        return state.cooldownUntil > this.options.now();
    }
    describe() {
        return this.snapshot()
            .map((s) => {
            const latency = s.latencyMs === null ? "untried" : `${Math.round(s.latencyMs)}ms`;
            const cooling = s.cooldownUntil > this.options.now() ? " COOLING" : "";
            return `${redact(s.url)} (${latency}, ${s.failures} fail${cooling})`;
        })
            .join(", ");
    }
}
exports.RpcPool = RpcPool;
function describeError(error) {
    if (!error)
        return null;
    if (typeof error === "string")
        return error.slice(0, 300);
    const message = error === null || error === void 0 ? void 0 : error.message;
    return typeof message === "string" ? message.slice(0, 300) : String(error).slice(0, 300);
}
function redact(url) {
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
            segments[segments.length - 1] = "***";
            parsed.pathname = `/${segments.join("/")}`;
        }
        if (parsed.username || parsed.password) {
            parsed.username = "***";
            parsed.password = "";
        }
        parsed.search = "";
        return parsed.toString();
    }
    catch (_a) {
        return "(unparseable endpoint)";
    }
}
