"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const passwords_1 = require("@b/utils/passwords");
const token_1 = require("@b/utils/token");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Updates a specific user by UUID",
    operationId: "updateUserByUuid",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Update user",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.userUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("User"),
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { firstName, lastName, email, roleId, avatar, phone, emailVerified, phoneVerified, twoFactor, status, profile, currentPassword, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const userPk = await db_1.models.user.findOne({
        where: { id: user.id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!userPk) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized - User not found",
        });
    }
    const isSuperAdmin = ((_a = userPk.role) === null || _a === void 0 ? void 0 : _a.name) === "Super Admin";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target user");
    const existingUser = await db_1.models.user.findOne({
        where: { id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!existingUser) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    (0, system_accounts_1.assertNotSystemAccount)(existingUser, "edited");
    if (existingUser.id === userPk.id && !isSuperAdmin) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You cannot update your own account",
        });
    }
    if (((_b = existingUser.role) === null || _b === void 0 ? void 0 : _b.name) === "Super Admin" && !isSuperAdmin) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You cannot edit a Super Admin account",
        });
    }
    const willChangeEmail = email !== undefined && email !== existingUser.email;
    if (willChangeEmail && (0, system_accounts_1.isReservedEmail)(email)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "User already exists" });
    }
    const nextRoleId = Number(roleId);
    const willChangeRole = roleId !== undefined &&
        (!Number.isFinite(nextRoleId) || nextRoleId !== Number(existingUser.roleId));
    const willDisableTwoFactor = Boolean(twoFactor);
    if (willChangeRole && !isSuperAdmin) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Only a Super Admin can change a user's role",
        });
    }
    if (!isSuperAdmin && (willChangeEmail || willDisableTwoFactor)) {
        if (!currentPassword) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Your current password is required to change this user's email address or 2FA",
            });
        }
        if (!userPk.password ||
            !(await (0, passwords_1.verifyPassword)(userPk.password, currentPassword))) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Incorrect password" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating user details");
    const trimmedPhone = typeof phone === "string" ? phone.trim() : phone;
    const normalizedPhone = trimmedPhone === undefined || trimmedPhone === null || trimmedPhone === ""
        ? (0, utils_1.blankToNull)(trimmedPhone)
        : `+${String(trimmedPhone).replace(/\D/g, "").slice(0, 15)}`;
    await db_1.models.user.update({
        firstName,
        lastName,
        email,
        avatar: (0, utils_1.blankToNull)(avatar),
        phone: normalizedPhone,
        emailVerified,
        phoneVerified,
        status,
        profile: (0, utils_1.normalizeProfile)(profile),
        ...(isSuperAdmin && roleId !== undefined && Number.isFinite(nextRoleId)
            ? { roleId: nextRoleId }
            : {}),
    }, { where: { id } });
    if (willDisableTwoFactor) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Disabling two-factor authentication");
        await db_1.models.twoFactor.update({ enabled: false }, { where: { userId: id } });
    }
    if (willChangeEmail ||
        willChangeRole ||
        willDisableTwoFactor ||
        status === "BANNED" ||
        status === "SUSPENDED") {
        await (0, token_1.deleteAllUserSessions)(id);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return { message: "User updated successfully" };
};
