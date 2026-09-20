"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMobilePlatform = isMobilePlatform;
exports.registerMobileDevice = registerMobileDevice;
exports.getActiveMobileTokens = getActiveMobileTokens;
exports.revokeMobileDevice = revokeMobileDevice;
exports.revokeOtherMobileDevices = revokeOtherMobileDevices;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const RedisCache_1 = require("@b/services/notification/cache/RedisCache");
function isMobilePlatform(value) {
    return value === "ios" || value === "android";
}
async function enablePushOnFirstRegistration(userId) {
    const user = await db_1.models.user.findByPk(userId, { attributes: ["id", "settings"] });
    if (!user)
        return;
    const settings = (user.settings || {});
    if (settings.push !== undefined)
        return;
    await db_1.models.user.update({ settings: { ...settings, push: true } }, { where: { id: userId } });
    await RedisCache_1.redisCache.clearUserPreferences(userId);
}
async function registerMobileDevice(input) {
    var _a, _b, _c, _d, _e, _f;
    const { userId, deviceId, platform, pushToken } = input;
    if (!userId || !deviceId || !pushToken)
        return;
    const now = new Date();
    const existing = await db_1.models.mobileDevice.findOne({ where: { userId, deviceId } });
    if (existing) {
        await existing.update({
            platform,
            pushToken,
            appVersion: (_b = (_a = input.appVersion) !== null && _a !== void 0 ? _a : existing.appVersion) !== null && _b !== void 0 ? _b : null,
            locale: (_d = (_c = input.locale) !== null && _c !== void 0 ? _c : existing.locale) !== null && _d !== void 0 ? _d : null,
            lastSeenAt: now,
            revokedAt: null,
        });
    }
    else {
        await db_1.models.mobileDevice.create({
            userId,
            deviceId,
            platform,
            pushToken,
            appVersion: (_e = input.appVersion) !== null && _e !== void 0 ? _e : null,
            locale: (_f = input.locale) !== null && _f !== void 0 ? _f : null,
            lastSeenAt: now,
            revokedAt: null,
        });
    }
    await enablePushOnFirstRegistration(userId);
}
async function getActiveMobileTokens(userId) {
    const rows = await db_1.models.mobileDevice.findAll({
        where: { userId, revokedAt: null },
        attributes: ["pushToken"],
    });
    return rows.map((r) => r.pushToken).filter(Boolean);
}
async function revokeMobileDevice(userId, deviceId) {
    if (!userId || !deviceId)
        return 0;
    const [count] = await db_1.models.mobileDevice.update({ revokedAt: new Date() }, { where: { userId, deviceId, revokedAt: null } });
    if (count)
        console_1.logger.debug("PUSH", `Revoked device ${deviceId} for user ${userId}`);
    return count;
}
async function revokeOtherMobileDevices(userId, keepDeviceId) {
    if (!userId)
        return 0;
    const where = { userId, revokedAt: null };
    if (keepDeviceId)
        where.deviceId = { [sequelize_1.Op.ne]: keepDeviceId };
    const [count] = await db_1.models.mobileDevice.update({ revokedAt: new Date() }, { where });
    return count;
}
