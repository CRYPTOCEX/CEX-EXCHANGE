"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcNotConfiguredError = exports.RpcAllEndpointsFailedError = void 0;
exports.withRpcFailover = withRpcFailover;
exports.chainRpcPool = chainRpcPool;
exports.resetChainRpcPools = resetChainRpcPools;
const rpc_pool_1 = require("./rpc-pool");
const console_1 = require("./console");
class RpcAllEndpointsFailedError extends Error {
    constructor(chain, operation, attempts, poolDescription, lastError) {
        const detail = attempts.length
            ? attempts[attempts.length - 1].error
            : "no endpoint was reachable";
        super(`${chain}: every configured RPC endpoint failed for ${operation} ` +
            `(${attempts.length} tried). Last error: ${detail}. Pool: ${poolDescription}`);
        this.statusCode = 503;
        this.name = "RpcAllEndpointsFailedError";
        this.chain = chain;
        this.operation = operation;
        this.attempts = attempts;
        this.lastError = lastError;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.RpcAllEndpointsFailedError = RpcAllEndpointsFailedError;
class RpcNotConfiguredError extends Error {
    constructor(chain) {
        super(`${chain}: no RPC endpoint is configured. Set ${chain}_<NETWORK>_RPC ` +
            `(one URL, or several separated by commas for failover).`);
        this.statusCode = 503;
        this.name = "RpcNotConfiguredError";
        this.chain = chain;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.RpcNotConfiguredError = RpcNotConfiguredError;
async function withRpcFailover(pool, chain, operation, fn, options = {}) {
    var _a, _b, _c;
    const now = (_a = options.now) !== null && _a !== void 0 ? _a : (() => Date.now());
    const isRetryable = (_b = options.isRetryable) !== null && _b !== void 0 ? _b : (() => true);
    if (pool.size === 0)
        throw new RpcNotConfiguredError(chain);
    if (pool.size === 1) {
        const url = pool.pick();
        const startedAt = now();
        try {
            const result = await fn(url);
            pool.reportSuccess(url, now() - startedAt);
            return result;
        }
        catch (error) {
            if (isRetryable(error))
                pool.reportFailure(url, error);
            throw error;
        }
    }
    const order = pool.snapshot().map((state) => state.url);
    const attempted = new Set();
    const attempts = [];
    let lastError = null;
    for (let attempt = 0; attempt < pool.size; attempt++) {
        let url = pool.pick();
        if (!url || attempted.has(url)) {
            url = (_c = order.find((candidate) => !attempted.has(candidate))) !== null && _c !== void 0 ? _c : null;
        }
        if (!url)
            break;
        attempted.add(url);
        const startedAt = now();
        try {
            const result = await fn(url);
            pool.reportSuccess(url, now() - startedAt);
            if (attempt > 0) {
                console_1.logger.warn("RPC", `${chain}: ${operation} failed over to ${(0, rpc_pool_1.redact)(url)} - pool now ${pool.describe()}`);
            }
            return result;
        }
        catch (error) {
            if (!isRetryable(error))
                throw error;
            lastError = error;
            pool.reportFailure(url, error);
            attempts.push({ url: (0, rpc_pool_1.redact)(url), error: describeError(error) });
            console_1.logger.warn("RPC", `${chain}: ${operation} failed on ${(0, rpc_pool_1.redact)(url)} - ${describeError(error)}`);
        }
    }
    const failure = new RpcAllEndpointsFailedError(chain, operation, attempts, pool.describe(), lastError);
    console_1.logger.error("RPC", failure.message);
    throw failure;
}
function describeError(error) {
    if (!error)
        return "unknown error";
    if (typeof error === "string")
        return error.slice(0, 300);
    const message = error === null || error === void 0 ? void 0 : error.message;
    return typeof message === "string"
        ? message.slice(0, 300)
        : String(error).slice(0, 300);
}
const pools = new Map();
function chainRpcPool(chain, network, defaults = [], env = process.env) {
    const httpOnly = (urls) => urls.filter((url) => /^https?:\/\//i.test(url));
    const configured = httpOnly((0, rpc_pool_1.rpcEndpointsFromEnv)(chain, network, env));
    const endpoints = configured.length
        ? configured
        : httpOnly((0, rpc_pool_1.parseRpcEndpoints)(...defaults));
    const key = `${chain}_${String(network).toUpperCase()}`;
    const fingerprint = endpoints.join("|");
    const existing = pools.get(key);
    if (existing && existing.fingerprint === fingerprint)
        return existing.pool;
    const pool = new rpc_pool_1.RpcPool(endpoints);
    pools.set(key, { fingerprint, pool });
    return pool;
}
function resetChainRpcPools() {
    pools.clear();
}
