"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Deletes a specific user by UUID",
    operationId: "deleteUserByUuid",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Delete user",
    parameters: (0, query_1.deleteRecordParams)("user"),
    responses: (0, query_1.deleteRecordResponses)("User"),
    requiresAuth: true,
    permission: "delete.user",
};
exports.default = async (data) => {
    const { params, query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    const userPk = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (!userPk || !userPk.role || userPk.role.name !== "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - Only Super Admins can delete users",
        });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating target user");
    const targetUser = await db_1.models.user.findOne({
        where: { id },
        include: [{ model: db_1.models.role, as: "role" }],
    });
    if (targetUser && targetUser.role && targetUser.role.name === "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden - You cannot delete another Super Admin account",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user");
    const result = await (0, query_1.handleSingleDelete)({
        model: "user",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
