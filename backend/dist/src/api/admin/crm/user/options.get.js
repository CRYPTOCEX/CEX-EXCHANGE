"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of users",
    description: "This endpoint retrieves active users for selection in the UI. Each option includes the user's ID and full name (or email if a full name is not available).",
    operationId: "getUserOptions",
    tags: ["User"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Users retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_CRM",
    logTitle: "Get User Options",
    demoMask: ["name"],
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active users");
        const users = await db_1.models.user.findAll({
            where: { status: "ACTIVE" },
        });
        const formatted = users.map((u) => {
            const fullName = u.firstName && u.lastName
                ? `${u.firstName} ${u.lastName} - ${u.id}`
                : u.email;
            return {
                id: u.id,
                name: fullName,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("User options retrieved successfully");
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching users");
    }
};
