"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRealFillSink = registerRealFillSink;
exports.unregisterRealFillSink = unregisterRealFillSink;
exports.publishRealFill = publishRealFill;
exports.realFillSinkCount = realFillSinkCount;
const sinks = new Map();
function registerRealFillSink(key, sink) {
    sinks.set(key, sink);
}
function unregisterRealFillSink(key) {
    return sinks.delete(key);
}
function publishRealFill(event) {
    const dispatch = { sinks: sinks.size, claimed: 0, failed: 0 };
    for (const [, sink] of sinks) {
        try {
            if (sink(event))
                dispatch.claimed++;
        }
        catch (_a) {
            dispatch.failed++;
        }
    }
    return dispatch;
}
function realFillSinkCount() {
    return sinks.size;
}
