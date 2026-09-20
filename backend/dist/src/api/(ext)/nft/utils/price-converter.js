"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToUSD = convertToUSD;
exports.getCryptoPrice = getCryptoPrice;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/currency/utils");
async function getFiatUsdPrice(code) {
    const currencyData = await db_1.models.currency.findOne({
        where: { id: code, status: true },
        attributes: ["price"],
    });
    if (!currencyData)
        return null;
    return (0, utils_1.fiatUsdPriceFromStored)(currencyData.price);
}
async function convertToUSD(amount, currency) {
    try {
        const normalizedCurrency = currency.toUpperCase();
        if (["USD", "USDC", "USDT", "DAI", "BUSD"].includes(normalizedCurrency)) {
            return amount;
        }
        const fiatPriceUSD = await getFiatUsdPrice(normalizedCurrency);
        if (fiatPriceUSD !== null) {
            return amount * fiatPriceUSD;
        }
        try {
            const ecosystemToken = await db_1.models.ecosystemToken.findOne({
                where: {
                    currency: normalizedCurrency,
                    status: true
                },
                attributes: ["price"]
            });
            if (ecosystemToken && ecosystemToken.price) {
                return amount * parseFloat(String(ecosystemToken.price));
            }
        }
        catch (error) {
            console_1.logger.warn("NFT", `Ecosystem token lookup failed for ${currency}`);
        }
        console_1.logger.warn("NFT", `Price not found for currency: ${currency}`);
        return null;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to convert to USD", error);
        return null;
    }
}
async function getCryptoPrice(currency) {
    try {
        const normalizedCurrency = currency.toUpperCase();
        if (["USDC", "USDT", "DAI", "BUSD"].includes(normalizedCurrency)) {
            return 1;
        }
        const fiatPriceUSD = await getFiatUsdPrice(normalizedCurrency);
        if (fiatPriceUSD !== null) {
            return fiatPriceUSD;
        }
        try {
            const ecosystemToken = await db_1.models.ecosystemToken.findOne({
                where: {
                    currency: normalizedCurrency,
                    status: true
                },
                attributes: ["price"]
            });
            if (ecosystemToken && ecosystemToken.price) {
                return parseFloat(String(ecosystemToken.price));
            }
        }
        catch (error) {
            console_1.logger.warn("NFT", `Ecosystem token lookup failed for ${currency}`);
        }
        return null;
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to get crypto price", error);
        return null;
    }
}
