"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete NFT collection",
    operationId: "deleteAdminNftCollection",
    tags: ["Admin", "NFT", "Collection"],
    description: "Delete an NFT collection by ID. Collections with existing tokens cannot be deleted and will return a 400 error. Only collections without any minted tokens can be permanently deleted.",
    logModule: "ADMIN_NFT",
    logTitle: "Delete NFT collection",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Collection ID to delete",
                        },
                    },
                    required: ["id"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("Collection deleted successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Collection"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.nft",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { id } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching collection");
        const collection = await db_1.models.nftCollection.findByPk(id);
        if (!collection) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Collection not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing tokens");
        const tokenCount = await db_1.models.nftToken.count({
            where: { collectionId: id }
        });
        if (tokenCount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Collection has ${tokenCount} existing tokens`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete collection with existing tokens"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting collection");
        await collection.destroy();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Collection deleted successfully");
        return { message: "Collection deleted successfully" };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to delete collection");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to delete collection",
        });
    }
};
