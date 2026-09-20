"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk update NFT collection",
    operationId: "bulkUpdateAdminNftCollection",
    tags: ["Admin", "NFT", "Collection"],
    description: "Update an NFT collection by ID provided in the request body. Admins have full control and can modify all fields including blockchain settings and social links. This endpoint validates blockchain networks before updating chain-related fields.",
    logModule: "ADMIN_NFT",
    logTitle: "Bulk update NFT collection",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid", description: "Collection ID" },
                        name: { type: "string", description: "Collection name" },
                        description: { type: "string", description: "Collection description" },
                        symbol: { type: "string", description: "Collection symbol" },
                        chain: { type: "string", description: "Blockchain network" },
                        network: { type: "string", description: "Network type (mainnet, testnet)" },
                        standard: { type: "string", enum: ["ERC721", "ERC1155"], description: "Token standard" },
                        maxSupply: { type: "number", description: "Maximum supply" },
                        mintPrice: { type: "number", description: "Minting price" },
                        currency: { type: "string", description: "Currency for minting" },
                        royaltyPercentage: { type: "number", description: "Royalty percentage" },
                        royaltyAddress: { type: "string", description: "Royalty recipient address" },
                        categoryId: { type: "string", format: "uuid", description: "Category ID" },
                        bannerImage: { type: "string", description: "Banner image URL" },
                        logoImage: { type: "string", description: "Logo image URL" },
                        featuredImage: { type: "string", description: "Featured image URL" },
                        website: { type: "string", description: "Website URL" },
                        discord: { type: "string", description: "Discord URL" },
                        twitter: { type: "string", description: "Twitter URL" },
                        telegram: { type: "string", description: "Telegram URL" },
                        isVerified: { type: "boolean", description: "Verification status" },
                        isLazyMinted: { type: "boolean", description: "Lazy minting enabled" },
                        status: { type: "string", enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"], description: "Collection status" },
                    },
                    required: ["id"],
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
                                description: "Updated collection data"
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
    permission: "edit.nft",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { id, ...updateData } = body;
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
        if (updateData.chain) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blockchain");
            const blockchain = await db_1.models.ecosystemBlockchain.findOne({
                where: {
                    name: updateData.chain,
                    status: true
                }
            });
            if (!blockchain) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or disabled blockchain");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Invalid or disabled blockchain"
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
