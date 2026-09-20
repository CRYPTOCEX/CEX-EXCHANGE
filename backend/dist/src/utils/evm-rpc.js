"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactEndpointCredentials = redactEndpointCredentials;
exports.withTimeout = withTimeout;
exports.probeEvmRpcBlockNumber = probeEvmRpcBlockNumber;
exports.probeEvmWssBlockNumber = probeEvmWssBlockNumber;
exports.probeAnyEvmRpcBlockNumber = probeAnyEvmRpcBlockNumber;
exports.probeAnyEvmWssBlockNumber = probeAnyEvmWssBlockNumber;
const rpc_pool_1 = require("./rpc-pool");
const ws_1 = __importDefault(require("ws"));
function redactEndpointCredentials(message) {
    if (!message)
        return message;
    return message.replace(/https?:\/\/[^\s"')\]]+/gi, (url) => {
        try {
            const parsed = new URL(url);
            return `${parsed.protocol}//${parsed.host}/<redacted>`;
        }
        catch (_a) {
            return "<redacted endpoint>";
        }
    });
}
async function withTimeout(promise, timeoutMs, message) {
    var _a;
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(message)), timeoutMs);
            }),
        ]);
    }
    catch (error) {
        const raw = String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : "");
        const clean = redactEndpointCredentials(raw);
        if (clean !== raw) {
            const replacement = new Error(clean);
            replacement.code = error === null || error === void 0 ? void 0 : error.code;
            replacement.shortMessage = (error === null || error === void 0 ? void 0 : error.shortMessage)
                ? redactEndpointCredentials(String(error.shortMessage))
                : undefined;
            throw replacement;
        }
        throw error;
    }
    finally {
        clearTimeout(timer);
    }
}
async function probeEvmRpcBlockNumber(url, timeoutMs = 8000) {
    var _a;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: [],
        }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.text();
    let json = null;
    try {
        json = JSON.parse(body);
    }
    catch (_b) {
    }
    const rpcError = typeof (json === null || json === void 0 ? void 0 : json.error) === "string" ? json.error : (_a = json === null || json === void 0 ? void 0 : json.error) === null || _a === void 0 ? void 0 : _a.message;
    if (!res.ok) {
        const detail = rpcError || body.slice(0, 200).replace(/\s+/g, " ").trim();
        const status = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
        throw new Error(detail ? `${status}: ${detail}` : status);
    }
    if (json === null || json === void 0 ? void 0 : json.error)
        throw new Error(rpcError || "RPC error");
    const block = parseInt(json === null || json === void 0 ? void 0 : json.result, 16);
    if (!Number.isFinite(block))
        throw new Error("RPC response did not include a block number");
    return block;
}
async function probeEvmWssBlockNumber(url, timeoutMs = 8000) {
    const normalized = url.replace(/\/+$/, "");
    return await new Promise((resolve, reject) => {
        let settled = false;
        const ws = new ws_1.default(normalized, { handshakeTimeout: timeoutMs });
        const finish = (err, block) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                ws.terminate();
            }
            catch (_a) {
            }
            if (err)
                reject(err);
            else
                resolve(block);
        };
        const timer = setTimeout(() => finish(new Error(`WebSocket RPC timeout after ${timeoutMs}ms`)), timeoutMs);
        ws.on("open", () => {
            ws.send(JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_blockNumber",
                params: [],
            }));
        });
        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if ((msg === null || msg === void 0 ? void 0 : msg.id) !== 1)
                    return;
                if (msg.error)
                    return finish(new Error(msg.error.message || "RPC error"));
                const block = parseInt(msg.result, 16);
                if (Number.isFinite(block))
                    return finish(null, block);
                finish(new Error("WebSocket RPC did not return a block number"));
            }
            catch (_a) {
                finish(new Error("WebSocket RPC returned non-JSON data"));
            }
        });
        ws.on("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
        ws.on("close", () => finish(new Error("WebSocket closed before responding")));
    });
}
async function probeAnyEvmRpcBlockNumber(value, timeoutMs = 8000) {
    const endpoints = (0, rpc_pool_1.parseRpcEndpoints)(value);
    if (endpoints.length === 0) {
        throw new Error("No RPC endpoint configured");
    }
    let blockNumber = null;
    let answered = 0;
    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const block = await probeEvmRpcBlockNumber(endpoint, timeoutMs);
            answered += 1;
            if (blockNumber === null)
                blockNumber = block;
        }
        catch (error) {
            lastError = error;
        }
    }
    if (blockNumber === null) {
        throw lastError !== null && lastError !== void 0 ? lastError : new Error("No RPC endpoint answered");
    }
    return { blockNumber, answered, total: endpoints.length };
}
async function probeAnyEvmWssBlockNumber(value, timeoutMs = 8000) {
    const endpoints = (0, rpc_pool_1.parseRpcEndpoints)(value);
    if (endpoints.length === 0) {
        throw new Error("No WebSocket RPC endpoint configured");
    }
    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            return await probeEvmWssBlockNumber(endpoint, timeoutMs);
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError !== null && lastError !== void 0 ? lastError : new Error("No WebSocket RPC endpoint answered");
}
