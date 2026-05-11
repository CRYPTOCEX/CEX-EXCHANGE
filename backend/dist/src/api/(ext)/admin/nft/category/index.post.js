"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create a new NFT category",
    description: "Creates a new NFT category with name, description, image, and status. Automatically generates a URL-friendly slug from the category name. Categories help organize NFT collections into logical groups.",
    operationId: "createAdminNftCategory",
    tags: ["Admin", "NFT", "Category"],
    logModule: "ADMIN_NFT",
    logTitle: "Create NFT category",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        image: { type: "string" },
                        status: { type: "boolean" },
                    },
                    required: ["name"],
                },
            },
        },
    },
    responses: {
        200: { description: "Category created successfully" },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.nft",
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating slug from name");
        const slug = body.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating category");
        const category = await db_1.models.nftCategory.create({
            ...body,
            slug,
            status: (_a = body.status) !== null && _a !== void 0 ? _a : true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Category '${category.name}' created successfully`);
        return {
            message: "Category created successfully",
            data: category
        };
    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Category with this name already exists");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Category with this name already exists",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to create category");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to create category",
        });
    }
};
