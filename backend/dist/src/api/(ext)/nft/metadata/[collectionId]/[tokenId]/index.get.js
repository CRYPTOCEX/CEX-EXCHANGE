"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.default = async (data) => {
    var _a;
    const { params } = data;
    try {
        const { collectionId, tokenId } = params;
        if (!collectionId || !tokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection ID and Token ID are required",
            });
        }
        const token = await db_1.models.nftToken.findOne({
            where: {
                collectionId,
                tokenId,
            },
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["name", "symbol", "contractAddress"],
                },
            ],
        });
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `NFT not found: Collection ${collectionId}, Token #${tokenId}`,
            });
        }
        let imageUrl = token.image || "";
        if (imageUrl.includes("/ipfs/")) {
            const ipfsHash = imageUrl.split("/ipfs/")[1];
            imageUrl = `ipfs://${ipfsHash}`;
        }
        let attributes = [];
        if (token.attributes) {
            try {
                let parsedAttributes = token.attributes;
                while (typeof parsedAttributes === "string") {
                    parsedAttributes = JSON.parse(parsedAttributes);
                }
                attributes = Array.isArray(parsedAttributes) ? parsedAttributes : [];
            }
            catch (e) {
                console_1.logger.warn("NFT", "Failed to parse attributes", e);
                console_1.logger.debug("NFT", "Raw attributes", token.attributes);
                attributes = [];
            }
        }
        if (token.rarity && token.rarity !== "COMMON") {
            attributes.push({
                trait_type: "Rarity",
                value: token.rarity,
            });
        }
        const metadata = {
            name: token.name,
            description: token.description || `${token.name} from ${((_a = token.collection) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'} collection`,
            image: imageUrl,
            external_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/nft/${token.id}`,
            attributes: attributes,
        };
        if (token.collection) {
            metadata["collection"] = {
                name: token.collection.name,
                symbol: token.collection.symbol,
            };
        }
        return metadata;
    }
    catch (error) {
        console_1.logger.error("NFT", "Error fetching metadata", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT metadata",
        });
    }
};
exports.metadata = {
    summary: "Get NFT metadata in ERC-721 standard format",
    operationId: "getNftMetadata",
    description: "Returns NFT metadata JSON for wallets and marketplaces (MetaMask, OpenSea, etc.)",
    tags: ["NFT", "Metadata"],
    parameters: [
        {
            name: "collectionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The collection ID"
        },
        {
            name: "tokenId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The token ID within the collection"
        }
    ],
    responses: {
        200: {
            description: "NFT metadata retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                            image: { type: "string" },
                            external_url: { type: "string" },
                            attributes: { type: "array" }
                        }
                    }
                }
            }
        },
        400: { description: "Bad request - missing parameters" },
        404: { description: "NFT not found" },
        500: { description: "Server error" }
    },
    requiresAuth: false
};
