"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update an existing NFT category",
    description: "Updates an NFT category's name, description, image, or status. Automatically regenerates the slug if the name is changed. Requires category ID and at least one field to update.",
    operationId: "updateAdminNftCategory",
    tags: ["Admin", "NFT", "Category"],
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT category",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        image: { type: "string" },
                        status: { type: "boolean" },
                    },
                    required: ["id"],
                },
            },
        },
    },
    responses: {
        200: { description: "Category updated successfully" },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("NFT Category"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.nft",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { id, ...updateData } = body;
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
        if (updateData.name && updateData.name !== category.name) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating new slug from updated name");
            updateData.slug = updateData.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating category");
        const updatedCategory = await category.update(updateData);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Category '${updatedCategory.name}' updated successfully`);
        return {
            message: "Category updated successfully",
            data: updatedCategory
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        if (error.name === 'SequelizeUniqueConstraintError') {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Category with this name already exists");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Category with this name already exists",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to update category");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to update category",
        });
    }
};
