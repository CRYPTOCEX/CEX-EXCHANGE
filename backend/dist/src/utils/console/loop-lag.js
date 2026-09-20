"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLoopLagMonitor = startLoopLagMonitor;
exports.stalledMsWithin = stalledMsWithin;
exports.worstStallMs = worstStallMs;
exports.__resetLoopLagForTests = __resetLoopLagForTests;
const TICK_MS = 50;
const STALL_MIN_MS = 100;
const RING = 256;
const stalls = [];
let ringAt = 0;
let timer = null;
let last = 0;
let worstMs = 0;
function startLoopLagMonitor() {
    var _a;
    if (timer)
        return;
    last = Date.now();
    timer = setInterval(() => {
        const now = Date.now();
        const lag = now - last - TICK_MS;
        last = now;
        if (lag >= STALL_MIN_MS) {
            const stall = { start: now - lag, end: now };
            if (stalls.length < RING)
                stalls.push(stall);
            else
                stalls[ringAt] = stall;
            ringAt = (ringAt + 1) % RING;
            if (lag > worstMs)
                worstMs = lag;
        }
    }, TICK_MS);
    (_a = timer.unref) === null || _a === void 0 ? void 0 : _a.call(timer);
}
function stalledMsWithin(t0, t1) {
    let total = 0;
    for (const s of stalls) {
        const a = Math.max(s.start, t0);
        const b = Math.min(s.end, t1);
        if (b > a)
            total += b - a;
    }
    return Math.round(total);
}
function worstStallMs() {
    return worstMs;
}
function __resetLoopLagForTests() {
    stalls.length = 0;
    ringAt = 0;
    worstMs = 0;
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}
