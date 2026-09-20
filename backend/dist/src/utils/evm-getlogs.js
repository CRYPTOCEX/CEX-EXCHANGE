"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcErrorDetail = rpcErrorDetail;
exports.rpcErrorSummary = rpcErrorSummary;
exports.classifyRpcLimit = classifyRpcLimit;
exports.rememberedChunkBlocks = rememberedChunkBlocks;
exports.resetLogSweepMemory = resetLogSweepMemory;
exports.sweepLogs = sweepLogs;
const evm_rpc_1 = require("./evm-rpc");
const DEFAULTS = {
    chunkBlocks: 1000,
    minChunkBlocks: 25,
    maxRequests: 48,
    maxAttemptsPerChunk: 4,
    timeoutMs: 20000,
    pauseMs: 120,
    backoffMs: 500,
    maxBackoffMs: 4000,
};
const RANGE_PATTERNS = [
    "block range",
    "range is too",
    "range too large",
    "exceed maximum block",
    "maximum block range",
    "query returned more than",
    "returned more than",
    "more than 10000 results",
    "response size",
    "log response size",
    "too many logs",
    "too many results",
    "result set too large",
    "query timeout exceeded",
    "eth_getlogs is limited",
];
const RATE_PATTERNS = [
    "rate limit",
    "too many requests",
    "request limit",
    "requests per",
    "compute unit",
    "capacity",
    "throttl",
    "quota",
    "credits",
    "daily request count exceeded",
];
const AMBIGUOUS_PATTERNS = [
    "limit exceeded",
    "exceeds limit",
    "exceeded limit",
    "limit reached",
];
const TIMEOUT_PATTERNS = ["timeout", "timed out", "aborted"];
const AMBIGUOUS_CODES = new Set([-32005, -32029]);
const NESTED_KEYS = ["error", "info", "data", "cause"];
function numeric(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function rpcErrorDetail(error) {
    const outer = (typeof (error === null || error === void 0 ? void 0 : error.shortMessage) === "string" && error.shortMessage) ||
        (typeof (error === null || error === void 0 ? void 0 : error.message) === "string" && error.message) ||
        (typeof error === "string" ? error : "") ||
        "";
    const chain = [];
    const seen = new Set();
    let node = error;
    while (node && typeof node === "object" && !seen.has(node)) {
        seen.add(node);
        chain.push(node);
        let next = null;
        for (const key of NESTED_KEYS) {
            const child = node[key];
            if (child && typeof child === "object") {
                next = child;
                break;
            }
        }
        node = next;
    }
    for (let i = chain.length - 1; i >= 0; i--) {
        const code = numeric(chain[i].code);
        if (code === null)
            continue;
        const message = typeof chain[i].message === "string" && chain[i].message
            ? chain[i].message
            : outer;
        return { code, message: message.slice(0, 300) };
    }
    const codeMatch = outer.match(/"code"\s*:\s*(-?\d+)/);
    const messageMatch = outer.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return {
        code: codeMatch ? Number(codeMatch[1]) : null,
        message: (messageMatch ? messageMatch[1] : outer).slice(0, 300),
    };
}
function rpcErrorSummary(error) {
    const { code, message } = rpcErrorDetail(error);
    const text = (message || "RPC call failed").replace(/\s+/g, " ").trim().slice(0, 160);
    return code === null ? text : `${text} (${code})`;
}
function classifyRpcLimit(error) {
    var _a, _b;
    const { code, message } = rpcErrorDetail(error);
    const text = `${message} ${String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : "")}`.toLowerCase();
    const status = (_b = numeric(error === null || error === void 0 ? void 0 : error.status)) !== null && _b !== void 0 ? _b : numeric(error === null || error === void 0 ? void 0 : error.statusCode);
    if (RANGE_PATTERNS.some((p) => text.includes(p)))
        return { shrink: true, wait: false };
    if (status === 429 || RATE_PATTERNS.some((p) => text.includes(p))) {
        return { shrink: false, wait: true };
    }
    if (AMBIGUOUS_PATTERNS.some((p) => text.includes(p)))
        return { shrink: true, wait: true };
    if (code !== null && AMBIGUOUS_CODES.has(code))
        return { shrink: true, wait: true };
    if (code === -32602)
        return { shrink: true, wait: false };
    if (TIMEOUT_PATTERNS.some((p) => text.includes(p)))
        return { shrink: true, wait: true };
    return null;
}
const learnedChunk = new Map();
function rememberedChunkBlocks(chain, preferred) {
    const learned = learnedChunk.get(chain);
    if (!learned)
        return preferred;
    return Math.max(1, Math.min(preferred, learned));
}
function resetLogSweepMemory(chain) {
    if (chain)
        learnedChunk.delete(chain);
    else
        learnedChunk.clear();
}
const realSleep = (ms) => ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
async function sweepLogs(provider, request) {
    var _a, _b, _c, _d, _e, _f, _g;
    const preferred = Math.max(1, Math.trunc((_a = request.chunkBlocks) !== null && _a !== void 0 ? _a : DEFAULTS.chunkBlocks));
    const floor = Math.max(1, Math.min(preferred, Math.trunc((_b = request.minChunkBlocks) !== null && _b !== void 0 ? _b : DEFAULTS.minChunkBlocks)));
    const maxRequests = Math.max(1, Math.trunc((_c = request.maxRequests) !== null && _c !== void 0 ? _c : DEFAULTS.maxRequests));
    const maxAttempts = Math.max(1, Math.trunc((_d = request.maxAttemptsPerChunk) !== null && _d !== void 0 ? _d : DEFAULTS.maxAttemptsPerChunk));
    const timeoutMs = Math.max(1, Math.trunc((_e = request.timeoutMs) !== null && _e !== void 0 ? _e : DEFAULTS.timeoutMs));
    const pauseMs = Math.max(0, Math.trunc((_f = request.pauseMs) !== null && _f !== void 0 ? _f : DEFAULTS.pauseMs));
    const sleep = (_g = request.sleep) !== null && _g !== void 0 ? _g : realSleep;
    const from = Math.max(0, Math.trunc(request.fromBlock));
    const to = Math.trunc(request.toBlock);
    let size = Math.max(floor, rememberedChunkBlocks(request.chain, preferred));
    const startedAt = size;
    let shrank = false;
    const logs = [];
    const gaps = [];
    let requests = 0;
    let start = from;
    let attempts = 0;
    let backoff = DEFAULTS.backoffMs;
    let first = true;
    while (start <= to) {
        if (requests >= maxRequests) {
            gaps.push({
                fromBlock: start,
                toBlock: to,
                reason: `request budget of ${maxRequests} exhausted`,
            });
            break;
        }
        const end = Math.min(to, start + size - 1);
        if (!first && pauseMs > 0)
            await sleep(pauseMs);
        first = false;
        try {
            requests++;
            const chunk = await (0, evm_rpc_1.withTimeout)(Promise.resolve(provider.getLogs({ ...request.filter, fromBlock: start, toBlock: end })), timeoutMs, `getLogs timed out on ${request.chain} blocks ${start}-${end}`);
            if (Array.isArray(chunk))
                logs.push(...chunk);
            start = end + 1;
            attempts = 0;
            backoff = DEFAULTS.backoffMs;
        }
        catch (error) {
            const remedy = classifyRpcLimit(error);
            attempts++;
            if (!remedy || attempts >= maxAttempts) {
                gaps.push({ fromBlock: start, toBlock: end, reason: rpcErrorSummary(error) });
                start = end + 1;
                attempts = 0;
                backoff = DEFAULTS.backoffMs;
                continue;
            }
            if (remedy.shrink && size > floor) {
                size = Math.max(floor, Math.floor(size / 2));
                shrank = true;
            }
            if (remedy.wait) {
                await sleep(backoff);
                backoff = Math.min(DEFAULTS.maxBackoffMs, backoff * 2);
            }
        }
    }
    if (shrank) {
        learnedChunk.set(request.chain, size);
    }
    else if (requests > 0 && gaps.length === 0 && startedAt < preferred) {
        learnedChunk.set(request.chain, Math.min(preferred, Math.ceil(startedAt * 1.5)));
    }
    return { logs, gaps, chunkBlocks: size, requests };
}
