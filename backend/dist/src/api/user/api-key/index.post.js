"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/user/profile/password/utils");
const db_1 = require("@b/db");
const utils_2 = require("./utils");
const user_activity_1 = require("@b/utils/user-activity");
const kyc_1 = require("@b/utils/kyc");
exports.metadata = {
    summary: "Creates a new API key",
    description: "Generates a new API key for the authenticated user.",
    operationId: "createApiKey",
    tags: ["API Key Management"],
    logModule: "USER",
    logTitle: "Create API key",
    requestBody: {
        description: "Data required to create a new API key",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the API key" },
                        permissions: {
                            type: "array",
                            items: { type: "string" },
                            description: "Permissions associated with the API key",
                        },
                        ipWhitelist: {
                            type: "array",
                            items: { type: "string" },
                            description: "IP addresses whitelisted for the API key",
                        },
                        ipRestriction: {
                            type: "boolean",
                            description: "Restrict access to specific IPs (true) or allow unrestricted access (false)",
                        },
                    },
                    required: ["name"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "API key created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            key: { type: "string" },
                            permissions: { type: "array", items: { type: "string" } },
                            ipWhitelist: { type: "array", items: { type: "string" } },
                            ipRestriction: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        400: { description: "API key limit reached" },
        500: { description: "Server error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_1.assertSessionCaller)(data);
    const { name, permissions, ipWhitelist, ipRestriction } = body;
    const validatedPermissions = (0, utils_2.validateApiKeyPermissions)(permissions);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
    const userRecord = await db_1.models.user.findByPk(user.id);
    if (!userRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking KYC eligibility for API key access");
    await (0, kyc_1.assertKycFeatureOrLegacy)(user.id, kyc_1.KYC_FEATURES.API_KEYS, { minLevel: 2 }, "create API keys");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking API key limit");
    const existingApiKeys = await db_1.models.apiKey.count({
        where: { userId: user.id },
    });
    if (existingApiKeys >= 10) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("API key limit reached (10 keys)");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You have reached the limit of 10 API keys.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating new API key");
    const newKey = await db_1.models.apiKey.create({
        userId: user.id,
        name: name,
        key: (0, utils_2.generateApiKey)(),
        permissions: validatedPermissions,
        ipWhitelist: ipWhitelist || [],
        ipRestriction: ipRestriction !== null && ipRestriction !== void 0 ? ipRestriction : true,
        type: "user",
    });
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "api_key.created",
        title: "API key created",
        description: name || "New API key",
        severity: "success",
        req: data,
        metadata: { apiKeyId: newKey.id, permissions: validatedPermissions },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key created successfully");
    return newKey;
};
