"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const chains_1 = require("@b/api/(ext)/ecosystem/utils/chains");
exports.metadata = {
    summary: "Get available blockchain options for master wallet creation",
    description: "Retrieves a list of supported blockchain chains that can be used to create new master wallets. Includes both static chains (ETH, BSC, POLYGON, etc.) and dynamically enabled chains from the ecosystem blockchain configuration.",
    operationId: "getEcosystemMasterWalletOptions",
    tags: ["Admin", "Ecosystem", "Wallet"],
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Get Master Wallet Options",
    responses: {
        200: {
            description: "Ecosystem master wallet options retrieved successfully",
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
        404: (0, query_1.notFoundMetadataResponse)("EcosystemBlockchain"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching existing master wallets");
        const existingMasterWallets = await db_1.models.ecosystemMasterWallet.findAll({
            attributes: ["chain"],
        });
        const existingChains = new Set(existingMasterWallets.map((w) => w.chain));
        const chains = ["SOL", "TRON", "XMR", "TON", "MO"];
        const blockchainStatuses = await db_1.models.ecosystemBlockchain.findAll({
            where: {
                chain: { [sequelize_1.Op.in]: chains },
            },
        });
        const allChainOptions = [
            { value: "ETH", label: "Ethereum" },
            { value: "BSC", label: "Binance Smart Chain" },
            { value: "POLYGON", label: "Polygon" },
            { value: "FTM", label: "Fantom" },
            { value: "OPTIMISM", label: "Optimism" },
            { value: "ARBITRUM", label: "Arbitrum" },
            { value: "BASE", label: "Syscoin" },
            { value: "CELO", label: "Celo" },
            { value: "BTC", label: "Bitcoin" },
            { value: "LTC", label: "Litecoin" },
            { value: "DOGE", label: "Dogecoin" },
            { value: "DASH", label: "Dash" },
        ];
        blockchainStatuses.forEach((blockchain) => {
            if (blockchain.status && blockchain.chain) {
                const chainConfig = chains_1.chainConfigs[blockchain.chain];
                const currency = (chainConfig === null || chainConfig === void 0 ? void 0 : chainConfig.currency) || blockchain.chain;
                allChainOptions.push({
                    value: blockchain.chain,
                    label: `${blockchain.chain} (${currency})`,
                });
            }
        });
        const availableChainOptions = allChainOptions.filter((option) => !existingChains.has(option.value));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved master wallet options");
        return availableChainOptions;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching ecosystem master wallet options");
    }
};
