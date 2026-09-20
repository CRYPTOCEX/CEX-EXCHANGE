"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.createAdminNotification = createAdminNotification;
const notification_1 = require("@b/services/notification");
const deepLinks_1 = require("@b/services/notification/utils/deepLinks");
const console_1 = require("./console");
function channelsFor(type, options) {
    var _a, _b;
    const channels = ["IN_APP"];
    const routed = (0, deepLinks_1.resolveDeepLink)({
        type,
        title: (_a = options.title) !== null && _a !== void 0 ? _a : "",
        relatedId: (_b = options.relatedId) !== null && _b !== void 0 ? _b : null,
    });
    if (routed)
        channels.push("PUSH");
    return channels;
}
async function createNotification(options, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Creating notification");
        const type = mapNotificationType(options.type);
        const result = await notification_1.notificationService.send({
            userId: options.userId,
            type,
            channels: channelsFor(type, options),
            data: {
                title: options.title || "Notification",
                message: options.message,
                details: options.details,
                link: options.link,
                actions: options.actions,
                relatedId: options.relatedId,
            },
            priority: getPriorityFromType(options.type),
            idempotencyKey: `notification-${options.userId}-${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Notification created successfully");
        return result.notificationId;
    }
    catch (err) {
        console_1.logger.error("Failed to create notification", err);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, err.message);
        throw err;
    }
}
async function createAdminNotification(permissionName, title, message, type, link, details, actions, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Finding users with ${permissionName} permission`);
        await notification_1.notificationService.sendToPermission({
            permissionName,
            type: mapNotificationType(type),
            channels: ["IN_APP"],
            data: {
                title,
                message,
                details,
                link,
                actions,
            },
            priority: getPriorityFromType(type),
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Admin notifications sent successfully`);
    }
    catch (error) {
        console_1.logger.error("Failed to create admin notification", error);
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
function mapNotificationType(type) {
    const typeMap = {
        investment: "INVESTMENT",
        message: "MESSAGE",
        user: "USER",
        alert: "ALERT",
        system: "SYSTEM",
    };
    return typeMap[type] || "SYSTEM";
}
function getPriorityFromType(type) {
    switch (type) {
        case "alert":
            return "HIGH";
        case "investment":
            return "HIGH";
        default:
            return "NORMAL";
    }
}
