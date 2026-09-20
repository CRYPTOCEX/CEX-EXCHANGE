"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
const errors_1 = require("@b/utils/schema/errors");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Test SMS Notification",
    description: "Send a test SMS notification to verify the SMS channel is configured correctly",
    operationId: "testSMSNotification",
    tags: ["Admin", "Notification", "Testing"],
    requiresAuth: true,
    permission: "access.notification.settings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "User ID to send test notification to (defaults to current user)",
                        },
                        phone: {
                            type: "string",
                            description: "Override phone number for testing (E.164 format)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Test SMS sent successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            notificationId: { type: "string" },
                            delivered: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { body, user, ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Sending test SMS notification");
        const targetUserId = body.userId || (user === null || user === void 0 ? void 0 : user.id);
        if (!targetUserId) {
            throw new Error("User ID is required");
        }
        let overridePhone;
        if (body.phone) {
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
            }
            const admin = await db_1.models.user.findByPk(user.id, {
                attributes: ["phone"],
            });
            const normalize = (p) => p.replace(/\D/g, "").slice(0, 15);
            const requested = normalize(String(body.phone));
            if (!(admin === null || admin === void 0 ? void 0 : admin.phone) || requested !== normalize(String(admin.phone))) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "Test SMS can only be sent to your own account phone",
                });
            }
            overridePhone = `+${requested}`;
        }
        const result = await notification_1.notificationService.send({
            userId: targetUserId,
            type: "SYSTEM",
            channels: ["SMS"],
            data: {
                message: "Test SMS from notification service. If you received this, your SMS channel is working!",
                testMode: true,
                timestamp: new Date().toISOString(),
                ...(overridePhone && { overridePhone }),
            },
            priority: "NORMAL",
            idempotencyKey: `test-sms-${targetUserId}-${Date.now()}`,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Test SMS notification sent");
        const smsFailed = result.channelsFailed.includes("SMS");
        const errorMessage = smsFailed && ((_c = result.errors) === null || _c === void 0 ? void 0 : _c.SMS)
            ? result.errors.SMS
            : smsFailed
                ? "SMS channel not configured or not registered"
                : undefined;
        return {
            success: result.success && !smsFailed,
            message: smsFailed
                ? errorMessage || "Failed to send test SMS"
                : "Test SMS sent successfully",
            notificationId: result.notificationId,
            delivered: result.channelsDelivered.includes("SMS"),
            channels: {
                delivered: result.channelsDelivered,
                failed: result.channelsFailed,
            },
        };
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
};
