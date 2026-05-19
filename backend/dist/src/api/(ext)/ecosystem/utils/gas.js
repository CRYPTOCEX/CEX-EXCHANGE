"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateGas = estimateGas;
exports.getAdjustedGasPrice = getAdjustedGasPrice;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
async function estimateGas(transaction, provider, adjustmentFactor = 1.2) {
    try {
        const gasEstimate = await provider.estimateGas(transaction);
        const adjustedGasEstimate = (gasEstimate * BigInt(Math.round(adjustmentFactor * 10))) / BigInt(10);
        return adjustedGasEstimate;
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to estimate gas for transaction", error);
        if (error.data) {
            console_1.logger.error("GAS", "Revert reason", { reason: error.data.reason, data: error.data });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to estimate gas" });
    }
}
async function getAdjustedGasPrice(provider, adjustmentFactor = 1.2) {
    var _a;
    try {
        const feeData = await provider.getFeeData();
        const currentGasPrice = (_a = feeData.gasPrice) !== null && _a !== void 0 ? _a : BigInt(0);
        const adjustedGasPrice = (currentGasPrice * BigInt(Math.round(adjustmentFactor * 10))) /
            BigInt(10);
        return adjustedGasPrice;
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to adjust gas price", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to adjust gas price" });
    }
}
