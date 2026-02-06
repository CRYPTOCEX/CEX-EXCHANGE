"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserQuery = exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const promises_1 = require("fs/promises");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Updates the profile of the current user",
    description: "Updates the profile of the currently authenticated user",
    operationId: "updateProfile",
    tags: ["Auth"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Update profile",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        firstName: {
                            type: "string",
                            description: "First name of the user",
                        },
                        lastName: {
                            type: "string",
                            description: "Last name of the user",
                        },
                        metadata: {
                            type: "object",
                            description: "Metadata of the user",
                        },
                        avatar: {
                            type: "string",
                            description: "Avatar of the user",
                            nullable: true,
                        },
                        phone: {
                            type: "string",
                            description: "Phone number of the user",
                        },
                        twoFactor: {
                            type: "boolean",
                            description: "Two-factor authentication status",
                        },
                        profile: {
                            type: "object",
                            nullable: true,
                            properties: {
                                bio: {
                                    type: "string",
                                    description: "User bio",
                                    nullable: true,
                                },
                                location: {
                                    type: "object",
                                    nullable: true,
                                    properties: {
                                        address: {
                                            type: "string",
                                            description: "User address",
                                            nullable: true,
                                        },
                                        city: {
                                            type: "string",
                                            description: "User city",
                                            nullable: true,
                                        },
                                        country: {
                                            type: "string",
                                            description: "User country",
                                            nullable: true,
                                        },
                                        zip: {
                                            type: "string",
                                            description: "User zip code",
                                            nullable: true,
                                        },
                                    },
                                },
                                social: {
                                    type: "object",
                                    nullable: true,
                                    properties: {
                                        twitter: {
                                            type: "string",
                                            description: "Twitter profile",
                                            nullable: true,
                                        },
                                        dribbble: {
                                            type: "string",
                                            description: "Dribbble profile",
                                            nullable: true,
                                        },
                                        instagram: {
                                            type: "string",
                                            description: "Instagram profile",
                                            nullable: true,
                                        },
                                        github: {
                                            type: "string",
                                            description: "GitHub profile",
                                            nullable: true,
                                        },
                                        gitlab: {
                                            type: "string",
                                            description: "GitLab profile",
                                            nullable: true,
                                        },
                                        telegram: {
                                            type: "string",
                                            description: "Telegram username",
                                            nullable: true,
                                        },
                                    },
                                },
                            },
                        },
                        settings: {
                            type: "object",
                            description: "Notification settings for the user",
                            properties: {
                                email: {
                                    type: "boolean",
                                    description: "Email notifications enabled or disabled",
                                },
                                sms: {
                                    type: "boolean",
                                    description: "SMS notifications enabled or disabled",
                                },
                                push: {
                                    type: "boolean",
                                    description: "Push notifications enabled or disabled",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "User profile updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required to update profile",
        });
    }
    const { firstName, lastName, metadata, avatar, phone, twoFactor, profile, settings, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating user profile");
    const result = await (0, exports.updateUserQuery)(user.id, firstName, lastName, metadata, avatar, phone, twoFactor, profile, settings, (_a = user.avatar) !== null && _a !== void 0 ? _a : undefined);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Profile updated successfully");
    return result;
};
const updateUserQuery = async (id, firstName, lastName, metadata, avatar, phone, twoFactor, profile, settings, originalAvatar) => {
    const updateData = {};
    if (firstName !== undefined)
        updateData.firstName = firstName;
    if (lastName !== undefined)
        updateData.lastName = lastName;
    if (metadata !== undefined)
        updateData.metadata = metadata;
    if (avatar !== undefined)
        updateData.avatar = avatar;
    if (phone !== undefined)
        updateData.phone = phone;
    if (twoFactor !== undefined)
        updateData.twoFactor = twoFactor;
    if (profile !== undefined)
        updateData.profile = profile;
    if (settings !== undefined) {
        const incomingSettings = typeof settings === "string" ? JSON.parse(settings) : settings;
        const currentUser = await db_1.models.user.findByPk(id, {
            attributes: ["settings"],
        });
        const existingSettings = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.settings) || {};
        updateData.settings = {
            ...existingSettings,
            ...incomingSettings,
        };
    }
    if (avatar === null && originalAvatar) {
        try {
            await (0, promises_1.unlink)(originalAvatar);
        }
        catch (error) {
            console_1.logger.error("USER", "Failed to unlink avatar", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to unlink avatar from server",
            });
        }
    }
    await db_1.models.user.update(updateData, {
        where: { id },
    });
    return { message: "Profile updated successfully" };
};
exports.updateUserQuery = updateUserQuery;
