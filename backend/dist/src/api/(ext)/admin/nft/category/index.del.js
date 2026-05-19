"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete an NFT category",
    description: "Deletes an NFT category by ID. Prevents deletion if the category has existing collections to maintain data integrity. Requires authentication and delete.nft permission.",
    operationId: "deleteAdminNftCategory",
    tags: ["Admin", "NFT", "Category"],
    logModule: "ADMIN_NFT",
    logTitle: "Delete NFT category",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                    },
                    required: ["id"],
                },
            },
        },
    },
    responses: {
        200: { description: "Category deleted successfully" },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("NFT Category"),
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching category");
        const category = await db_1.models.nftCategory.findByPk(id);
        if (!category) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Category not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Category not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing collections");
        const collectionCount = await db_1.models.nftCollection.count({
            where: { categoryId: id }
        });
        if (collectionCount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Category has ${collectionCount} existing collections`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot delete category with existing collections"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting category");
        await category.destroy();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Category deleted successfully");
        return { message: "Category deleted successfully" };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to delete category");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to delete category",
        });
    }
};
