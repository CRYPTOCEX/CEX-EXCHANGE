"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Deletes an API key",
    description: "Deletes an API key by its ID.",
    operationId: "deleteApiKey",
    tags: ["API Key Management"],
    logModule: "USER",
    logTitle: "Delete API key",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the API key to delete",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "API key deleted successfully",
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
        404: { description: "API key not found" },
        500: { description: "Server error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding API key");
    const apiKey = await db_1.models.apiKey.findOne({
        where: { id, userId: user.id },
    });
    if (!apiKey) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("API Key not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "API Key not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting API key");
    await apiKey.destroy({ force: true });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API Key deleted successfully");
    return { message: "API Key deleted successfully" };
};
