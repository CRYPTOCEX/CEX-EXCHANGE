"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAudit = shouldAudit;
exports.recordAdminAction = recordAdminAction;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function shouldAudit(method, path, metadata) {
    if (!method || !path)
        return false;
    if ((metadata === null || metadata === void 0 ? void 0 : metadata.audit) === false)
        return false;
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()))
        return false;
    return path.startsWith("/api/admin/");
}
function qualifyTitle(title, query, method) {
    if (method.toUpperCase() !== "DELETE")
        return title;
    const truthy = (v) => v === true || v === "true";
    if (truthy(query === null || query === void 0 ? void 0 : query.restore))
        return `${title} (restore)`;
    if (truthy(query === null || query === void 0 ? void 0 : query.force))
        return `${title} (permanent)`;
    return title;
}
function extractTargetId(path, body) {
    var _a;
    const segments = path.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
        if (ID_SEGMENT.test(segments[i]))
            return segments[i];
    }
    for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(segments[i]))
            return segments[i];
    }
    const ids = extractTargetIds(body);
    return (_a = ids === null || ids === void 0 ? void 0 : ids[0]) !== null && _a !== void 0 ? _a : null;
}
function extractTargetIds(body) {
    const raw = body === null || body === void 0 ? void 0 : body.ids;
    if (!Array.isArray(raw) || raw.length === 0)
        return null;
    const ids = raw
        .filter((v) => typeof v === "string" || typeof v === "number")
        .map((v) => String(v))
        .slice(0, 500);
    return ids.length ? ids : null;
}
function extractReason(query, body) {
    var _a;
    var _b, _c, _d, _e, _f;
    const candidate = (_f = (_e = (_d = (_c = (_b = query === null || query === void 0 ? void 0 : query.reason) !== null && _b !== void 0 ? _b : body === null || body === void 0 ? void 0 : body.reason) !== null && _c !== void 0 ? _c : body === null || body === void 0 ? void 0 : body.message) !== null && _d !== void 0 ? _d : body === null || body === void 0 ? void 0 : body.adminNotes) !== null && _e !== void 0 ? _e : (_a = body === null || body === void 0 ? void 0 : body.metadata) === null || _a === void 0 ? void 0 : _a.message) !== null && _f !== void 0 ? _f : null;
    if (typeof candidate !== "string")
        return null;
    const trimmed = candidate.trim();
    return trimmed ? trimmed.slice(0, 2000) : null;
}
function recordAdminAction(input) {
    var _a, _b, _c;
    var _d, _e, _f, _g;
    const { ctx, module, title, method, path, userId, query, body, ip, error, } = input;
    const failed = Boolean(error) || (ctx === null || ctx === void 0 ? void 0 : ctx._status) === "error";
    const row = {
        userId: userId !== null && userId !== void 0 ? userId : null,
        module,
        title: qualifyTitle(title, query, method),
        method: method.toUpperCase(),
        path: path.slice(0, 255),
        targetId: extractTargetId(path, body),
        targetIds: extractTargetIds(body),
        status: failed ? "ERROR" : "SUCCESS",
        reason: extractReason(query, body),
        error: failed
            ? String((_f = (_e = (_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : error) !== null && _e !== void 0 ? _e : (_b = (_a = ctx === null || ctx === void 0 ? void 0 : ctx._steps) === null || _a === void 0 ? void 0 : _a.filter((s) => s.status === "error").pop()) === null || _b === void 0 ? void 0 : _b.message) !== null && _f !== void 0 ? _f : "Unknown error").slice(0, 2000)
            : null,
        durationMs: (ctx === null || ctx === void 0 ? void 0 : ctx._startTime) ? Date.now() - ctx._startTime : null,
        requestId: (_g = ctx === null || ctx === void 0 ? void 0 : ctx.requestId) !== null && _g !== void 0 ? _g : null,
        ip: ip ? ip.slice(0, 45) : null,
        steps: ((_c = ctx === null || ctx === void 0 ? void 0 : ctx._steps) === null || _c === void 0 ? void 0 : _c.length) ? ctx._steps : null,
        createdAt: new Date(),
    };
    void db_1.models.adminAuditLog
        .create(row)
        .catch((err) => console_1.logger.error("AUDIT", `Failed to persist admin audit row for ${method} ${path}`, err));
}
