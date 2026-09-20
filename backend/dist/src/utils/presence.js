"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESENCE_ATTRIBUTES = exports.PRESENCE_STALE_DAYS = exports.PRESENCE_ONLINE_SECONDS = void 0;
exports.presenceBucket = presenceBucket;
exports.touchPresence = touchPresence;
exports.getPresenceAt = getPresenceAt;
const redis_1 = require("@b/utils/redis");
exports.PRESENCE_ONLINE_SECONDS = 300;
exports.PRESENCE_STALE_DAYS = 3;
const STALE_SECONDS = exports.PRESENCE_STALE_DAYS * 24 * 60 * 60;
function presenceBucket(lastSeenAt) {
    if (!lastSeenAt)
        return null;
    const ms = new Date(lastSeenAt).getTime();
    if (!Number.isFinite(ms) || ms <= 0)
        return null;
    const seconds = (Date.now() - ms) / 1000;
    if (!Number.isFinite(seconds) || seconds < 0)
        return null;
    if (seconds <= exports.PRESENCE_ONLINE_SECONDS)
        return "online";
    if (seconds >= STALE_SECONDS)
        return "stale";
    return "away";
}
exports.PRESENCE_ATTRIBUTES = ["lastLogin"];
const KEY_PREFIX = "presence:";
const HEARTBEAT_TTL_SECONDS = (exports.PRESENCE_STALE_DAYS + 1) * 24 * 60 * 60;
const WRITE_THROTTLE_MS = 60000;
const MAX_TRACKED = 20000;
const lastWriteAt = new Map();
async function touchPresence(userId) {
    try {
        if (typeof userId !== "string" || !userId)
            return;
        const now = Date.now();
        const previous = lastWriteAt.get(userId);
        if (previous !== undefined && now - previous < WRITE_THROTTLE_MS)
            return;
        if (lastWriteAt.size >= MAX_TRACKED) {
            for (const [id, at] of lastWriteAt) {
                if (now - at >= WRITE_THROTTLE_MS)
                    lastWriteAt.delete(id);
            }
        }
        lastWriteAt.set(userId, now);
        await redis_1.RedisSingleton.getInstance().set(`${KEY_PREFIX}${userId}`, new Date(now).toISOString(), "EX", HEARTBEAT_TTL_SECONDS);
    }
    catch (_a) {
    }
}
async function getPresenceAt(userIds) {
    const out = new Map();
    const ids = Array.from(new Set(userIds.filter((id) => typeof id === "string" && !!id)));
    if (!ids.length)
        return out;
    try {
        const values = await redis_1.RedisSingleton.getInstance().mget(ids.map((id) => `${KEY_PREFIX}${id}`));
        values.forEach((value, index) => {
            if (!value)
                return;
            const at = new Date(value);
            if (Number.isNaN(at.getTime()))
                return;
            out.set(ids[index], at);
        });
    }
    catch (_a) {
    }
    return out;
}
