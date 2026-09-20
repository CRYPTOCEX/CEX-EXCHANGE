"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletBusyError = void 0;
exports.walletTxConcurrency = walletTxConcurrency;
exports.walletQueueTimeoutMs = walletQueueTimeoutMs;
exports.walletQueueMaxPerKey = walletQueueMaxPerKey;
exports.walletQueueMaxSlot = walletQueueMaxSlot;
exports.walletSerialKey = walletSerialKey;
exports.withWalletSerial = withWalletSerial;
exports.walletSerialStats = walletSerialStats;
exports.queuedForWalletKey = queuedForWalletKey;
exports.__resetWalletSerialForTests = __resetWalletSerialForTests;
const errors_1 = require("./errors");
class WalletBusyError extends errors_1.WalletError {
    constructor(key, waitedMs, reason = "deadline", queued = 0) {
        super(reason === "queue_full"
            ? `The wallet is busy: ${queued} ledger writes are already waiting for it and this one was refused without waiting. Please retry.`
            : `The wallet is busy: a ledger write waited ${Math.round(waitedMs)}ms for its turn and gave up. Please retry.`, "WALLET_BUSY", 503, reason === "queue_full" ? { key, waitedMs: 0, reason, queued } : { key, waitedMs: Math.round(waitedMs) });
        this.reason = reason;
    }
}
exports.WalletBusyError = WalletBusyError;
const heldKeys = new Set();
const keyWaiters = new Map();
let active = 0;
const capWaiters = [];
let longestWaitMs = 0;
let refusedImmediateForKey = 0;
let refusedImmediateForSlot = 0;
function positiveInt(raw, fallback) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
function nonNegativeInt(raw, fallback) {
    if (raw === undefined || raw.trim() === "")
        return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
function walletTxConcurrency() {
    const poolMax = positiveInt(process.env.DB_POOL_MAX, 25);
    return positiveInt(process.env.WALLET_TX_CONCURRENCY, Math.max(4, Math.floor(poolMax / 2)));
}
function walletQueueTimeoutMs() {
    return positiveInt(process.env.WALLET_QUEUE_TIMEOUT_MS, 30000);
}
function walletQueueMaxPerKey() {
    return nonNegativeInt(process.env.WALLET_QUEUE_MAX_PER_KEY, 0);
}
function walletQueueMaxSlot() {
    return nonNegativeInt(process.env.WALLET_QUEUE_MAX_SLOT, 0);
}
function walletSerialKey(op) {
    var _a, _b, _c;
    if (op.walletId)
        return `id:${op.walletId}`;
    return `w:${(_a = op.userId) !== null && _a !== void 0 ? _a : ""}|${String((_b = op.walletType) !== null && _b !== void 0 ? _b : "").toUpperCase()}|${String((_c = op.currency) !== null && _c !== void 0 ? _c : "").toUpperCase()}`;
}
function acquireKey(key, deadline) {
    if (!heldKeys.has(key)) {
        heldKeys.add(key);
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        const waiter = { grant: () => resolve() };
        const queue = keyWaiters.get(key);
        if (queue)
            queue.push(waiter);
        else
            keyWaiters.set(key, [waiter]);
        waiter.timer = setTimeout(() => {
            const q = keyWaiters.get(key);
            if (q) {
                const i = q.indexOf(waiter);
                if (i >= 0)
                    q.splice(i, 1);
                if (q.length === 0)
                    keyWaiters.delete(key);
            }
            reject(new WalletBusyError(key, Date.now() - (deadline - walletQueueTimeoutMs())));
        }, Math.max(0, deadline - Date.now()));
        (_b = (_a = waiter.timer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    });
}
function releaseKey(key) {
    const queue = keyWaiters.get(key);
    const next = queue === null || queue === void 0 ? void 0 : queue.shift();
    if (queue && queue.length === 0)
        keyWaiters.delete(key);
    if (next) {
        if (next.timer)
            clearTimeout(next.timer);
        next.grant();
        return;
    }
    heldKeys.delete(key);
}
function acquireSlot(deadline, key) {
    if (active < walletTxConcurrency()) {
        active++;
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        const waiter = { grant: () => resolve() };
        capWaiters.push(waiter);
        waiter.timer = setTimeout(() => {
            const i = capWaiters.indexOf(waiter);
            if (i >= 0)
                capWaiters.splice(i, 1);
            reject(new WalletBusyError(key, Date.now() - (deadline - walletQueueTimeoutMs())));
        }, Math.max(0, deadline - Date.now()));
        (_b = (_a = waiter.timer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    });
}
function releaseSlot() {
    const next = capWaiters.shift();
    if (next) {
        if (next.timer)
            clearTimeout(next.timer);
        next.grant();
        return;
    }
    active = Math.max(0, active - 1);
}
function refuseHoldIfQueueFull(ordered) {
    var _a;
    var _b;
    const maxPerKey = walletQueueMaxPerKey();
    if (maxPerKey > 0) {
        for (const key of ordered) {
            const queued = (_b = (_a = keyWaiters.get(key)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
            if (queued >= maxPerKey) {
                refusedImmediateForKey++;
                throw new WalletBusyError(key, 0, "queue_full", queued);
            }
        }
    }
    const maxSlot = walletQueueMaxSlot();
    if (maxSlot > 0 && capWaiters.length >= maxSlot) {
        refusedImmediateForSlot++;
        throw new WalletBusyError(ordered.join("+"), 0, "queue_full", capWaiters.length);
    }
}
async function withWalletSerial(keys, fn, caller = "other") {
    const ordered = Array.from(new Set(keys.filter(Boolean))).sort();
    if (caller === "hold")
        refuseHoldIfQueueFull(ordered);
    const startedAt = Date.now();
    const deadline = startedAt + walletQueueTimeoutMs();
    const taken = [];
    let slot = false;
    try {
        for (const key of ordered) {
            await acquireKey(key, deadline);
            taken.push(key);
        }
        await acquireSlot(deadline, ordered.join("+"));
        slot = true;
        const waited = Date.now() - startedAt;
        if (waited > longestWaitMs)
            longestWaitMs = waited;
        return await fn();
    }
    finally {
        if (slot)
            releaseSlot();
        for (let i = taken.length - 1; i >= 0; i--)
            releaseKey(taken[i]);
    }
}
function walletSerialStats() {
    let queuedForKey = 0;
    for (const q of keyWaiters.values())
        queuedForKey += q.length;
    return {
        active,
        limit: walletTxConcurrency(),
        queuedForKey,
        queuedForSlot: capWaiters.length,
        busyKeys: heldKeys.size,
        longestWaitMs,
        refusedImmediateForKey,
        refusedImmediateForSlot,
    };
}
function queuedForWalletKey(key) {
    var _a;
    var _b;
    return (_b = (_a = keyWaiters.get(key)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
}
function __resetWalletSerialForTests() {
    for (const q of keyWaiters.values())
        for (const w of q)
            if (w.timer)
                clearTimeout(w.timer);
    for (const w of capWaiters)
        if (w.timer)
            clearTimeout(w.timer);
    keyWaiters.clear();
    heldKeys.clear();
    capWaiters.length = 0;
    active = 0;
    longestWaitMs = 0;
    refusedImmediateForKey = 0;
    refusedImmediateForSlot = 0;
}
