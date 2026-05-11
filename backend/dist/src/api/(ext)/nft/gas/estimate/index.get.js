"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const ethers_1 = require("ethers");
const gas_helper_1 = require("../../utils/gas-helper");
let getProvider;
let getAdjustedGasPrice;
try {
    const providerModule = require("../../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
try {
    const gasModule = require("../../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
}
catch (e) {
}
exports.metadata = {
    summary: "Get current gas prices and standard NFT operation estimates",
    operationId: "getNftGasPrices",
    tags: ["NFT", "Gas", "Prices", "Blockchain"],
    parameters: [
        {
            name: "chain",
            in: "query",
            description: "Blockchain network",
            required: false,
            schema: { type: "string", default: "ETH" }
        }
    ],
    responses: {
        200: {
            description: "Current gas prices and estimates",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            chain: { type: "string" },
                            currentGasPrice: {
                                type: "object",
                                properties: {
                                    wei: { type: "string" },
                                    gwei: { type: "string" },
                                    eth: { type: "string" }
                                }
                            },
                            networkCongestion: { type: "string" },
                            standardOperations: {
                                type: "object",
                                properties: {
                                    mint: { type: "object" },
                                    transfer: { type: "object" },
                                    approve: { type: "object" },
                                    list: { type: "object" },
                                    buy: { type: "object" },
                                    bid: { type: "object" }
                                }
                            },
                            timestamp: { type: "string" }
                        }
                    }
                }
            }
        },
        400: { description: "Invalid chain parameter" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    const { query } = data;
    try {
        const chain = query.chain || 'ETH';
        const provider = await getProvider(chain);
        if (!provider) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unsupported blockchain: ${chain}`
            });
        }
        const gasPrice = await (0, gas_helper_1.getGasPrice)(provider);
        const gasPriceGwei = ethers_1.ethers.formatUnits(gasPrice, 'gwei');
        const gasPriceEth = ethers_1.ethers.formatEther(gasPrice);
        const congestion = await getNetworkCongestionLevel(provider);
        const standardGasLimits = {
            mint: BigInt(300000),
            transfer: BigInt(150000),
            approve: BigInt(80000),
            list: BigInt(200000),
            buy: BigInt(250000),
            bid: BigInt(200000),
            cancelListing: BigInt(100000),
            deployCollection: BigInt(5000000)
        };
        const standardOperations = {};
        for (const [operation, gasLimit] of Object.entries(standardGasLimits)) {
            const gasCostWei = gasPrice * gasLimit;
            const gasCostEth = ethers_1.ethers.formatEther(gasCostWei);
            const gasCostUsd = (parseFloat(gasCostEth) * 2000).toFixed(2);
            standardOperations[operation] = {
                gasLimit: gasLimit.toString(),
                gasCostWei: gasCostWei.toString(),
                gasCostEth: gasCostEth,
                gasCostUsd: gasCostUsd
            };
        }
        const response = {
            chain,
            currentGasPrice: {
                wei: gasPrice.toString(),
                gwei: gasPriceGwei,
                eth: gasPriceEth
            },
            networkCongestion: congestion,
            standardOperations,
            timestamp: new Date().toISOString(),
            disclaimer: "Gas estimates are approximate and may vary based on contract complexity and network conditions"
        };
        return response;
    }
    catch (error) {
        console_1.logger.error("NFT_GAS_PRICES", "Failed to retrieve gas prices", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve gas prices"
        });
    }
};
async function getNetworkCongestionLevel(provider) {
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || BigInt(0);
        const gasPriceGwei = Number(ethers_1.ethers.formatUnits(gasPrice, 'gwei'));
        if (gasPriceGwei < 20)
            return 'LOW';
        if (gasPriceGwei < 50)
            return 'MEDIUM';
        if (gasPriceGwei < 100)
            return 'HIGH';
        return 'VERY_HIGH';
    }
    catch (error) {
        return 'UNKNOWN';
    }
}
