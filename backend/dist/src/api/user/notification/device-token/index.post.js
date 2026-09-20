"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Add Device Token",
    description: "Register a device token for push notifications",
    operationId: "addDeviceToken",
    tags: ["User", "Notifications", "Device Token"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["token"],
                    properties: {
                        token: { type: "string", description: "The device token for push notifications" },
                        deviceId: { type: "string", description: "Optional device identifier" },
                        platform: { type: "string", description: "Device platform (ios, android, web)" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Device token registered successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            deviceId: { type: "string" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        400: { description: "Bad Request - Device token is required" },
        500: { description: "Internal Server Error - Failed to add device token" },
    },
};
exports.default = async (data) => {
    const { user, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw new Error("Unauthorized");
    }
    const { token, deviceId, platform } = body;
    if (!token) {
        throw new Error("Device token is required");
    }
    const success = await (0, notification_1.addDeviceToken)(user.id, token, deviceId, platform);
    if (!success) {
        throw new Error("Failed to add device token");
    }
    return {
        message: "Device token registered successfully",
        deviceId: deviceId || "auto-generated",
    };
};
