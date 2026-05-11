"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get supported NFT blockchains",
    operationId: "getSupportedNFTChains",
    tags: ["NFT", "Chains"],
    logModule: "NFT",
    logTitle: "Get NFT Chains",
    description: "Returns list of blockchains where NFT marketplace contracts are deployed and enabled",
    responses: {
        200: {
            description: "Supported chains retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        chain: { type: "string", description: "Chain identifier (e.g., ETH, BSC, POLYGON)" },
                                        network: { type: "string", description: "Network type (mainnet, testnet)" },
                                        currency: { type: "string", description: "Native currency symbol" },
                                        name: { type: "string", description: "Human-readable chain name" },
                                        icon: { type: "string", description: "Chain icon/emoji" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
const CHAIN_METADATA = {
    ETH: { name: "Ethereum", icon: "/img/crypto/eth.webp", currency: "ETH" },
    ETHEREUM: { name: "Ethereum", icon: "/img/crypto/eth.webp", currency: "ETH" },
    BSC: { name: "BNB Smart Chain", icon: "/img/crypto/bnb.webp", currency: "BNB" },
    BINANCE: { name: "BNB Smart Chain", icon: "/img/crypto/bnb.webp", currency: "BNB" },
    POLYGON: { name: "Polygon", icon: "/img/crypto/matic.webp", currency: "MATIC" },
    MATIC: { name: "Polygon", icon: "/img/crypto/matic.webp", currency: "MATIC" },
    ARBITRUM: { name: "Arbitrum", icon: "/img/crypto/arb.webp", currency: "ETH" },
    OPTIMISM: { name: "Optimism", icon: "/img/crypto/op.webp", currency: "ETH" },
    AVALANCHE: { name: "Avalanche", icon: "/img/crypto/avax.webp", currency: "AVAX" },
    AVAX: { name: "Avalanche", icon: "/img/crypto/avax.webp", currency: "AVAX" },
    BASE: { name: "Base", icon: "/img/crypto/base.webp", currency: "ETH" },
    FANTOM: { name: "Fantom", icon: "/img/crypto/ftm.webp", currency: "FTM" },
    FTM: { name: "Fantom", icon: "/img/crypto/ftm.webp", currency: "FTM" },
    CRONOS: { name: "Cronos", icon: "/img/crypto/cro.webp", currency: "CRO" },
    CRO: { name: "Cronos", icon: "/img/crypto/cro.webp", currency: "CRO" },
};
exports.default = async (data) => {
    try {
        const { ctx } = data;
        const deployedMarketplaces = await db_1.models.nftMarketplace.findAll({
            where: {
                status: "ACTIVE",
            },
            attributes: ["chain", "network"],
            raw: true,
        });
        if (!deployedMarketplaces || deployedMarketplaces.length === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Chains completed successfully");
            return {
                data: [],
            };
        }
        const supportedChains = await Promise.all(deployedMarketplaces.map(async (marketplace) => {
            let ecosystemToken = null;
            try {
                ecosystemToken = await db_1.models.ecosystemToken.findOne({
                    where: {
                        chain: marketplace.chain,
                        network: marketplace.network,
                        status: true,
                    },
                    attributes: ["currency"],
                    raw: true,
                });
            }
            catch (error) {
                console_1.logger.warn("NFT_CHAINS", `Failed to fetch ecosystem token for ${marketplace.chain}: ecosystem extension may not be available`);
            }
            const chainKey = marketplace.chain.toUpperCase();
            const metadata = CHAIN_METADATA[chainKey] || {
                name: marketplace.chain,
                icon: "⚡",
                currency: "ETH",
            };
            return {
                chain: marketplace.chain,
                network: marketplace.network,
                currency: metadata.currency || (ecosystemToken === null || ecosystemToken === void 0 ? void 0 : ecosystemToken.currency) || "ETH",
                name: metadata.name,
                icon: metadata.icon,
            };
        }));
        const uniqueChains = supportedChains.reduce((acc, current) => {
            const exists = acc.find((item) => item.chain === current.chain && item.network === current.network);
            if (!exists) {
                acc.push(current);
            }
            return acc;
        }, []);
        return {
            data: uniqueChains,
        };
    }
    catch (error) {
        console_1.logger.error("NFT_CHAINS", "Error fetching supported chains", error);
        throw error;
    }
};
