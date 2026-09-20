"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const user_activity_1 = require("@b/utils/user-activity");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Reset (disable) a user's two-factor authentication",
    description: "Clears the target user's 2FA configuration so they can re-enroll. Used to recover users locked out by a broken or lost authenticator. Requires the edit.user permission and cannot be used on your own account (self-disable must go through the password-gated user flow).",
    operationId: "adminResetUserTwoFactor",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Reset user 2FA",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user whose 2FA should be reset",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "2FA reset successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        400: { description: "Bad request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "User not found" },
    },
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, utils_1.assertCanAccessUser)(user.id, id);
    (0, system_accounts_1.assertNotSystemAccount)(id, "have its two-factor authentication reset");
    if (id === user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Use the password-protected security settings to disable your own 2FA.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target user");
    const targetUser = await db_1.models.user.findByPk(id);
    if (!targetUser) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing two-factor configuration");
    const existing = await db_1.models.twoFactor.findOne({ where: { userId: id } });
    if (!existing) {
        return { message: "User does not have 2FA configured" };
    }
    await db_1.models.twoFactor.destroy({ where: { userId: id }, force: true });
    void (0, user_activity_1.recordUserActivity)({
        userId: id,
        type: "security.2fa_disabled",
        title: "Two-factor authentication reset by admin",
        description: "An administrator cleared 2FA for this account",
        severity: "warning",
        req: data,
        metadata: { resetByAdminId: user.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("2FA reset successfully");
    return { message: "Two-factor authentication has been reset for this user" };
};
