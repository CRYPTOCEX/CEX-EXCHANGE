"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Block a user account",
    description: "Block a user account with reason and optional duration",
    operationId: "blockUser",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Block user",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user to block",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Reason for blocking the user",
                        },
                        isTemporary: {
                            type: "boolean",
                            description: "Whether this is a temporary block",
                            default: false,
                        },
                        duration: {
                            type: "number",
                            description: "Duration in hours (only for temporary blocks)",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "User blocked successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            blockId: { type: "string" },
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
    const { reason, isTemporary = false, duration } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating block parameters");
    if (isTemporary && (!duration || duration < 1 || duration > 8760)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Duration must be between 1 and 8760 hours for temporary blocks",
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
    if (targetUser.role && targetUser.role.name === "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Cannot block Super Admin accounts",
        });
    }
    if (targetUser.id === user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You cannot block your own account",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking existing blocks");
    const existingBlock = await db_1.models.userBlock.findOne({
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
    if (existingBlock) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User is already blocked",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating block record");
    let blockedUntil = null;
    if (isTemporary && duration) {
        blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    }
    const blockRecord = await db_1.models.userBlock.create({
        userId: id,
        adminId: user.id,
        reason,
        isTemporary,
        duration: isTemporary ? duration : null,
        blockedUntil,
        isActive: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating user status");
    const newStatus = isTemporary ? "SUSPENDED" : "BANNED";
    await db_1.models.user.update({ status: newStatus }, { where: { id } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        message: `User ${isTemporary ? "temporarily blocked" : "blocked"} successfully`,
        blockId: blockRecord.id,
    };
};
