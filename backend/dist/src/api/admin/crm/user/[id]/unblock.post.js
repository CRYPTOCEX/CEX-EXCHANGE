"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Unblock a user account",
    description: "Unblock a user account and restore access",
    operationId: "unblockUser",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Unblock user",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user to unblock",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "User unblocked successfully",
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
        404: { description: "User not found" },
    },
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target user");
    const targetUser = await db_1.models.user.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.role,
                as: "role",
                attributes: ["name"],
            },
        ],
    });
    if (!targetUser) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking active block");
    const activeBlock = await db_1.models.userBlock.findOne({
        where: {
            userId: id,
            isActive: true,
            [sequelize_1.Op.or]: [
                { isTemporary: false },
                {
                    isTemporary: true,
                    blockedUntil: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
            ],
        },
    });
    if (!activeBlock) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User is not currently blocked",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deactivating block record");
    await db_1.models.userBlock.update({ isActive: false }, { where: { id: activeBlock.id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Restoring user access");
    await db_1.models.user.update({ status: "ACTIVE" }, { where: { id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        message: "User unblocked successfully",
    };
};
