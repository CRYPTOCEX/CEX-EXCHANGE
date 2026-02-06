"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Token Offering Updates",
    description: "Fetches updates for a specific token offering.",
    operationId: "getTokenOfferingUpdates",
    tags: ["ICO", "Creator", "Updates"],
    logModule: "ICO",
    logTitle: "Get Creator Updates",
    requiresAuth: true,
    responses: {
        200: {
            description: "Token offering updates retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                offeringId: { type: "string" },
                                userId: { type: "string" },
                                title: { type: "string" },
                                content: { type: "string" },
                                attachments: { type: "array", items: { type: "object" } },
                                createdAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator updates");
    const { tokenId } = query;
    if (!tokenId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing tokenId parameter",
        });
    }
    const updates = await db_1.models.icoTokenOfferingUpdate.findAll({
        where: { offeringId: tokenId },
        order: [["createdAt", "DESC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Creator updates retrieved successfully");
    return updates;
};
