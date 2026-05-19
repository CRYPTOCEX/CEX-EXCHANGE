"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT marketplace contract balance",
    operationId: "getNftMarketplaceBalance",
    tags: ["NFT", "Marketplace", "Balance", "Admin"],
    parameters: [
        {
            name: "chain",
            in: "query",
            required: false,
            description: "Blockchain chain (e.g., ETH, POLYGON, BSC). If not provided, returns all chains",
            schema: { type: "string", default: "ETH" },
        },
    ],
    responses: {
        200: {
            description: "Marketplace balance retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                oneOf: [
                                    {
                                        type: "object",
                                        properties: {
                                            chain: { type: "string" },
                                            contractAddress: { type: "string" },
                                            balance: { type: "string" },
                                            balanceUSD: { type: "number" },
                                            currency: { type: "string" },
                                            lastUpdated: { type: "string" },
                                            accumulatedFees: { type: "string" },
                                            pendingWithdrawals: { type: "string" }
                                        }
                                    },
                                    {
                                        type: "object",
                                        additionalProperties: {
                                            type: "object",
                                            properties: {
                                                chain: { type: "string" },
                                                contractAddress: { type: "string" },
                                                balance: { type: "string" },
                                                balanceUSD: { type: "number" },
                                                currency: { type: "string" },
                                                lastUpdated: { type: "string" },
                                                accumulatedFees: { type: "string" },
                                                pendingWithdrawals: { type: "string" },
                                                error: { type: "string" }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        404: { description: "Marketplace contract not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, query } = data;
    const { chain } = query;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const supportedChains = ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"];
        if (chain) {
            if (!supportedChains.includes(chain.toUpperCase())) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(", ")}`
                });
            }
            return await getMarketplaceBalance(chain.toUpperCase());
        }
        else {
            const results = {};
            for (const chainName of supportedChains) {
                try {
                    const balanceData = await getMarketplaceBalance(chainName);
                    results[chainName] = balanceData;
                }
                catch (error) {
                    results[chainName] = {
                        chain: chainName,
                        contractAddress: null,
                        balance: "0",
                        balanceUSD: 0,
                        currency: getCurrencySymbol(chainName),
                        lastUpdated: new Date().toISOString(),
                        accumulatedFees: "0",
                        pendingWithdrawals: "0",
                        error: error.message
                    };
                }
            }
            return Object.values(results);
        }
    }
    catch (error) {
        console_1.logger.error("NFT_MARKETPLACE", "Failed to get marketplace balance", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to get marketplace balance"
        });
    }
};
async function getMarketplaceBalance(chain) {
    var _a, _b, _c;
    const marketplace = await db_1.models.nftMarketplace.findOne({
        where: {
            chain: chain.toUpperCase(),
            status: "ACTIVE"
        },
        order: [["createdAt", "DESC"]]
    });
    if (!marketplace) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `No marketplace contract deployed for ${chain}`
        });
    }
    const contractAddress = marketplace.contractAddress;
    try {
        const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
        marketplaceService.setMarketplaceAddress(contractAddress);
        const balance = await marketplaceService.getContractBalance();
        const totalFeesResult = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.marketplaceFee')), 'totalFees']
            ],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: [],
                            required: true,
                            where: {
                                chain: chain.toUpperCase()
                            }
                        }
                    ]
                }
            ],
            where: {
                status: 'COMPLETED'
            },
            raw: true
        });
        const totalFees = parseFloat(String(((_a = totalFeesResult[0]) === null || _a === void 0 ? void 0 : _a.totalFees) || 0));
        const pendingWithdrawalsResult = await db_1.models.nftActivity.findAll({
            attributes: [
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalPending']
            ],
            where: {
                type: 'SALE',
                transactionHash: {
                    [sequelize_1.Op.ne]: null
                },
                createdAt: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            raw: true
        });
        const pendingWithdrawals = parseFloat(String(((_b = pendingWithdrawalsResult[0]) === null || _b === void 0 ? void 0 : _b.totalPending) || 0));
        const exchangeRates = {
            ETH: 2000,
            BNB: 300,
            MATIC: 0.8,
            AVAX: 25,
            FTM: 0.3
        };
        const currencySymbol = getCurrencySymbol(chain);
        const exchangeRate = exchangeRates[currencySymbol] || 1;
        const balanceUSD = parseFloat(balance) * exchangeRate;
        return {
            chain: chain.toUpperCase(),
            contractAddress,
            balance,
            balanceUSD,
            currency: currencySymbol,
            lastUpdated: new Date().toISOString(),
            accumulatedFees: totalFees.toString(),
            pendingWithdrawals: pendingWithdrawals.toString()
        };
    }
    catch (contractError) {
        console_1.logger.warn("NFT_MARKETPLACE", `Could not fetch live balance for ${chain}: ${contractError.message}`);
        const totalFeesResult = await db_1.models.nftSale.findAll({
            attributes: [
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.marketplaceFee')), 'totalFees']
            ],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: 'token',
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: 'collection',
                            attributes: [],
                            required: true,
                            where: {
                                chain: chain.toUpperCase()
                            }
                        }
                    ]
                }
            ],
            where: {
                status: 'COMPLETED'
            },
            raw: true
        });
        const totalFees = parseFloat(String(((_c = totalFeesResult[0]) === null || _c === void 0 ? void 0 : _c.totalFees) || 0));
        return {
            chain: chain.toUpperCase(),
            contractAddress,
            balance: "0",
            balanceUSD: 0,
            currency: getCurrencySymbol(chain),
            lastUpdated: new Date().toISOString(),
            accumulatedFees: totalFees.toString(),
            pendingWithdrawals: "0",
            note: "Live balance unavailable - contract interaction failed"
        };
    }
}
function getCurrencySymbol(chain) {
    const currencyMap = {
        ETH: "ETH",
        BSC: "BNB",
        POLYGON: "MATIC",
        ARBITRUM: "ETH",
        OPTIMISM: "ETH",
        AVALANCHE: "AVAX",
        FANTOM: "FTM"
    };
    return currencyMap[chain.toUpperCase()] || "ETH";
}
