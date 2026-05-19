"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGasPrice = getGasPrice;
const ethers_1 = require("ethers");
const console_1 = require("@b/utils/console");
let getAdjustedGasPrice = null;
try {
    const gasModule = require("../../ecosystem/utils/gas");
    getAdjustedGasPrice = gasModule.getAdjustedGasPrice;
}
catch (e) {
    getAdjustedGasPrice = null;
}
const DEFAULT_GAS_PRICE = ethers_1.ethers.parseUnits("20", "gwei");
async function getGasPrice(provider) {
    try {
        const hasAdjustedGasPrice = getAdjustedGasPrice !== null;
        if (hasAdjustedGasPrice) {
            const result = await getAdjustedGasPrice(provider);
            return result;
        }
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        if (gasPrice !== null) {
            return gasPrice;
        }
        return DEFAULT_GAS_PRICE;
    }
    catch (error) {
        console_1.logger.error("GAS_HELPER", "Failed to get gas price", error);
        return DEFAULT_GAS_PRICE;
    }
}
