"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Updates an API key",
    description: "Updates an API key's details such as permissions, IP whitelist, or IP restriction.",
    operationId: "updateApiKey",
    tags: ["API Key Management"],
    logModule: "USER",
    logTitle: "Update API key",
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
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { permissions, ipWhitelist, ipRestriction } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding API key");
    const apiKey = await db_1.models.apiKey.findOne({
        where: { id, userId: user.id },
    });
    if (!apiKey) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("API Key not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "API Key not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating and preparing update fields");
    const updatedFields = {};
    if (permissions !== undefined)
        updatedFields.permissions = permissions;
    if (ipWhitelist !== undefined)
        updatedFields.ipWhitelist = ipWhitelist;
    if (ipRestriction !== undefined)
        updatedFields.ipRestriction = Boolean(ipRestriction);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating API key");
    const updatedApiKey = await apiKey.update(updatedFields);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API Key updated successfully");
    return updatedApiKey;
};
