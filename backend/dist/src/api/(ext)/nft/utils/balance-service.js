"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTBalanceService = void 0;
exports.getNFTBalanceService = getNFTBalanceService;
exports.checkUserBalance = checkUserBalance;
const ethers_1 = require("ethers");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
let getProvider;
let getAdjustedGasPrice;
let chainConfigs;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
    chainConfigs = providerModule.chainConfigs;
}
catch (e) {
}
try {
    const gasModule = require("../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
}
catch (e) {
}
class NFTBalanceService {
    constructor(chain) {
        this.chain = chain;
    }
    static async initialize(chain) {
        const service = new NFTBalanceService(chain);
        service.provider = await getProvider(chain);
        return service;
    }
    async getUserBalance(userAddress) {
        var _a;
        try {
            let balance = "0";
            if (!this.provider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized for ETH-based chain" });
            }
            const balanceWei = await this.provider.getBalance(userAddress);
            const decimals = ((_a = chainConfigs[this.chain]) === null || _a === void 0 ? void 0 : _a.decimals) || 18;
            balance = ethers_1.ethers.formatUnits(balanceWei.toString(), decimals);
            return balance;
        }
        catch (error) {
            console_1.logger.error("BALANCE_SERVICE", `Failed to get balance for ${this.chain}`, error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get balance for ${this.chain}: ${error.message}` });
        }
    }
    async estimateGasCost(operation, contractAddress, tokenId) {
        var _a;
        try {
            if (!this.provider) {
                throw (0, error_1.createError)({ statusCode: 503, message: "Provider not initialized" });
            }
            let gasPrice;
            if (getAdjustedGasPrice) {
                gasPrice = await getAdjustedGasPrice(this.provider);
            }
            else {
                const feeData = await this.provider.getFeeData();
                gasPrice = feeData.gasPrice || ethers_1.ethers.parseUnits("20", "gwei");
            }
            let gasLimit = BigInt(21000);
            switch (operation) {
                case "mint":
                    gasLimit = BigInt(300000);
                    break;
                case "bid":
                    gasLimit = BigInt(150000);
                    break;
                case "purchase":
                    gasLimit = BigInt(200000);
                    break;
                case "transfer":
                    gasLimit = BigInt(100000);
                    break;
                case "deploy_contract":
                    gasLimit = BigInt(3000000);
                    break;
                case "deploy_auction":
                    gasLimit = BigInt(2500000);
                    break;
                case "approve":
                    gasLimit = BigInt(80000);
                    break;
            }
            const gasCostWei = gasPrice * gasLimit;
            const decimals = ((_a = chainConfigs[this.chain]) === null || _a === void 0 ? void 0 : _a.decimals) || 18;
            return ethers_1.ethers.formatUnits(gasCostWei.toString(), decimals);
        }
        catch (error) {
            console_1.logger.error("BALANCE_SERVICE", "Failed to estimate gas cost", error);
            return "0.01";
        }
    }
    async calculateOperationCost(operation, baseAmount = "0", contractAddress, tokenId) {
        try {
            const gasEstimate = await this.estimateGasCost(operation, contractAddress, tokenId);
            const baseAmountBN = ethers_1.ethers.parseUnits(baseAmount, 18);
            const gasEstimateBN = ethers_1.ethers.parseUnits(gasEstimate, 18);
            const totalBN = baseAmountBN + gasEstimateBN;
            return {
                baseAmount,
                gasEstimate,
                total: ethers_1.ethers.formatEther(totalBN),
                operation
            };
        }
        catch (error) {
            console_1.logger.error("BALANCE_SERVICE", "Failed to calculate operation cost", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to calculate operation cost: ${error.message}` });
        }
    }
    async checkBalance(userAddress, operation, baseAmount = "0", contractAddress, tokenId) {
        var _a;
        try {
            const currentBalance = await this.getUserBalance(userAddress);
            const operationCost = await this.calculateOperationCost(operation, baseAmount, contractAddress, tokenId);
            const currentBalanceBN = ethers_1.ethers.parseUnits(currentBalance, 18);
            const requiredAmountBN = ethers_1.ethers.parseUnits(operationCost.total, 18);
            const hasBalance = currentBalanceBN >= requiredAmountBN;
            const shortfall = hasBalance ? "0" : ethers_1.ethers.formatEther(requiredAmountBN - currentBalanceBN);
            const currency = ((_a = chainConfigs[this.chain]) === null || _a === void 0 ? void 0 : _a.currency) || this.chain;
            return {
                hasBalance,
                currentBalance,
                requiredAmount: baseAmount,
                gasEstimate: operationCost.gasEstimate,
                totalRequired: operationCost.total,
                chain: this.chain,
                currency,
                shortfall: hasBalance ? undefined : shortfall
            };
        }
        catch (error) {
            console_1.logger.error("BALANCE_SERVICE", "Balance check failed", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Balance check failed: ${error.message}` });
        }
    }
    async checkBidBalance(userAddress, bidAmount, auctionContractAddress) {
        return this.checkBalance(userAddress, "bid", bidAmount, auctionContractAddress);
    }
    async checkPurchaseBalance(userAddress, purchaseAmount, nftContractAddress, tokenId) {
        return this.checkBalance(userAddress, "purchase", purchaseAmount, nftContractAddress, tokenId);
    }
    async checkMintBalance(userAddress, mintPrice = "0", contractAddress) {
        return this.checkBalance(userAddress, "mint", mintPrice, contractAddress);
    }
    async checkTransferBalance(userAddress, contractAddress, tokenId) {
        return this.checkBalance(userAddress, "transfer", "0", contractAddress, tokenId);
    }
    async checkApprovalBalance(userAddress, contractAddress, tokenId) {
        return this.checkBalance(userAddress, "approve", "0", contractAddress, tokenId);
    }
    async getBalanceInfo(userAddress) {
        var _a;
        try {
            const balance = await this.getUserBalance(userAddress);
            const currency = ((_a = chainConfigs[this.chain]) === null || _a === void 0 ? void 0 : _a.currency) || this.chain;
            return {
                balance,
                currency,
                chain: this.chain,
                formatted: `${parseFloat(balance).toFixed(6)} ${currency}`
            };
        }
        catch (error) {
            console_1.logger.error("BALANCE_SERVICE", "Failed to get balance info", error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get balance info: ${error.message}` });
        }
    }
}
exports.NFTBalanceService = NFTBalanceService;
async function getNFTBalanceService(chain) {
    return NFTBalanceService.initialize(chain);
}
async function checkUserBalance(userAddress, chain, operation, amount, contractAddress, tokenId) {
    const balanceService = await getNFTBalanceService(chain);
    return balanceService.checkBalance(userAddress, operation, amount, contractAddress, tokenId);
}
