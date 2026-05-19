"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDeviceToken = addDeviceToken;
exports.removeDeviceToken = removeDeviceToken;
exports.getDeviceTokens = getDeviceTokens;
exports.getTokenStrings = getTokenStrings;
exports.updateTokenLastUsed = updateTokenLastUsed;
exports.removeInactiveTokens = removeInactiveTokens;
exports.isValidFCMToken = isValidFCMToken;
exports.getTokenCount = getTokenCount;
exports.hasDeviceTokens = hasDeviceTokens;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
async function addDeviceToken(userId, token, deviceId, platform) {
    try {
        const user = await db_1.models.user.findByPk(userId);
        if (!user) {
            console_1.logger.error("DeviceToken", `User not found for device token: ${userId}`);
            return false;
        }
        const settings = user.settings || {};
        if (!settings.pushTokens) {
            settings.pushTokens = {};
        }
        const key = deviceId || `device-${Date.now()}`;
        settings.pushTokens[key] = {
            token,
            platform,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
        };
        await user.update({ settings });
        console_1.logger.info("DeviceToken", `Device token added: ${key}`, {
            userId,
            deviceId: key,
            platform,
        });
        return true;
    }
    catch (error) {
        console_1.logger.error("DeviceToken", `Failed to add device token for user ${userId}`, error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}
async function removeDeviceToken(userId, tokenOrDeviceId) {
    try {
        const user = await db_1.models.user.findByPk(userId);
        if (!user || !user.settings || !user.settings.pushTokens) {
            return false;
        }
        const settings = user.settings;
        let removed = false;
        if (settings.pushTokens[tokenOrDeviceId]) {
            delete settings.pushTokens[tokenOrDeviceId];
            removed = true;
        }
        else {
            for (const [deviceId, data] of Object.entries(settings.pushTokens)) {
                if (typeof data === "object" &&
                    data !== null &&
                    data.token === tokenOrDeviceId) {
                    delete settings.pushTokens[deviceId];
                    removed = true;
                    break;
                }
                else if (data === tokenOrDeviceId) {
                    delete settings.pushTokens[deviceId];
                    removed = true;
                    break;
                }
            }
        }
        if (removed) {
            await user.update({ settings });
            console_1.logger.info("DeviceToken", `Device token removed for user ${userId}`);
            return true;
        }
        return false;
    }
    catch (error) {
        console_1.logger.error("DeviceToken", `Failed to remove device token for user ${userId}`, error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}
async function getDeviceTokens(userId) {
    try {
        const user = await db_1.models.user.findByPk(userId);
        if (!user || !user.settings || !user.settings.pushTokens) {
            return [];
        }
        const tokens = [];
        for (const [deviceId, data] of Object.entries(user.settings.pushTokens)) {
            if (typeof data === "object" && data !== null && data.token) {
                const tokenData = data;
                tokens.push({
                    deviceId,
                    token: tokenData.token,
                    platform: tokenData.platform,
                    createdAt: tokenData.createdAt ? new Date(tokenData.createdAt) : undefined,
                    lastUsed: tokenData.lastUsed ? new Date(tokenData.lastUsed) : undefined,
                });
            }
            else if (typeof data === "string") {
                tokens.push({
                    deviceId,
                    token: data,
                });
            }
        }
        return tokens;
    }
    catch (error) {
        console_1.logger.error("DeviceToken", `Failed to get device tokens for user ${userId}`, error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
async function getTokenStrings(userId) {
    const tokens = await getDeviceTokens(userId);
    return tokens.map((t) => t.token);
}
async function updateTokenLastUsed(userId, deviceId) {
    try {
        const user = await db_1.models.user.findByPk(userId);
        if (!user || !user.settings || !user.settings.pushTokens) {
            return false;
        }
        const token = user.settings.pushTokens[deviceId];
        if (token && typeof token === "object") {
            token.lastUsed = new Date().toISOString();
            await user.update({ settings: user.settings });
            return true;
        }
        return false;
    }
    catch (error) {
        console_1.logger.error("DeviceToken", `Failed to update token last used for user ${userId}, device ${deviceId}`, error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}
async function removeInactiveTokens(userId, daysInactive = 90) {
    try {
        const user = await db_1.models.user.findByPk(userId);
        if (!user || !user.settings || !user.settings.pushTokens) {
            return 0;
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
        let removedCount = 0;
        for (const [deviceId, data] of Object.entries(user.settings.pushTokens)) {
            if (typeof data === "object" && data !== null && data.lastUsed) {
                const lastUsed = new Date(data.lastUsed);
                if (lastUsed < cutoffDate) {
                    delete user.settings.pushTokens[deviceId];
                    removedCount++;
                }
            }
        }
        if (removedCount > 0) {
            await user.update({ settings: user.settings });
            console_1.logger.info("DeviceToken", `Removed ${removedCount} inactive device tokens for user ${userId}`);
        }
        return removedCount;
    }
    catch (error) {
        console_1.logger.error("DeviceToken", `Failed to remove inactive tokens for user ${userId}`, error instanceof Error ? error : new Error(String(error)));
        return 0;
    }
}
function isValidFCMToken(token) {
    if (!token || token.length < 100 || token.length > 200) {
        return false;
    }
    const tokenRegex = /^[a-zA-Z0-9_-]+$/;
    return tokenRegex.test(token);
}
async function getTokenCount(userId) {
    const tokens = await getDeviceTokens(userId);
    return tokens.length;
}
async function hasDeviceTokens(userId) {
    const count = await getTokenCount(userId);
    return count > 0;
}
