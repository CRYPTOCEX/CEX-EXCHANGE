"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
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
    const { firstName, lastName, email, roleId, avatar, phone, emailVerified, twoFactor, status, profile, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target user");
    const existingUser = await db_1.models.user.findOne({
        where: { id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!existingUser) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    if (existingUser.id === userPk.id && ((_a = userPk.role) === null || _a === void 0 ? void 0 : _a.name) !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You cannot update your own account",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating user details");
    await db_1.models.user.update({
        firstName,
        lastName,
        email,
        avatar,
        phone,
        emailVerified,
        status,
        profile,
        ...(((_b = userPk.role) === null || _b === void 0 ? void 0 : _b.name) === "Super Admin" && { roleId }),
    }, {
        where: { id },
    });
    if (twoFactor) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Disabling two-factor authentication");
        await db_1.models.twoFactor.update({ enabled: false }, { where: { userId: id } });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        message: "User updated successfully",
    };
};
