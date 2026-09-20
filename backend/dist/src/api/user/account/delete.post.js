"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const token_1 = require("@b/utils/token");
const utils_1 = require("./utils");
const anonymize_1 = require("./anonymize");
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
                        acknowledgeBalance: {
                            type: "boolean",
                            description: "Required when GET /api/user/account/delete reports acknowledgementRequired. Confirms the user has seen what they still hold and is giving it up.",
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
    const { confirmPassword, acknowledgeBalance } = body;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying password confirmation");
    if (!confirmPassword || typeof confirmPassword !== "string") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Password confirmation is required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Password confirmation is required",
        });
    }
    if (!currentUser.password) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Re-authentication required to delete this account");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "This account has no password set. Please re-authenticate before deleting your account.",
        });
    }
    const isPasswordValid = await (0, passwords_1.verifyPassword)(currentUser.password, confirmPassword);
    if (!isPasswordValid) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Incorrect password");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Incorrect password",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking what the account still holds");
    const preconditions = await (0, utils_1.getDeletionPreconditions)(user.id);
    if (preconditions.blockers.length > 0) {
        const orders = preconditions.blockers.find((b) => b.kind === "OPEN_ORDERS");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account has open orders");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: orders
                ? `You still have ${orders.count} open order${orders.count === 1 ? "" : "s"}. Cancel them, then delete your account.`
                : "This account cannot be deleted yet.",
        });
    }
    if (preconditions.acknowledgementRequired && acknowledgeBalance !== true) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Held funds not acknowledged");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This account still holds funds. Withdraw or transfer them first, or confirm that you are giving them up.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user account");
    await (0, anonymize_1.anonymizeAndSoftDeleteUser)(user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Ending the account's sessions");
    await (0, token_1.deleteAllUserSessions)(user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Account deleted successfully");
    return {
        message: "Your account has been successfully deleted",
    };
};
