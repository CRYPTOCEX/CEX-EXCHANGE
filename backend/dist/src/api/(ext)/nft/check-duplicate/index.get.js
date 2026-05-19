"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Check if NFT metadata URI already exists in collection",
    operationId: "checkDuplicateNftMetadata",
    tags: ["NFT", "Token", "Validation"],
    logModule: "NFT",
    logTitle: "Check NFT Duplicate",
    description: "Checks if an IPFS metadata URI has already been minted in a specific collection",
    parameters: [
        {
            name: "collectionId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Collection ID to check within"
        },
        {
            name: "metadataUri",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "IPFS metadata URI to check for duplicates"
        }
    ],
    responses: {
        200: {
            description: "Check result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            exists: { type: "boolean" },
                            tokenId: { type: "string", nullable: true },
                            message: { type: "string" }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    try {
        const { user, query, ctx } = data;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
        }
        const { collectionId, metadataUri } = query;
        if (!collectionId || !metadataUri) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "collectionId and metadataUri are required"
            });
        }
        const normalizedUri = metadataUri.trim().toLowerCase().replace(/\/$/, '');
        const existingToken = await db_1.models.nftToken.findOne({
            where: {
                collectionId: collectionId,
                metadataUri: normalizedUri
            },
            attributes: ['id', 'name', 'metadataUri', 'tokenId']
        });
        if (existingToken) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Check NFT Duplicate completed successfully");
            return {
                exists: true,
                tokenId: existingToken.id,
                blockchainTokenId: existingToken.tokenId,
                name: existingToken.name,
                message: `This metadata URI has already been minted as "${existingToken.name}" (Token ID: ${existingToken.tokenId})`
            };
        }
        if (normalizedUri.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || normalizedUri.includes('/ipfs/')) {
            const existingByImage = await db_1.models.nftToken.findOne({
                where: {
                    collectionId: collectionId,
                    image: normalizedUri
                },
                attributes: ['id', 'name', 'image', 'tokenId']
            });
            if (existingByImage) {
                return {
                    exists: true,
                    tokenId: existingByImage.id,
                    blockchainTokenId: existingByImage.tokenId,
                    name: existingByImage.name,
                    message: `This image URL has already been used for "${existingByImage.name}" (Token ID: ${existingByImage.tokenId})`
                };
            }
        }
        return {
            exists: false,
            tokenId: null,
            message: "This metadata URI is unique and can be minted"
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Check duplicate NFT error", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to check for duplicate metadata"
        });
    }
};
