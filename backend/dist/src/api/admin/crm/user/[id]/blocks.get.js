"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get user block history",
    description: "Retrieve the block history for a specific user",
    operationId: "getUserBlocks",
    tags: ["Admin", "CRM", "User"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "User block history retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        reason: { type: "string" },
                                        isTemporary: { type: "boolean" },
                                        duration: { type: "number" },
                                        blockedUntil: { type: "string" },
                                        isActive: { type: "boolean" },
                                        createdAt: { type: "string" },
                                        admin: {
                                            type: "object",
                                            properties: {
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "User not found" },
    },
    requiresAuth: true,
    permission: "view.user",
    demoMask: ["data.admin.email"],
    logModule: "ADMIN_CRM",
    logTitle: "Get User Blocks",
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user existence");
    const targetUser = await db_1.models.user.findByPk(id);
    if (!targetUser) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user block history");
    const blocks = await db_1.models.userBlock.findAll({
        where: { userId: id },
        include: [
            {
                model: db_1.models.user,
                as: "admin",
                attributes: ["firstName", "lastName", "email"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("User block history retrieved successfully");
    return {
        data: blocks,
    };
};
