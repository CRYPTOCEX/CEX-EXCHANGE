"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDecision = recordDecision;
exports.flushAuditCounters = flushAuditCounters;
exports.purgeExpiredAuditRows = purgeExpiredAuditRows;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
const pending = new Map();
const DEDUPE_LIMIT = 50000;
const FLUSH_INTERVAL_MS = 15000;
let flushTimer = null;
function dedupeKey(ctx, decision) {
    var _a, _b;
    return [
        ctx.ip,
        decision.decision,
        decision.reasonCode,
        (_a = decision.location.countryCode) !== null && _a !== void 0 ? _a : "-",
        (_b = ctx.userId) !== null && _b !== void 0 ? _b : "-",
    ].join("|");
}
function truncate(value, max) {
    if (value === undefined || value === null)
        return null;
    const s = String(value);
    return s.length > max ? s.slice(0, max) : s;
}
async function flushCounters() {
    var _a;
    const now = Date.now();
    const updates = [];
    for (const [key, entry] of pending) {
        if (entry.rowId && entry.repeats > 0) {
            updates.push({ id: entry.rowId, by: entry.repeats });
            entry.repeats = 0;
        }
        if (entry.expiresAt <= now)
            pending.delete(key);
    }
    if (!updates.length)
        return;
    try {
        if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.geoAccessLog) === null || _a === void 0 ? void 0 : _a.increment))
            return;
        await Promise.all(updates.map((u) => db_1.models.geoAccessLog.increment("hitCount", {
            by: u.by,
            where: { id: u.id },
        })));
    }
    catch (error) {
        console_1.logger.debug("GEO", `Failed to flush geo log counters: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
function ensureFlushTimer() {
    var _a;
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        void flushCounters();
    }, FLUSH_INTERVAL_MS);
    (_a = flushTimer.unref) === null || _a === void 0 ? void 0 : _a.call(flushTimer);
}
function shouldLog(decision, policy) {
    if (policy.logMode === "NONE")
        return false;
    if (policy.logMode === "ALL")
        return true;
    return decision.decision !== "ALLOWED";
}
async function insertRow(key, ctx, decision) {
    var _a;
    try {
        if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.geoAccessLog) === null || _a === void 0 ? void 0 : _a.create))
            return;
        const row = await db_1.models.geoAccessLog.create({
            ip: truncate(ctx.ip, 64) || "unknown",
            countryCode: decision.location.countryCode,
            countryName: truncate(decision.location.countryName, 128),
            region: truncate(decision.location.region, 128),
            city: truncate(decision.location.city, 128),
            source: decision.location.source,
            decision: decision.decision,
            reasonCode: decision.reasonCode,
            reasonDetail: truncate(decision.message, 512),
            restrictionId: decision.restrictionId,
            action: decision.action,
            path: truncate((ctx.path || "").split("?")[0], 512) || "/",
            method: truncate(ctx.method, 10) || "GET",
            userId: ctx.userId || null,
            userAgent: truncate(ctx.userAgent, 512),
            isProxy: decision.location.isProxy,
            isHosting: decision.location.isHosting,
            isTor: decision.location.isTor,
            hitCount: 1,
        });
        const entry = pending.get(key);
        if (entry)
            entry.rowId = String(row.id);
    }
    catch (error) {
        pending.delete(key);
        console_1.logger.debug("GEO", `Failed to write geo access log: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
function recordDecision(ctx, decision, policy = (0, settings_1.getPolicy)()) {
    try {
        if (!shouldLog(decision, policy))
            return;
        const window = policy.logDedupeSeconds * 1000;
        const now = Date.now();
        if (window <= 0) {
            void insertRow(`${now}-${Math.random()}`, ctx, decision);
            return;
        }
        ensureFlushTimer();
        const key = dedupeKey(ctx, decision);
        const existing = pending.get(key);
        if (existing && existing.expiresAt > now) {
            existing.repeats++;
            return;
        }
        if (pending.size >= DEDUPE_LIMIT) {
            let toDrop = Math.ceil(DEDUPE_LIMIT * 0.1);
            for (const k of pending.keys()) {
                pending.delete(k);
                if (--toDrop <= 0)
                    break;
            }
        }
        pending.set(key, { rowId: null, repeats: 0, expiresAt: now + window });
        void insertRow(key, ctx, decision);
    }
    catch (error) {
        console_1.logger.debug("GEO", `Geo audit record failed: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
async function flushAuditCounters() {
    await flushCounters();
}
async function purgeExpiredAuditRows(policy = (0, settings_1.getPolicy)()) {
    var _a;
    const days = policy.logRetentionDays;
    if (!days || days <= 0)
        return 0;
    if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.geoAccessLog) === null || _a === void 0 ? void 0 : _a.destroy))
        return 0;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 5000;
    let removed = 0;
    try {
        for (;;) {
            const deleted = await db_1.models.geoAccessLog.destroy({
                where: { createdAt: { [sequelize_1.Op.lt]: cutoff } },
                limit: BATCH_SIZE,
            });
            if (!deleted)
                break;
            removed += deleted;
            if (deleted < BATCH_SIZE)
                break;
            await new Promise((resolve) => setImmediate(resolve));
        }
        return removed;
    }
    catch (error) {
        console_1.logger.warn("GEO", `Geo audit retention purge failed after ${removed} row(s): ${error === null || error === void 0 ? void 0 : error.message}`);
        return removed;
    }
}
