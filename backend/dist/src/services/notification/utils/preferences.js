"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPreferences = getUserPreferences;
exports.filterChannelsByPreferences = filterChannelsByPreferences;
exports.isNotificationTypeEnabled = isNotificationTypeEnabled;
exports.filterChannelsByPreferencesAndType = filterChannelsByPreferencesAndType;
exports.updateUserPreferences = updateUserPreferences;
exports.getUserPushTokens = getUserPushTokens;
exports.addPushToken = addPushToken;
exports.removePushToken = removePushToken;
exports.getUserContactInfo = getUserContactInfo;
exports.hasValidContactMethod = hasValidContactMethod;
const db_1 = require("@b/db");
const RedisCache_1 = require("../cache/RedisCache");
const errors_1 = require("../errors");
async function getUserPreferences(userId) {
    let prefs = await RedisCache_1.redisCache.getUserPreferences(userId);
    if (!prefs) {
        const user = await db_1.models.user.findByPk(userId, {
            attributes: ["settings"],
        });
        if (!user) {
            throw new errors_1.UserNotFoundError(userId);
        }
        const userSettings = user.settings || {};
        const notificationSettings = userSettings;
        prefs = {
            email: notificationSettings.email !== undefined ? notificationSettings.email : true,
            sms: notificationSettings.sms !== undefined ? notificationSettings.sms : false,
            push: notificationSettings.push !== undefined ? notificationSettings.push : false,
            types: notificationSettings.types,
            pushTokens: notificationSettings.pushTokens,
        };
        await RedisCache_1.redisCache.setUserPreferences(userId, prefs);
    }
    return prefs;
}
async function filterChannelsByPreferences(userId, requestedChannels) {
    const prefs = await getUserPreferences(userId);
    return requestedChannels.filter((channel) => {
        switch (channel) {
            case "EMAIL":
                return prefs.email === true;
            case "SMS":
                return prefs.sms === true;
            case "PUSH":
                return prefs.push === true;
            case "IN_APP":
            case "WEBSOCKET":
                return true;
            default:
                return false;
        }
    });
}
async function isNotificationTypeEnabled(userId, type) {
    const prefs = await getUserPreferences(userId);
    if (!prefs.types) {
        return true;
    }
    const typeKey = type.toLowerCase();
    return prefs.types[typeKey] !== false;
}
async function filterChannelsByPreferencesAndType(userId, requestedChannels, type) {
    const typeEnabled = await isNotificationTypeEnabled(userId, type);
    if (!typeEnabled) {
        return [];
    }
    return await filterChannelsByPreferences(userId, requestedChannels);
}
async function updateUserPreferences(userId, preferences) {
    const user = await db_1.models.user.findByPk(userId);
    if (!user) {
        throw new errors_1.UserNotFoundError(userId);
    }
    const currentSettings = user.settings || {};
    const newSettings = {
        ...currentSettings,
        ...preferences,
    };
    await db_1.models.user.update({ settings: newSettings }, { where: { id: userId } });
    await RedisCache_1.redisCache.clearUserPreferences(userId);
}
async function getUserPushTokens(userId) {
    const prefs = await getUserPreferences(userId);
    if (!prefs.pushTokens || !Array.isArray(prefs.pushTokens)) {
        return [];
    }
    return prefs.pushTokens
        .filter((token) => token && token.token)
        .map((token) => token.token);
}
async function addPushToken(userId, token, deviceType) {
    const prefs = await getUserPreferences(userId);
    const pushTokens = prefs.pushTokens || [];
    const existingIndex = pushTokens.findIndex((t) => t.token === token);
    if (existingIndex >= 0) {
        pushTokens[existingIndex].lastActive = new Date().toISOString();
    }
    else {
        pushTokens.push({
            token,
            deviceType,
            lastActive: new Date().toISOString(),
        });
    }
    await updateUserPreferences(userId, { pushTokens });
}
async function removePushToken(userId, token) {
    const prefs = await getUserPreferences(userId);
    if (!prefs.pushTokens) {
        return;
    }
    const pushTokens = prefs.pushTokens.filter((t) => t.token !== token);
    await updateUserPreferences(userId, { pushTokens });
}
async function getUserContactInfo(userId, channel) {
    const user = await db_1.models.user.findByPk(userId, {
        attributes: ["email", "phone", "settings"],
    });
    if (!user) {
        throw new errors_1.UserNotFoundError(userId);
    }
    switch (channel) {
        case "EMAIL":
            return user.email || null;
        case "SMS":
            return user.phone || null;
        case "PUSH":
            const tokens = await getUserPushTokens(userId);
            return tokens.length > 0 ? tokens[0] : null;
        default:
            return null;
    }
}
async function hasValidContactMethod(userId, channel) {
    const contactInfo = await getUserContactInfo(userId, channel);
    return contactInfo !== null && contactInfo.length > 0;
}
