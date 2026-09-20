"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const user_activity_1 = require("@b/utils/user-activity");
const utils_2 = require("@b/api/user/profile/password/utils");
const transfer_pin_1 = require("@b/utils/transfer-pin");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Reset or unlock a user's Transfer PIN",
    description: "Clears the target user's Transfer PIN so they can set a new one, or merely lifts a lockout while leaving the PIN in place. Used to recover users locked out of transfers — in particular password-less accounts, which have no self-service route back. Requires the edit.user permission and cannot be used on your own account.",
    operationId: "adminResetUserTransferPin",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Reset user transfer PIN",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user whose Transfer PIN should be reset",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        action: {
                            type: "string",
                            description: 'What to do: "clear" (default) disables the PIN so the user sets a new one; "unlock" lifts the lockout and keeps the PIN.',
                            nullable: true,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transfer PIN reset successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            action: { type: "string" },
                            changed: { type: "boolean" },
                        },
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
    const { params, body, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_2.assertSessionCaller)(data);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target user");
    const targetUser = await (0, utils_1.assertCanAccessUser)(user.id, id);
    if (!targetUser) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    (0, system_accounts_1.assertNotSystemAccount)(targetUser, "have its Transfer PIN reset");
    if (String(targetUser.id) === String(user.id)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Use your own profile security settings to change or remove your Transfer PIN.",
        });
    }
    const action = (body === null || body === void 0 ? void 0 : body.action) === "unlock" ? "unlock" : "clear";
    const resolvedId = String(targetUser.id);
    const existing = await (0, transfer_pin_1.getTransferPinRecord)(resolvedId);
    if (!(existing === null || existing === void 0 ? void 0 : existing.enabled)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("User has no Transfer PIN set");
        return {
            message: "This user does not have a Transfer PIN set.",
            action,
            changed: false,
        };
    }
    if (action === "unlock") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Lifting Transfer PIN lockout");
        const wasLocked = await (0, transfer_pin_1.unlockTransferPin)(resolvedId);
        void (0, user_activity_1.recordUserActivity)({
            userId: resolvedId,
            type: "security.transfer_pin_unlocked",
            title: "Transfer PIN unlocked by admin",
            description: "An administrator lifted the lockout on this account's Transfer PIN",
            severity: "info",
            req: data,
            metadata: { resetByAdminId: user.id },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer PIN unlocked");
        return {
            message: wasLocked
                ? "The Transfer PIN lockout has been lifted. The user's existing PIN still applies."
                : "The Transfer PIN was not locked. The user's existing PIN still applies.",
            action,
            changed: wasLocked,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing Transfer PIN");
    await (0, transfer_pin_1.clearTransferPin)(resolvedId);
    void (0, user_activity_1.recordUserActivity)({
        userId: resolvedId,
        type: "security.transfer_pin_cleared",
        title: "Transfer PIN reset by admin",
        description: "An administrator cleared this account's Transfer PIN so a new one can be set",
        severity: "warning",
        req: data,
        metadata: { resetByAdminId: user.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer PIN cleared");
    return {
        message: "The Transfer PIN has been cleared. The user can set a new one from their profile security settings.",
        action,
        changed: true,
    };
};
