"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Updates an API key",
    description: "Updates an API key's details such as name, type, permissions, IP whitelist, or IP restriction.",
    operationId: "updateApiKey",
    tags: ["API Key Management"],
    logModule: "ADMIN_API",
    logTitle: "Update API",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the API key to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Data for updating the API key",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Updated name of the API key",
                        },
                        type: {
                            type: "string",
                            enum: ["plugin", "user"],
                            description: "Updated type of the API key (plugin or user)",
                        },
                        key: {
                            type: "string",
                            description: "Updated API key string",
                        },
                        permissions: {
                            type: "array",
                            items: { type: "string" },
                            description: "Updated permissions associated with the API key",
                        },
                        ipWhitelist: {
                            type: "array",
                            items: { type: "string" },
                            description: "Updated IP whitelist for the API key",
                        },
                        ipRestriction: {
                            type: "boolean",
                            description: "Updated IP restriction setting (true for restricted, false for unrestricted)",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "API key updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            type: { type: "string" },
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
        404: { description: "API key not found" },
        500: { description: "Server error" },
    },
    requiresAuth: true,
    permission: "edit.api.key",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { userId, name, type, key, permissions, ipWhitelist, ipRestriction } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating API key");
    const apiKey = await db_1.models.apiKey.findOne({
        where: { id },
    });
    if (!apiKey)
        throw (0, error_1.createError)({ statusCode: 404, message: "API Key not found" });
    const parseIfString = (input) => {
        try {
            return typeof input === "string" ? JSON.parse(input) : input;
        }
        catch (_a) {
            return input;
        }
    };
    const updatedFields = {};
    if (permissions !== undefined) {
        updatedFields.permissions = sanitizePermissions(parseIfString(permissions));
    }
    if (ipWhitelist !== undefined)
        updatedFields.ipWhitelist = parseIfString(ipWhitelist);
    if (userId !== undefined)
        updatedFields.userId = userId;
    if (name !== undefined)
        updatedFields.name = name;
    if (type !== undefined)
        updatedFields.type = type;
    if (key !== undefined)
        updatedFields.key = key;
    if (ipRestriction !== undefined)
        updatedFields.ipRestriction = Boolean(ipRestriction);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating API key");
    const updatedApiKey = await apiKey.update(updatedFields);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return updatedApiKey;
};
const sanitizePermissions = (permissions) => {
    if (!Array.isArray(permissions))
        return [];
    return permissions.filter((perm) => !["[", "]"].includes(perm));
};
