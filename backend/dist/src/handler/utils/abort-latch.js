"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAbort = onAbort;
exports.__abortHandlerCount = __abortHandlerCount;
const subscribers = new WeakMap();
function onAbort(res, handler) {
    const existing = subscribers.get(res);
    if (existing) {
        existing.push(handler);
        return;
    }
    const handlers = [handler];
    subscribers.set(res, handlers);
    res.onAborted(() => {
        for (const fn of [...handlers]) {
            try {
                fn();
            }
            catch (_a) {
            }
        }
    });
}
function __abortHandlerCount(res) {
    var _a;
    var _b;
    return (_b = (_a = subscribers.get(res)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
}
