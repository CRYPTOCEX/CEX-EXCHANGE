"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Returns the password-change requirements for the current user",
    description: "Reports whether the account has a password, whether a two-factor code will be required to change it, how that code is delivered, and the password policy the server enforces.",
    operationId: "getPasswordChangeRequirements",
    tags: ["User", "Profile"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Requirements retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            hasPassword: { type: "boolean" },
                            requiresTwoFactorCode: { type: "boolean" },
                            twoFactorType: { type: "string", nullable: true },
                            codeDeliveryRequired: { type: "boolean" },
                            canRequestSetupLink: { type: "boolean" },
                            policy: {
                                type: "object",
                                properties: {
                                    minLength: { type: "number" },
                                    maxLength: { type: "number" },
                                    requiresUppercase: { type: "boolean" },
                                    requiresLowercase: { type: "boolean" },
                                    requiresDigit: { type: "boolean" },
                                    requiresSymbol: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const account = await db_1.models.user.findByPk(user.id, {
        attributes: ["id", "email", "emailVerified", "password"],
    });
    const twoFactor = await db_1.models.twoFactor.findOne({
        where: { userId: user.id },
    });
    const twoFactorGloballyEnabled = await cache_1.CacheManager.getInstance().getSettingBool("twoFactorStatus", true);
    const requiresTwoFactorCode = twoFactorGloballyEnabled && Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled);
    const twoFactorType = requiresTwoFactorCode ? twoFactor.type : null;
    return {
        hasPassword: Boolean(account === null || account === void 0 ? void 0 : account.password),
        requiresTwoFactorCode,
        twoFactorType,
        codeDeliveryRequired: twoFactorType === "EMAIL" || twoFactorType === "SMS",
        canRequestSetupLink: Boolean(account === null || account === void 0 ? void 0 : account.email) && Boolean(account === null || account === void 0 ? void 0 : account.emailVerified),
        policy: {
            minLength: 8,
            maxLength: 128,
            requiresUppercase: true,
            requiresLowercase: true,
            requiresDigit: true,
            requiresSymbol: true,
        },
    };
};
