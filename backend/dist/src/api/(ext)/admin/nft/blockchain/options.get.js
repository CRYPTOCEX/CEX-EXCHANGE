"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves enabled blockchain options for NFT",
    description: "This endpoint retrieves a list of enabled blockchain options specifically for NFT marketplace use. It checks the ecosystem blockchain status and only returns enabled blockchains.",
    operationId: "getNFTBlockchainOptions",
    tags: ["NFT", "Blockchain", "Options"],
    requiresAuth: true,
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Blockchain Options",
    responses: {
        200: {
            description: "NFT blockchain options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                value: { type: "string" },
                                label: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        const enabledChains = await db_1.models.ecosystemBlockchain.findAll({
            where: { status: true },
            attributes: ['chain'],
        });
        const blockchainMapping = {
            ETH: "Ethereum (ETH)",
            BSC: "Binance Smart Chain (BSC)",
            POLYGON: "Polygon (MATIC)",
            ARBITRUM: "Arbitrum (ARB)",
            OPTIMISM: "Optimism (OVM)",
            AVALANCHE: "Avalanche (AVAX)",
            FANTOM: "Fantom (FTM)",
            CELO: "Celo (CELO)",
            BASE: "Base (BASE)",
            RSK: "RSK (RSK)",
            SOL: "Solana (SOL)",
            MO: "Mo Chain (MO)",
        };
        const blockchainOptions = enabledChains
            .map((chain) => {
            const chainCode = chain.chain;
            if (!chainCode)
                return null;
            const displayName = blockchainMapping[chainCode];
            if (displayName) {
                return {
                    value: chainCode,
                    label: displayName,
                };
            }
            return null;
        })
            .filter((item) => item !== null)
            .sort((a, b) => a.label.localeCompare(b.label));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Blockchain Options retrieved successfully");
        return blockchainOptions;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching NFT blockchain options");
    }
};
