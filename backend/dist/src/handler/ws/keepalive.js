"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keepaliveReply = exports.classifyKeepaliveFrame = void 0;
const classifyKeepaliveFrame = (frame) => {
    if (!frame || typeof frame !== "object" || frame.payload)
        return null;
    if (frame.type === "PING" || frame.action === "PING")
        return "PING";
    if (frame.type === "PONG" || frame.action === "PONG")
        return "PONG";
    return null;
};
exports.classifyKeepaliveFrame = classifyKeepaliveFrame;
const keepaliveReply = (ts = Date.now()) => ({
    stream: "pong",
    type: "PONG",
    data: { ts, timestamp: ts },
    ts,
});
exports.keepaliveReply = keepaliveReply;
