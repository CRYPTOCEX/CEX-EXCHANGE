"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserQuery = exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const promises_1 = require("fs/promises");
const console_1 = require("@b/utils/console");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("@b/api/auth/otp/utils");
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
                        username: {
                            type: "string",
                            description: "Public handle shown to other users in place of the real name. Unique, case-insensitive.",
                            minLength: 3,
                            maxLength: 32,
                        },
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
                        currentOtp: {
                            type: "string",
                            description: "Required to change or clear the phone number while SMS " +
                                "two-factor is enabled: a current code from that factor, or " +
                                "a recovery code. The number is where its codes are sent.",
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
    const { username, firstName, lastName, metadata, avatar, phone, profile, settings, currentOtp, } = body;
    if (phone !== undefined) {
        await (0, utils_1.assertPhoneChangeProof)(user.id, phone !== null && phone !== void 0 ? phone : "", currentOtp, ctx);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating user profile");
    const result = await (0, exports.updateUserQuery)(user.id, firstName, lastName, metadata, avatar, phone, profile, settings, (_a = user.avatar) !== null && _a !== void 0 ? _a : undefined, username);
    const changed = [];
    if (username !== undefined)
        changed.push("username");
    if (firstName !== undefined || lastName !== undefined)
        changed.push("name");
    if (avatar !== undefined)
        changed.push("avatar");
    if (phone !== undefined)
        changed.push("phone");
    if (profile !== undefined)
        changed.push("profile");
    if (settings !== undefined)
        changed.push("notification settings");
    if (metadata !== undefined)
        changed.push("preferences");
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "profile.updated",
        title: "Profile updated",
        description: changed.length > 0
            ? `Updated: ${changed.join(", ")}`
            : "Account details changed",
        severity: "info",
        req: data,
        metadata: { fields: changed },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Profile updated successfully");
    return result;
};
const SERVER_OWNED_PROFILE_KEYS = ["phoneVerification"];
function safeParseObject(raw) {
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
const updateUserQuery = async (id, firstName, lastName, metadata, avatar, phone, profile, settings, originalAvatar, username) => {
    var _a;
    const updateData = {};
    if (username !== undefined) {
        const wanted = String(username !== null && username !== void 0 ? username : "").trim();
        if (!wanted) {
            updateData.username = null;
        }
        else {
            const { checkUsername } = await Promise.resolve().then(() => __importStar(require("@b/utils/username")));
            const verdict = await checkUsername(wanted, id);
            if (!verdict.ok) {
                throw (0, error_1.createError)({
                    statusCode: verdict.reason === "TAKEN" ? 409 : 400,
                    message: verdict.message || "That username can't be used.",
                });
            }
            updateData.username = verdict.value;
        }
    }
    if (firstName !== undefined)
        updateData.firstName = firstName;
    if (lastName !== undefined)
        updateData.lastName = lastName;
    if (metadata !== undefined)
        updateData.metadata = metadata;
    if (avatar !== undefined)
        updateData.avatar = avatar;
    if (phone !== undefined) {
        if (phone === null || phone === "") {
            updateData.phone = null;
            updateData.phoneVerified = false;
        }
        else {
            const normalized = `+${String(phone).replace(/\D/g, "").slice(0, 15)}`;
            if (!/^\+\d{7,15}$/.test(normalized)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Phone number must be in international format, e.g. +254711972926",
                });
            }
            updateData.phone = normalized;
            updateData.phoneVerified = false;
        }
    }
    if (profile !== undefined) {
        const incomingProfile = typeof profile === "string" ? safeParseObject(profile) : profile;
        const sanitized = { ...(incomingProfile || {}) };
        for (const reserved of SERVER_OWNED_PROFILE_KEYS)
            delete sanitized[reserved];
        const currentProfileRow = await db_1.models.user.findByPk(id, {
            attributes: ["profile"],
        });
        const storedProfile = (currentProfileRow === null || currentProfileRow === void 0 ? void 0 : currentProfileRow.profile) || {};
        for (const reserved of SERVER_OWNED_PROFILE_KEYS) {
            if (storedProfile[reserved] !== undefined)
                sanitized[reserved] = storedProfile[reserved];
        }
        updateData.profile = sanitized;
    }
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
    try {
        await db_1.models.user.update(updateData, {
            where: { id },
        });
    }
    catch (error) {
        const isUnique = (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError" ||
            ((_a = error === null || error === void 0 ? void 0 : error.original) === null || _a === void 0 ? void 0 : _a.code) === "ER_DUP_ENTRY";
        if (isUnique && updateData.username) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "That username was taken a moment ago. Pick another one.",
            });
        }
        throw error;
    }
    return { message: "Profile updated successfully" };
};
exports.updateUserQuery = updateUserQuery;
