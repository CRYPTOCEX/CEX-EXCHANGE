"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Remove Device Token",
    description: "Unregister a device token for push notifications",
    operationId: "removeDeviceToken",
    tags: ["User", "Notifications", "Device Token"],
    requiresAuth: true,
    requestBody: {
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        token: { type: "string", description: "The device token to remove" },
                        deviceId: { type: "string", description: "The device ID to remove" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Device token removed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        400: { description: "Bad Request - Device token or device ID is required" },
    },
};
exports.default = async (data) => {
    const { user, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw new Error("Unauthorized");
    }
    const { token, deviceId } = body;
    if (!token && !deviceId) {
        throw new Error("Device token or device ID is required");
    }
    const success = await (0, notification_1.removeDeviceToken)(user.id, token || deviceId);
    if (!success) {
        return {
            message: "Device token not found or already removed",
        };
    }
    return {
        message: "Device token removed successfully",
    };
};
