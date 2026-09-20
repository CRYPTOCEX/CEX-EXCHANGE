"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installEthersLogThrottle = installEthersLogThrottle;
const MARKERS = [
    "JsonRpcProvider failed to detect network and cannot start up",
    "failed to bootstrap network detection",
];
const SUMMARY_INTERVAL_MS = 60000;
let installed = false;
function throttled(original) {
    let windowStart = 0;
    let suppressed = 0;
    return (...args) => {
        const first = args[0];
        const matches = typeof first === "string" && MARKERS.some((m) => first.includes(m));
        if (!matches) {
            original(...args);
            return;
        }
        const now = Date.now();
        if (now - windowStart >= SUMMARY_INTERVAL_MS) {
            if (suppressed > 0) {
                original(`[ethers] suppressed ${suppressed} repeated network-detection retry logs in the last minute — an RPC endpoint is unreachable or misconfigured`);
            }
            windowStart = now;
            suppressed = 0;
            original(...args);
        }
        else {
            suppressed++;
        }
    };
}
function installEthersLogThrottle() {
    if (installed)
        return;
    installed = true;
    console.log = throttled(console.log.bind(console));
    console.error = throttled(console.error.bind(console));
}
