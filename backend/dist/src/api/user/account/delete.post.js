"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
exports.metadata = {
    summary: "Delete own user account",
    description: "Allow users to delete their own account (soft delete)",
    operationId: "deleteOwnAccount",
    tags: ["User", "Account"],
    logModule: "USER",
    logTitle: "Delete account",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        confirmPassword: {
                            type: "string",
                            description: "User's current password for confirmation",
                        },
                    },
                    required: ["confirmPassword"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Account deleted successfully",
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
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { confirmPassword } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving user account");
    const currentUser = await db_1.models.user.findOne({
        where: { id: user.id },
        include: [
            {
                model: db_1.models.role,
                as: "role",
                attributes: ["name"],
            },
        ],
    });
    if (!currentUser) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (currentUser.role && currentUser.role.name === "Super Admin") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Super Admin accounts cannot be self-deleted");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Super Admin accounts cannot be self-deleted",
        });
    }
    if (confirmPassword && currentUser.password) {
        const isPasswordValid = await (0, passwords_1.verifyPassword)(currentUser.password, confirmPassword);
        if (!isPasswordValid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Incorrect password",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user account");
    await currentUser.destroy();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Account deleted successfully");
    return {
        message: "Your account has been successfully deleted",
    };
};
