"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Get Device Tokens",
    description: "Get all registered device tokens for the authenticated user",
    operationId: "getDeviceTokens",
    tags: ["User", "Notifications", "Device Token"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Device tokens retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            tokens: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        deviceId: { type: "string" },
                                        platform: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                        lastUsed: { type: "string", format: "date-time" },
                                        tokenPreview: { type: "string" },
                                    },
                                },
                            },
                            count: { type: "number" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw new Error("Unauthorized");
    }
    const tokens = await (0, notification_1.getDeviceTokens)(user.id);
    return {
        tokens: tokens.map((t) => ({
            deviceId: t.deviceId,
            platform: t.platform,
            createdAt: t.createdAt,
            lastUsed: t.lastUsed,
            tokenPreview: t.token.substring(0, 20) + "...",
        })),
        count: tokens.length,
    };
};
