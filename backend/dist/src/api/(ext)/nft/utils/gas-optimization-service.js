"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GasOptimizationService = void 0;
exports.getGasOptimizationService = getGasOptimizationService;
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/currency/utils");
const error_1 = require("@b/utils/error");
let getProvider;
try {
    const module = require("../../ecosystem/utils/provider");
    getProvider = module.getProvider;
}
catch (e) {
}
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
class GasOptimizationService {
    constructor(provider, chain) {
        this.CACHE_TTL = 30;
        this.HISTORY_CACHE_TTL = 300;
        this.provider = provider;
        this.chain = chain;
        this.cache = redis_1.RedisSingleton.getInstance();
    }
    static async initialize(chain) {
        try {
            if (!getProvider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem extension not available" });
            }
            const provider = await getProvider(chain);
            if (!provider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
            }
            return new GasOptimizationService(provider, chain);
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to initialize gas optimization service", error);
            throw error;
        }
    }
    async calculateOptimizedGasLimit(txType) {
        try {
            let gasLimit = txType.baseGas;
            gasLimit = Math.floor(gasLimit * (1 + txType.complexity * 0.1));
            if (txType.isERC1155) {
                gasLimit = Math.floor(gasLimit * 1.2);
            }
            if (txType.isBatch) {
                gasLimit = Math.floor(gasLimit * 1.5);
            }
            if (txType.hasRoyalty) {
                gasLimit += 25000;
            }
            gasLimit += txType.dataSize * 4;
            const safetyBuffer = this.getNetworkSafetyBuffer();
            gasLimit = Math.floor(gasLimit * safetyBuffer);
            const maxGasLimit = await this.getMaxGasLimit();
            if (gasLimit > maxGasLimit) {
                gasLimit = maxGasLimit;
            }
            return BigInt(gasLimit);
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to calculate optimized gas limit", error);
            return BigInt(300000);
        }
    }
    async getOptimizedGasPrice(priority = "standard") {
        const cacheKey = `gas_price_${this.chain}_${priority}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return BigInt(cached);
        }
        try {
            const feeData = await this.provider.getFeeData();
            if (!feeData.gasPrice) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Unable to fetch gas price" });
            }
            let gasPrice = feeData.gasPrice;
            switch (priority) {
                case "slow":
                    gasPrice = gasPrice * BigInt(80) / BigInt(100);
                    break;
                case "fast":
                    gasPrice = gasPrice * BigInt(120) / BigInt(100);
                    break;
            }
            gasPrice = await this.applyNetworkOptimizations(gasPrice);
            await this.cache.set(cacheKey, gasPrice.toString(), "EX", this.CACHE_TTL);
            return gasPrice;
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to get optimized gas price", error);
            return this.getFallbackGasPrice();
        }
    }
    async getEIP1559GasParams(priority = "standard") {
        try {
            const block = await this.provider.getBlock("latest");
            if (!block || !block.baseFeePerGas) {
                throw (0, error_1.createError)({ statusCode: 503, message: "EIP-1559 not supported" });
            }
            const baseFee = block.baseFeePerGas;
            let priorityFee;
            switch (priority) {
                case "slow":
                    priorityFee = ethers_1.ethers.parseUnits("1", "gwei");
                    break;
                case "standard":
                    priorityFee = ethers_1.ethers.parseUnits("2", "gwei");
                    break;
                case "fast":
                    priorityFee = ethers_1.ethers.parseUnits("3", "gwei");
                    break;
            }
            const recentPriorityFees = await this.analyzeRecentPriorityFees();
            if (recentPriorityFees.length > 0) {
                const avgPriorityFee = recentPriorityFees.reduce((a, b) => a + b, BigInt(0)) / BigInt(recentPriorityFees.length);
                priorityFee = this.adjustPriorityFee(avgPriorityFee, priority);
            }
            const maxFeePerGas = baseFee * BigInt(2) + priorityFee;
            return {
                maxFeePerGas,
                maxPriorityFeePerGas: priorityFee
            };
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to get EIP-1559 gas params", error);
            const gasPrice = await this.getOptimizedGasPrice(priority);
            return {
                maxFeePerGas: gasPrice,
                maxPriorityFeePerGas: gasPrice / BigInt(10)
            };
        }
    }
    async estimateTransactionCost(txType, priority = "standard") {
        try {
            const gasLimit = await this.calculateOptimizedGasLimit(txType);
            const suggestions = [];
            let estimatedCost;
            let gasPrice;
            let maxFeePerGas;
            let maxPriorityFeePerGas;
            const supportsEIP1559 = await this.checkEIP1559Support();
            if (supportsEIP1559) {
                const eip1559Params = await this.getEIP1559GasParams(priority);
                maxFeePerGas = eip1559Params.maxFeePerGas;
                maxPriorityFeePerGas = eip1559Params.maxPriorityFeePerGas;
                gasPrice = maxFeePerGas;
                estimatedCost = ethers_1.ethers.formatEther(gasLimit * maxFeePerGas);
            }
            else {
                gasPrice = await this.getOptimizedGasPrice(priority);
                estimatedCost = ethers_1.ethers.formatEther(gasLimit * gasPrice);
            }
            const estimatedCostUSD = await this.getUSDValue(estimatedCost);
            if (priority === "fast") {
                suggestions.push("Consider using 'standard' priority to save on gas costs");
            }
            if (txType.isBatch && txType.dataSize > 10) {
                suggestions.push("Consider splitting batch operations to reduce gas limit");
            }
            const currentHour = new Date().getHours();
            if (this.isPeakHour(currentHour)) {
                suggestions.push(`Current time is peak hours. Consider waiting until off-peak (2-6 AM UTC) for lower gas prices`);
            }
            if (gasLimit > BigInt(500000)) {
                suggestions.push("Transaction requires high gas limit. Consider optimizing contract calls");
            }
            const historicalAnalysis = await this.analyzeHistoricalGasPrices();
            if (historicalAnalysis.currentlyHigh) {
                suggestions.push(`Gas prices are ${historicalAnalysis.percentAboveAverage}% above 24h average. Consider waiting`);
            }
            return {
                gasLimit,
                gasPrice,
                maxFeePerGas,
                maxPriorityFeePerGas,
                estimatedCost,
                estimatedCostUSD,
                optimizationSuggestions: suggestions
            };
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to estimate transaction cost", error);
            throw error;
        }
    }
    async analyzeRecentPriorityFees(blockCount = 10) {
        const cacheKey = `priority_fees_${this.chain}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            return parsedCache.map((f) => BigInt(f));
        }
        try {
            const latestBlock = await this.provider.getBlockNumber();
            const priorityFees = [];
            for (let i = 0; i < blockCount; i++) {
                const block = await this.provider.getBlock(latestBlock - i);
                if (block && block.baseFeePerGas) {
                    const txs = await Promise.all(block.transactions.slice(0, 5).map(hash => this.provider.getTransaction(hash)));
                    for (const tx of txs) {
                        if (tx && tx.maxPriorityFeePerGas) {
                            priorityFees.push(tx.maxPriorityFeePerGas);
                        }
                    }
                }
            }
            if (priorityFees.length > 0) {
                await this.cache.set(cacheKey, JSON.stringify(priorityFees.map(f => f.toString())), "EX", this.HISTORY_CACHE_TTL);
            }
            return priorityFees;
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to analyze recent priority fees", error);
            return [];
        }
    }
    async analyzeHistoricalGasPrices() {
        try {
            const history = await this.getGasPriceHistory(24);
            if (history.length === 0) {
                return { currentlyHigh: false, percentAboveAverage: 0 };
            }
            const currentPrice = await this.getOptimizedGasPrice("standard");
            const avgPrice = history.reduce((a, b) => a + b.gasPrice, BigInt(0)) / BigInt(history.length);
            const percentDiff = Number((currentPrice - avgPrice) * BigInt(100) / avgPrice);
            return {
                currentlyHigh: percentDiff > 20,
                percentAboveAverage: Math.abs(percentDiff),
                suggestedWaitTime: percentDiff > 50 ? 60 : percentDiff > 20 ? 30 : undefined
            };
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to analyze historical gas prices", error);
            return { currentlyHigh: false, percentAboveAverage: 0 };
        }
    }
    async getGasPriceHistory(hours) {
        var _a;
        const cacheKey = `gas_history_${this.chain}_${hours}h`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            return parsedCache.map((d) => ({
                timestamp: d.timestamp,
                gasPrice: BigInt(d.gasPrice),
                baseFee: d.baseFee ? BigInt(d.baseFee) : undefined,
                priorityFee: d.priorityFee ? BigInt(d.priorityFee) : undefined
            }));
        }
        try {
            const history = await ((_a = db_1.models.gasHistory) === null || _a === void 0 ? void 0 : _a.findAll({
                where: {
                    chain: this.chain,
                    timestamp: {
                        $gte: new Date(Date.now() - hours * 60 * 60 * 1000)
                    }
                },
                order: [["timestamp", "ASC"]]
            }));
            if (history && history.length > 0) {
                const data = history.map(h => ({
                    timestamp: h.timestamp.getTime(),
                    gasPrice: BigInt(h.gasPrice),
                    baseFee: h.baseFee ? BigInt(h.baseFee) : undefined,
                    priorityFee: h.priorityFee ? BigInt(h.priorityFee) : undefined
                }));
                await this.cache.set(cacheKey, JSON.stringify(data.map(d => {
                    var _a, _b;
                    return ({
                        timestamp: d.timestamp,
                        gasPrice: d.gasPrice.toString(),
                        baseFee: (_a = d.baseFee) === null || _a === void 0 ? void 0 : _a.toString(),
                        priorityFee: (_b = d.priorityFee) === null || _b === void 0 ? void 0 : _b.toString()
                    });
                })), "EX", this.HISTORY_CACHE_TTL);
                return data;
            }
            return [];
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to get gas price history", error);
            return [];
        }
    }
    isPeakHour(hour) {
        return hour >= 14 && hour <= 22;
    }
    getNetworkSafetyBuffer() {
        switch (this.chain.toUpperCase()) {
            case "ETH":
                return 1.1;
            case "BSC":
                return 1.05;
            case "POLYGON":
                return 1.15;
            case "ARBITRUM":
                return 1.2;
            case "OPTIMISM":
                return 1.2;
            default:
                return 1.15;
        }
    }
    async getMaxGasLimit() {
        try {
            const block = await this.provider.getBlock("latest");
            if (block && block.gasLimit) {
                return Number(block.gasLimit / BigInt(2));
            }
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to get max gas limit from block", error);
        }
        switch (this.chain.toUpperCase()) {
            case "ETH":
                return 10000000;
            case "BSC":
                return 30000000;
            case "POLYGON":
                return 30000000;
            case "ARBITRUM":
                return 50000000;
            case "OPTIMISM":
                return 30000000;
            default:
                return 10000000;
        }
    }
    async applyNetworkOptimizations(gasPrice) {
        switch (this.chain.toUpperCase()) {
            case "BSC":
                return gasPrice * BigInt(95) / BigInt(100);
            case "POLYGON":
                return gasPrice * BigInt(105) / BigInt(100);
            case "ARBITRUM":
            case "OPTIMISM":
                return await this.calculateL2GasPrice(gasPrice);
            default:
                return gasPrice;
        }
    }
    async calculateL2GasPrice(l1GasPrice) {
        try {
            return l1GasPrice / BigInt(10);
        }
        catch (error) {
            return l1GasPrice / BigInt(5);
        }
    }
    adjustPriorityFee(baseFee, priority) {
        switch (priority) {
            case "slow":
                return baseFee * BigInt(70) / BigInt(100);
            case "fast":
                return baseFee * BigInt(150) / BigInt(100);
            default:
                return baseFee;
        }
    }
    async checkEIP1559Support() {
        try {
            const block = await this.provider.getBlock("latest");
            return block !== null && block.baseFeePerGas !== null && block.baseFeePerGas !== undefined;
        }
        catch (_a) {
            return false;
        }
    }
    getFallbackGasPrice() {
        switch (this.chain.toUpperCase()) {
            case "ETH":
                return ethers_1.ethers.parseUnits("30", "gwei");
            case "BSC":
                return ethers_1.ethers.parseUnits("5", "gwei");
            case "POLYGON":
                return ethers_1.ethers.parseUnits("30", "gwei");
            case "ARBITRUM":
                return ethers_1.ethers.parseUnits("0.1", "gwei");
            case "OPTIMISM":
                return ethers_1.ethers.parseUnits("0.001", "gwei");
            default:
                return ethers_1.ethers.parseUnits("20", "gwei");
        }
    }
    async getUSDValue(nativeAmount) {
        try {
            let tokenSymbol;
            switch (this.chain.toUpperCase()) {
                case 'ETH':
                case 'ETHEREUM':
                    tokenSymbol = 'ETH';
                    break;
                case 'BSC':
                case 'BINANCE':
                    tokenSymbol = 'BNB';
                    break;
                case 'POLYGON':
                case 'MATIC':
                    tokenSymbol = 'MATIC';
                    break;
                case 'ARBITRUM':
                case 'OPTIMISM':
                    tokenSymbol = 'ETH';
                    break;
                default:
                    tokenSymbol = 'ETH';
            }
            const tokenPriceUsd = await (0, utils_1.getSpotPriceInUSD)(tokenSymbol);
            const usdValue = parseFloat(nativeAmount) * tokenPriceUsd;
            return usdValue;
        }
        catch (error) {
            return undefined;
        }
    }
    async storeGasPriceSnapshot() {
        var _a, _b, _c;
        try {
            const feeData = await this.provider.getFeeData();
            const block = await this.provider.getBlock("latest");
            const gasModel = db_1.models.gasHistory;
            if (gasModel) {
                await gasModel.create({
                    chain: this.chain,
                    timestamp: new Date(),
                    gasPrice: ((_a = feeData.gasPrice) === null || _a === void 0 ? void 0 : _a.toString()) || "0",
                    baseFee: (_b = block === null || block === void 0 ? void 0 : block.baseFeePerGas) === null || _b === void 0 ? void 0 : _b.toString(),
                    priorityFee: (_c = feeData.maxPriorityFeePerGas) === null || _c === void 0 ? void 0 : _c.toString(),
                });
            }
        }
        catch (error) {
            console_1.logger.error("GAS_OPTIMIZATION", "Failed to store gas price snapshot", error);
        }
    }
}
exports.GasOptimizationService = GasOptimizationService;
async function getGasOptimizationService(chain) {
    return GasOptimizationService.initialize(chain);
}
