"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveApiKey = resolveApiKey;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
async function resolveApiKey(key, clientIp) {
    var _a, _b;
    if (!key)
        return { resolved: null, reason: "no key" };
    const record = await db_1.models.apiKey.findOne({
        where: { key },
        include: [
            { model: db_1.models.user, as: "user", attributes: ["id", "roleId", "status"], required: false },
        ],
    });
    if (!record)
        return { resolved: null, reason: "unknown key" };
    const ownerStatus = (_a = record.user) === null || _a === void 0 ? void 0 : _a.status;
    if (ownerStatus && ownerStatus !== "ACTIVE") {
        return {
            resolved: null,
            reason: `key ${record.id} belongs to a ${ownerStatus} account`,
        };
    }
    if (record.disabled) {
        return {
            resolved: null,
            reason: `key ${record.id} is disabled${record.disabledReason ? ` (${record.disabledReason})` : ""}`,
        };
    }
    const expiresAt = record.expiresAt;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        return { resolved: null, reason: `key ${record.id} expired at ${expiresAt}` };
    }
    const whitelist = Array.isArray(record.ipWhitelist)
        ? record.ipWhitelist
        : typeof record.ipWhitelist === "string"
            ? safeParseList(record.ipWhitelist)
            : [];
    if (record.ipRestriction && whitelist.length > 0) {
        const normalized = normalizeIp(clientIp);
        const allowed = whitelist.some((entry) => normalizeIp(entry) === normalized);
        if (!allowed) {
            return {
                resolved: null,
                reason: `key ${record.id} is restricted to ${whitelist.join(", ")} but was used from ${normalized || "an unknown address"}`,
            };
        }
    }
    const permissions = typeof record.permissions === "string"
        ? safeParseList(record.permissions)
        : Array.isArray(record.permissions)
            ? record.permissions
            : [];
    touchLastUsed(record, clientIp);
    return {
        resolved: {
            record,
            permissions,
            ownerRoleId: (_b = record.user) === null || _b === void 0 ? void 0 : _b.roleId,
            ownerStatus,
        },
        reason: undefined,
    };
}
function safeParseList(raw) {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (_a) {
        return [];
    }
}
function normalizeIp(ip) {
    if (!ip)
        return "";
    let value = String(ip).trim().toLowerCase();
    if (value.startsWith("["))
        value = value.slice(1, value.indexOf("]") > 0 ? value.indexOf("]") : undefined);
    if (value.startsWith("::ffff:"))
        value = value.slice(7);
    const parts = value.split(":");
    if (parts.length === 2 && parts[0].includes("."))
        value = parts[0];
    return value;
}
function touchLastUsed(record, clientIp) {
    const last = record.lastUsedAt ? new Date(record.lastUsedAt).getTime() : 0;
    if (Date.now() - last < 60000)
        return;
    const patch = { lastUsedAt: new Date() };
    if (clientIp)
        patch.lastUsedIp = normalizeIp(clientIp);
    void db_1.models.apiKey
        .update(patch, { where: { id: record.id } })
        .catch((error) => console_1.logger.debug("AUTH", `Could not stamp apiKey.lastUsedAt: ${error === null || error === void 0 ? void 0 : error.message}`));
}
