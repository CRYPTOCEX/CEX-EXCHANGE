"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "Get marketplace contract addresses",
    operationId: "getMarketplaceContracts",
    tags: ["NFT", "Marketplace", "Contract"],
    parameters: [
        {
            name: "chain",
            in: "query",
            description: "Specific blockchain to get contract for",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Marketplace contract addresses retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            type: "object",
                            additionalProperties: {
                                type: "object",
                                properties: {
                                    chain: { type: "string" },
                                    contractAddress: { type: "string" },
                                    isActive: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    var _a, _b;
    var _c, _d;
    const { query } = data;
    const { chain } = query;
    try {
        const supportedChains = ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"];
        const results = {};
        if (chain) {
            if (!supportedChains.includes(chain.toUpperCase())) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(", ")}`
                });
            }
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
                if (marketplace) {
                    results[chain.toUpperCase()] = {
                        chain: marketplace.chain,
                        contractAddress: marketplace.contractAddress,
                        isActive: marketplace.status === "ACTIVE",
                        feeRecipient: marketplace.feeRecipient,
                        feePercentage: marketplace.feePercentage,
                        deployedBy: (_c = (_a = marketplace.deployer) === null || _a === void 0 ? void 0 : _a.get({ plain: true })) !== null && _c !== void 0 ? _c : null,
                        deployedAt: marketplace.createdAt,
                        transactionHash: marketplace.transactionHash,
                        blockNumber: marketplace.blockNumber
                    };
                }
                else {
                    results[chain.toUpperCase()] = {
                        chain: chain.toUpperCase(),
                        contractAddress: null,
                        isActive: false,
                        error: "No marketplace contract deployed"
                    };
                }
            }
            catch (error) {
                results[chain.toUpperCase()] = {
                    chain: chain.toUpperCase(),
                    contractAddress: null,
                    isActive: false,
                    error: error.message
                };
            }
        }
        else {
            for (const chainName of supportedChains) {
                try {
                    const marketplace = await db_1.models.nftMarketplace.findOne({
                        where: {
                            chain: chainName,
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
                    if (marketplace) {
                        results[chainName] = {
                            chain: marketplace.chain,
                            contractAddress: marketplace.contractAddress,
                            isActive: marketplace.status === "ACTIVE",
                            feeRecipient: marketplace.feeRecipient,
                            feePercentage: marketplace.feePercentage,
                            deployedBy: (_d = (_b = marketplace.deployer) === null || _b === void 0 ? void 0 : _b.get({ plain: true })) !== null && _d !== void 0 ? _d : null,
                            deployedAt: marketplace.createdAt,
                            transactionHash: marketplace.transactionHash,
                            blockNumber: marketplace.blockNumber
                        };
                    }
                    else {
                        results[chainName] = {
                            chain: chainName,
                            contractAddress: null,
                            isActive: false,
                            error: "No marketplace contract deployed"
                        };
                    }
                }
                catch (error) {
                    results[chainName] = {
                        chain: chainName,
                        contractAddress: null,
                        isActive: false,
                        error: error.message
                    };
                }
            }
        }
        return (0, display_name_1.redactPublicNames)(results);
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to get marketplace contract addresses", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to get marketplace contract addresses"
        });
    }
};
