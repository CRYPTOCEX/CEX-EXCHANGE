"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "Get NFT marketplace information",
    operationId: "getNftMarketplaceInfo",
    tags: ["NFT", "Marketplace", "Info"],
    parameters: [
        {
            name: "chain",
            in: "query",
            required: false,
            description: "Blockchain chain (e.g., ETH, POLYGON, BSC)",
            schema: { type: "string", default: "ETH" },
        },
    ],
    responses: {
        200: {
            description: "Marketplace information retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    chain: { type: "string" },
                                    contractAddress: { type: "string" },
                                    feeRecipient: { type: "string" },
                                    feePercentage: { type: "number" },
                                    listingFee: { type: "number" },
                                    maxRoyaltyPercentage: { type: "number" },
                                    isDeployed: { type: "boolean" },
                                    isPaused: { type: "boolean" },
                                    deployedAt: { type: "string" },
                                    supportedStandards: {
                                        type: "array",
                                        items: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        404: { description: "Marketplace not deployed for this chain" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    var _a, _b;
    var _c, _d;
    const { query } = data;
    const { chain = "ETH" } = query;
    try {
        const marketplace = await db_1.models.nftMarketplace.findOne({
            where: {
                chain: chain.toUpperCase(),
                status: "ACTIVE"
            },
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: db_1.models.user,
                    as: "deployer",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES]
                }
            ]
        });
        if (!marketplace) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `No marketplace contract deployed for ${chain}`
            });
        }
        try {
            const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
            marketplaceService.setMarketplaceAddress(marketplace.contractAddress);
            const [feeRecipient, feePercentage, isPaused] = await Promise.all([
                marketplaceService.getFeeRecipient(),
                marketplaceService.getFeePercentage(),
                marketplaceService.isPaused()
            ]);
            return (0, display_name_1.redactPublicNames)({
                chain: chain.toUpperCase(),
                contractAddress: marketplace.contractAddress,
                feeRecipient,
                feePercentage,
                listingFee: marketplace.listingFee,
                maxRoyaltyPercentage: marketplace.maxRoyaltyPercentage,
                isDeployed: true,
                isPaused,
                deployedBy: (_c = (_a = marketplace.deployer) === null || _a === void 0 ? void 0 : _a.get({ plain: true })) !== null && _c !== void 0 ? _c : null,
                deployedAt: marketplace.createdAt,
                transactionHash: marketplace.transactionHash,
                blockNumber: marketplace.blockNumber,
                supportedStandards: ["ERC721", "ERC1155"]
            });
        }
        catch (contractError) {
            console_1.logger.warn("NFT_MARKETPLACE", `Could not fetch live contract data for ${chain}: ${contractError.message}`);
            return (0, display_name_1.redactPublicNames)({
                chain: chain.toUpperCase(),
                contractAddress: marketplace.contractAddress,
                feeRecipient: marketplace.feeRecipient,
                feePercentage: marketplace.feePercentage,
                listingFee: marketplace.listingFee,
                maxRoyaltyPercentage: marketplace.maxRoyaltyPercentage,
                isDeployed: true,
                isPaused: false,
                deployedBy: (_d = (_b = marketplace.deployer) === null || _b === void 0 ? void 0 : _b.get({ plain: true })) !== null && _d !== void 0 ? _d : null,
                deployedAt: marketplace.createdAt,
                transactionHash: marketplace.transactionHash,
                blockNumber: marketplace.blockNumber,
                supportedStandards: ["ERC721", "ERC1155"],
                note: "Live contract data unavailable - showing cached information"
            });
        }
    }
    catch (error) {
        console_1.logger.error("NFT_MARKETPLACE", "Failed to retrieve marketplace information", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve marketplace information"
        });
    }
};
