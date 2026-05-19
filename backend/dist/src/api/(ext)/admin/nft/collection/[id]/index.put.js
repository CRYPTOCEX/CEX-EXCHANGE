"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update NFT collection",
    operationId: "updateAdminNftCollectionById",
    tags: ["Admin", "NFT", "Collection"],
    description: "Update an NFT collection by ID. Admins can only modify descriptive fields (name, description, images) and admin-specific settings (verification, featured status). Blockchain-immutable fields (chain, standard, contract address, supply, royalties) and creator-only fields (social links) cannot be modified.",
    logModule: "ADMIN_NFT",
    logTitle: "Update NFT collection",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Collection ID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Collection name" },
                        description: { type: "string", description: "Collection description" },
                        image: { type: "string", description: "Main collection image" },
                        bannerImage: { type: "string", description: "Banner image" },
                        logoImage: { type: "string", description: "Logo image" },
                        featuredImage: { type: "string", description: "Featured image" },
                        isVerified: { type: "boolean", description: "Verified status (admin only)" },
                        isFeatured: { type: "boolean", description: "Featured status (admin only)" },
                        status: {
                            type: "string",
                            enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"],
                            description: "Collection status (admin only)"
                        },
                    },
                    description: "Only name, description, images, verification status, featured status, and status can be edited by admins. Social links and blockchain settings are creator-only."
                },
            },
        },
    },
    responses: {
        200: {
            description: "Collection updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "string", format: "uuid" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    bannerImage: { type: "string" },
                                    logoImage: { type: "string" },
                                    featuredImage: { type: "string" },
                                    isVerified: { type: "boolean" },
                                    isFeatured: { type: "boolean" },
                                    status: { type: "string" },
                                    updatedAt: { type: "string", format: "date-time" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Collection"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.nft.collection",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id } = params;
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating allowed fields");
        const allowedFields = [
            'name',
            'description',
            'image',
            'bannerImage',
            'logoImage',
            'featuredImage',
            'isVerified',
            'isFeatured',
            'status'
        ];
        const updateData = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }
        const blockedFields = [
            'chain', 'standard', 'currency', 'network', 'contractAddress',
            'maxSupply', 'totalSupply', 'royaltyPercentage', 'royaltyAddress', 'mintPrice', 'isLazyMinted',
            'website', 'discord', 'twitter', 'telegram'
        ];
        for (const field of blockedFields) {
            if (body[field] !== undefined) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Attempt to modify blocked field: ${field}`);
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Field '${field}' cannot be modified as it is set by the collection creator or is blockchain-immutable`
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating collection");
        const updatedCollection = await collection.update(updateData);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Collection '${updatedCollection.name}' updated successfully`);
        return {
            message: "Collection updated successfully",
            data: updatedCollection
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to update collection");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to update collection",
        });
    }
};
