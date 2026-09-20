"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get NFT collection by ID",
    operationId: "getAdminNftCollectionById",
    tags: ["Admin", "NFT", "Collection"],
    description: "Retrieve detailed information about a specific NFT collection by its ID. Includes creator and category details.",
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT collection details",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Collection ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: (0, errors_1.singleItemResponse)({
            type: "object",
            properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                slug: { type: "string" },
                description: { type: "string", nullable: true },
                symbol: { type: "string" },
                contractAddress: { type: "string", nullable: true },
                chain: { type: "string" },
                network: { type: "string" },
                standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                totalSupply: { type: "integer" },
                maxSupply: { type: "integer", nullable: true },
                mintPrice: { type: "number", nullable: true },
                currency: { type: "string" },
                royaltyPercentage: { type: "number" },
                royaltyAddress: { type: "string", nullable: true },
                bannerImage: { type: "string", nullable: true },
                logoImage: { type: "string", nullable: true },
                featuredImage: { type: "string", nullable: true },
                website: { type: "string", nullable: true },
                discord: { type: "string", nullable: true },
                twitter: { type: "string", nullable: true },
                telegram: { type: "string", nullable: true },
                isVerified: { type: "boolean" },
                isLazyMinted: { type: "boolean" },
                isPublicMintEnabled: { type: "boolean" },
                status: { type: "string", enum: ["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"] },
                metadata: { type: "object", nullable: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                creator: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        avatar: { type: "string", nullable: true }
                    }
                },
                category: {
                    type: "object",
                    nullable: true,
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        slug: { type: "string" }
                    }
                }
            }
        }, "Collection retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Collection"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.nft",
    demoMask: ["creator.email"],
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT collection by ID");
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const collection = await db_1.models.nftCollection.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "creator",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.nftCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
            ],
        });
        if (!collection) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT collection retrieved successfully");
        return collection;
    }
    catch (error) {
        console.error("Error fetching NFT collection:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT collection"
        });
    }
};
