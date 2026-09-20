"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrencyConditions = void 0;
exports.getConversionRates = getConversionRates;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const utils_1 = require("@b/api/finance/currency/utils");
const rate_math_1 = require("@b/api/finance/currency/rate-math");
async function getConversionRates(from, to) {
    const target = String(to !== null && to !== void 0 ? to : "").trim().toUpperCase();
    const rates = new Map();
    if (!target)
        return rates;
    const sources = from
        .map((c) => String(c !== null && c !== void 0 ? c : "").trim().toUpperCase())
        .filter((c) => c.length > 0);
    const usd = await (0, utils_1.getUsdRates)([...sources, target]);
    const targetUsd = usd.get(target);
    if (!targetUsd || !Number.isFinite(targetUsd) || targetUsd <= 0)
        return rates;
    for (const code of sources) {
        const sourceUsd = usd.get(code);
        if (!sourceUsd || !Number.isFinite(sourceUsd) || sourceUsd <= 0)
            continue;
        rates.set(code, (0, rate_math_1.crossMidRate)(sourceUsd, targetUsd));
    }
    return rates;
}
const getCurrencyConditions = async () => {
    const fiatCurrency = await db_1.models.currency.findAll({
        where: { status: true },
        attributes: ["id"],
    });
    const spotCurrency = await db_1.models.exchangeCurrency.findAll({
        where: { status: true },
        attributes: ["currency"],
    });
    let fundingCurrency = [];
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (extensions.has("ecosystem")) {
        const allFundingCurrencies = await db_1.models.ecosystemToken.findAll({
            where: { status: true },
            attributes: ["currency"],
        });
        const uniqueFundingCurrencies = Array.from(new Set(allFundingCurrencies
            .filter((c) => c.currency && c.currency.trim().length > 0)
            .map((c) => c.currency)));
        fundingCurrency = uniqueFundingCurrencies.map((currency) => ({
            value: currency,
            label: currency,
        }));
    }
    return {
        FIAT: fiatCurrency.map((c) => ({ value: c.id, label: c.id })),
        SPOT: spotCurrency.map((c) => ({ value: c.currency, label: c.currency })),
        ECO: fundingCurrency,
    };
};
exports.getCurrencyConditions = getCurrencyConditions;
