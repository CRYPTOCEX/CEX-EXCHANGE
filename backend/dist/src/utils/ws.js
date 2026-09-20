"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__resetUnactionableFrameThrottle = exports.logUnactionableFrame = exports.describeFrame = exports.parseParams = void 0;
const console_1 = require("@b/utils/console");
const parseParams = (routePath, path) => {
    const routeParts = routePath.split("/");
    const pathParts = path.split("/");
    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
        const part = routeParts[i];
        const isParam = part.startsWith(":");
        if (isParam) {
            const key = part.slice(1);
            params[key] = pathParts[i];
        }
    }
    return params;
};
exports.parseParams = parseParams;
const describeFrame = (frame) => {
    if (frame === null || typeof frame !== "object") {
        return `<${frame === null ? "null" : typeof frame}>`;
    }
    const parts = [];
    if (typeof frame.action === "string")
        parts.push(`action=${frame.action.slice(0, 32)}`);
    if (typeof frame.type === "string")
        parts.push(`type=${frame.type.slice(0, 32)}`);
    const keys = Object.keys(frame);
    parts.push(`keys=[${keys.slice(0, 12).join(",").slice(0, 200)}${keys.length > 12 ? ",…" : ""}]`);
    return parts.join(" ");
};
exports.describeFrame = describeFrame;
const lastUnactionableFrameLog = new Map();
const UNACTIONABLE_FRAME_LOG_INTERVAL_MS = 60000;
const logUnactionableFrame = (logModule, ws, frame) => {
    var _a, _b;
    var _c, _d, _e;
    const route = (ws === null || ws === void 0 ? void 0 : ws.path) || "unknown-route";
    const key = `${logModule}:${route}`;
    const now = Date.now();
    const last = lastUnactionableFrameLog.get(key);
    if (last !== undefined && now - last < UNACTIONABLE_FRAME_LOG_INTERVAL_MS)
        return;
    lastUnactionableFrameLog.set(key, now);
    console_1.logger.warn(logModule, `Ignored a frame carrying no subscription payload on ${route} — ` +
        `client ${(_c = (_a = ws === null || ws === void 0 ? void 0 : ws.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _c !== void 0 ? _c : "unknown"} (${(_d = (_b = ws === null || ws === void 0 ? void 0 : ws.user) === null || _b === void 0 ? void 0 : _b.role) !== null && _d !== void 0 ? _d : "unknown role"}) ` +
        `at ${(_e = ws === null || ws === void 0 ? void 0 : ws.remoteAddress) !== null && _e !== void 0 ? _e : "unknown address"}: ${(0, exports.describeFrame)(frame)}. ` +
        `Further occurrences on this route are suppressed for ${UNACTIONABLE_FRAME_LOG_INTERVAL_MS / 1000}s.`);
};
exports.logUnactionableFrame = logUnactionableFrame;
const __resetUnactionableFrameThrottle = () => {
    lastUnactionableFrameLog.clear();
};
exports.__resetUnactionableFrameThrottle = __resetUnactionableFrameThrottle;
