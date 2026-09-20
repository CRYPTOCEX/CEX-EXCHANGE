"use strict";
const states = new WeakMap();
async function readMarketData(exchange, watchMethod, fetchMethod, args, options = {}) {
    let state = states.get(exchange);
    if (!state) { state = new Map(); states.set(exchange, state); }
    const key = `${watchMethod}:${JSON.stringify(args)}`;
    const current = state.get(key) || { retryAt: 0, pending: null };
    state.set(key, current);
    if (current.rateLimitError && Date.now() < current.retryAt) throw current.rateLimitError;
    current.rateLimitError = null;
    if (exchange.has[watchMethod] && !current.pending && Date.now() >= current.retryAt) {
        let timer;
        try {
            const pending = Promise.resolve().then(() => exchange[watchMethod](...args));
            current.pending = pending;
            pending.then(() => { current.pending = null; }, () => { current.pending = null; });
            return await Promise.race([pending, new Promise((resolve, reject) => {
                timer = setTimeout(() => reject(new Error("Market stream timed out")), options.timeoutMs ?? 15000);
            })]);
        } catch (error) {
            current.retryAt = Date.now() + 60000;
            if (["RateLimitExceeded", "DDoSProtection"].includes(error.name)) {
                current.rateLimitError = error;
                throw error;
            }
            if (!exchange.has[fetchMethod]) throw error;
        } finally { clearTimeout(timer); }
    }
    if (!exchange.has[fetchMethod]) throw new Error(`No ${fetchMethod} fallback is available`);
    await new Promise(resolve => setTimeout(resolve, options.pollDelayMs ?? 1000));
    return exchange[fetchMethod](...args);
}
module.exports = { readMarketData };
