"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTGasEstimationService = void 0;
exports.getNFTGasEstimationService = getNFTGasEstimationService;
const ethers_1 = require("ethers");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const gas_helper_1 = require("./gas-helper");
let getProvider;
let getAdjustedGasPrice;
let estimateGas;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
try {
    const gasModule = require("../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
    estimateGas = gasModule.estimateGas;
}
catch (e) {
}
class NFTGasEstimationService {
    constructor() {
        this.ETH_PRICE_USD = 2000;
    }
    static getInstance() {
        if (!NFTGasEstimationService.instance) {
            NFTGasEstimationService.instance = new NFTGasEstimationService();
        }
        return NFTGasEstimationService.instance;
    }
    async getGasEstimate(params) {
        const { operation, chain, contractAddress, tokenId, amount, recipientAddress, customGasLimit } = params;
        try {
            const provider = await getProvider(chain);
            if (!provider) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported blockchain: ${chain}` });
            }
            const gasPrice = await (0, gas_helper_1.getGasPrice)(provider);
            let gasLimit = customGasLimit || this.getStandardGasLimit(operation);
            if (contractAddress && this.shouldEstimateGas(operation)) {
                try {
                    const transactionRequest = this.buildTransactionRequest(operation, contractAddress, tokenId, amount, recipientAddress);
                    if (transactionRequest) {
                        gasLimit = await estimateGas(transactionRequest, provider, 1.2);
                    }
                }
                catch (error) {
                    console_1.logger.error("GAS_ESTIMATION", "Failed to estimate gas, using fallback", error);
                }
            }
            const gasCostWei = gasPrice * gasLimit;
            const gasCostEth = ethers_1.ethers.formatEther(gasCostWei);
            const gasCostUsd = (parseFloat(gasCostEth) * this.ETH_PRICE_USD).toFixed(2);
            const networkCongestion = await this.getNetworkCongestionLevel(provider);
            return {
                gasLimit,
                gasPrice,
                gasCostWei,
                gasCostEth,
                gasCostUsd,
                networkCongestion
            };
        }
        catch (error) {
            console_1.logger.error("GAS_ESTIMATION", `Failed to estimate gas for ${operation}`, error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to estimate gas for ${operation}: ${error.message}` });
        }
    }
    async getGasPrices(chain) {
        try {
            const provider = await getProvider(chain);
            if (!provider) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported blockchain: ${chain}` });
            }
            const gasPrice = await (0, gas_helper_1.getGasPrice)(provider);
            const gasPriceGwei = ethers_1.ethers.formatUnits(gasPrice, 'gwei');
            const gasPriceEth = ethers_1.ethers.formatEther(gasPrice);
            const networkCongestion = await this.getNetworkCongestionLevel(provider);
            return {
                wei: gasPrice.toString(),
                gwei: gasPriceGwei,
                eth: gasPriceEth,
                networkCongestion
            };
        }
        catch (error) {
            console_1.logger.error("GAS_ESTIMATION", `Failed to get gas prices for ${chain}`, error);
            throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get gas prices for ${chain}: ${error.message}` });
        }
    }
    canAffordOperation(userBalanceWei, gasEstimate, operationValueWei = "0", bufferPercent = 15) {
        try {
            const balanceWei = BigInt(userBalanceWei);
            const gasCostWei = gasEstimate.gasCostWei;
            const operationCostWei = BigInt(operationValueWei);
            const totalCostWei = gasCostWei + operationCostWei;
            const bufferedCostWei = totalCostWei + (totalCostWei * BigInt(bufferPercent)) / BigInt(100);
            const canAfford = balanceWei >= bufferedCostWei;
            const shortfall = canAfford ? undefined : ethers_1.ethers.formatEther(bufferedCostWei - balanceWei);
            return {
                canAfford,
                shortfall,
                details: {
                    userBalance: ethers_1.ethers.formatEther(balanceWei),
                    gasCost: gasEstimate.gasCostEth,
                    operationCost: ethers_1.ethers.formatEther(operationCostWei),
                    totalCost: ethers_1.ethers.formatEther(totalCostWei),
                    bufferedCost: ethers_1.ethers.formatEther(bufferedCostWei),
                    bufferPercent
                }
            };
        }
        catch (error) {
            return {
                canAfford: false,
                details: { error: error.message }
            };
        }
    }
    getStandardGasLimit(operation) {
        const gasLimits = {
            mint: BigInt(300000),
            transfer: BigInt(150000),
            approve: BigInt(80000),
            list: BigInt(200000),
            buy: BigInt(250000),
            cancelListing: BigInt(100000),
            bid: BigInt(200000),
            acceptBid: BigInt(300000),
            deployCollection: BigInt(5000000),
            deployAuction: BigInt(3000000),
            deployMarketplace: BigInt(4000000)
        };
        return gasLimits[operation] || BigInt(150000);
    }
    shouldEstimateGas(operation) {
        const skipEstimation = ['deployCollection', 'deployAuction', 'deployMarketplace'];
        return !skipEstimation.includes(operation);
    }
    buildTransactionRequest(operation, contractAddress, tokenId, amount, recipientAddress) {
        const baseRequest = {
            to: contractAddress,
            data: "0x",
        };
        if (amount && ['mint', 'buy', 'bid'].includes(operation)) {
            baseRequest.value = ethers_1.ethers.parseUnits(amount, 'wei');
        }
        return baseRequest;
    }
    async getNetworkCongestionLevel(provider) {
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
}
exports.NFTGasEstimationService = NFTGasEstimationService;
NFTGasEstimationService.instance = null;
function getNFTGasEstimationService() {
    return NFTGasEstimationService.getInstance();
}
