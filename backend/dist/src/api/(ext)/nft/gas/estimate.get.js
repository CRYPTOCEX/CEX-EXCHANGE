"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
let getProvider;
try {
    const module = require("../../ecosystem/utils/provider");
    getProvider = module.getProvider;
}
catch (e) {
}
const ethers_1 = require("ethers");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const redis_1 = require("@b/utils/redis");
const redis = redis_1.RedisSingleton.getInstance();
const GAS_LIMITS = {
    transfer: 21000,
    mint: 150000,
    purchase: 200000,
    bid: 100000,
    approval: 50000
};
exports.metadata = {
    summary: "Get gas price estimates",
    description: "Returns current gas price estimates for NFT transactions on specified chain",
    operationId: "getNftGasEstimate",
    tags: ["NFT", "Gas"],
    logModule: "NFT",
    logTitle: "Estimate Gas",
    requiresAuth: false,
    parameters: [
        {
            name: "chain",
            in: "query",
            description: "Blockchain chain",
            required: false,
            schema: {
                type: "string",
                enum: ["ETH", "BSC", "POLYGON"],
                default: "ETH"
            }
        },
        {
            name: "type",
            in: "query",
            description: "Transaction type",
            required: false,
            schema: {
                type: "string",
                enum: ["transfer", "mint", "purchase", "bid", "approval"],
                default: "transfer"
            }
        }
    ],
    responses: {
        200: {
            description: "Gas estimate retrieved successfully",
        },
        500: { description: "Internal server error" },
    },
};
async function handler(data) {
    try {
        const { query, ctx } = data;
        const { chain = "ETH", type = "transfer" } = query || {};
        const cacheKey = `gas:estimate:${chain}:${type}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Estimate Gas completed successfully");
            return {
                success: true,
                data: JSON.parse(cached)
            };
        }
        if (!getProvider) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
        }
        const provider = await getProvider(chain);
        const [block, feeData, ethPrice] = await Promise.all([
            provider.getBlock("latest"),
            provider.getFeeData(),
            getEthPrice()
        ]);
        const baseFeePerGas = (block === null || block === void 0 ? void 0 : block.baseFeePerGas) || ethers_1.ethers.parseUnits("20", "gwei");
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers_1.ethers.parseUnits("2", "gwei");
        const gasLimit = GAS_LIMITS[type] || 100000;
        const slowPriorityFee = ethers_1.ethers.parseUnits("1", "gwei");
        const slowGasPrice = baseFeePerGas + slowPriorityFee;
        const standardGasPrice = baseFeePerGas + maxPriorityFeePerGas;
        const fastPriorityFee = maxPriorityFeePerGas * BigInt(2);
        const fastGasPrice = baseFeePerGas + fastPriorityFee;
        const calculateUSD = (gasPrice) => {
            const ethCost = Number(ethers_1.ethers.formatEther(gasPrice * BigInt(gasLimit)));
            return ethCost * ethPrice;
        };
        const result = {
            slow: {
                gwei: Number(ethers_1.ethers.formatUnits(slowGasPrice, "gwei")),
                time: "~30 minutes",
                usd: calculateUSD(slowGasPrice)
            },
            standard: {
                gwei: Number(ethers_1.ethers.formatUnits(standardGasPrice, "gwei")),
                time: "~3 minutes",
                usd: calculateUSD(standardGasPrice)
            },
            fast: {
                gwei: Number(ethers_1.ethers.formatUnits(fastGasPrice, "gwei")),
                time: "~30 seconds",
                usd: calculateUSD(fastGasPrice)
            },
            baseFee: Number(ethers_1.ethers.formatUnits(baseFeePerGas, "gwei")),
            priorityFee: {
                slow: Number(ethers_1.ethers.formatUnits(slowPriorityFee, "gwei")),
                standard: Number(ethers_1.ethers.formatUnits(maxPriorityFeePerGas, "gwei")),
                fast: Number(ethers_1.ethers.formatUnits(fastPriorityFee, "gwei"))
            },
            gasLimit,
            network: chain
        };
        await redis.set(cacheKey, JSON.stringify(result), "EX", 30);
        return {
            success: true,
            data: result
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to get gas estimate", error);
        return {
            success: false,
            error: "Failed to get gas estimate"
        };
    }
}
async function getEthPrice() {
    try {
        const cached = await redis.get("eth:price:usd");
        if (cached) {
            return Number(cached);
        }
        const price = 2000;
        await redis.set("eth:price:usd", price, "EX", 300);
        return price;
    }
    catch (error) {
        return 2000;
    }
}
async function getHistoricalGasData(chain) {
    const key = `gas:history:${chain}`;
    const history = await redis.get(key);
    return history ? JSON.parse(history) : [];
}
