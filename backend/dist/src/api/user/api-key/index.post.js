"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("./utils");
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
    const { name, permissions, ipWhitelist, ipRestriction } = body;
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
        key: (0, utils_1.generateApiKey)(),
        permissions: permissions || [],
        ipWhitelist: ipWhitelist || [],
        ipRestriction: ipRestriction !== null && ipRestriction !== void 0 ? ipRestriction : false,
        type: "user",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key created successfully");
    return newKey;
};
