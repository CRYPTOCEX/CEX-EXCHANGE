"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFiatCurrencyPrices = fetchFiatCurrencyPrices;
exports.cacheExchangeCurrencies = cacheExchangeCurrencies;
exports.processCurrenciesPrices = processCurrenciesPrices;
exports.updateCurrencyPricesBulk = updateCurrencyPricesBulk;
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/currency/utils");
const index_get_1 = require("@b/api/exchange/currency/index.get");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const utils_2 = require("@b/api/exchange/utils");
const broadcast_1 = require("../broadcast");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
async function fetchFiatCurrencyPrices() {
    const cronName = "fetchFiatCurrencyPrices";
    const startTime = Date.now();
    (0, broadcast_1.broadcastStatus)(cronName, "running");
    (0, broadcast_1.broadcastLog)(cronName, "Starting fetch fiat currency prices");
    const baseCurrency = "USD";
    const provider = process.env.APP_FIAT_RATES_PROVIDER || "openexchangerates";
    (0, broadcast_1.broadcastLog)(cronName, `Using provider: ${provider}, baseCurrency: ${baseCurrency}`);
    try {
        switch (provider.toLowerCase()) {
            case "openexchangerates":
                (0, broadcast_1.broadcastLog)(cronName, "Fetching rates from OpenExchangeRates");
                await fetchOpenExchangeRates(baseCurrency);
                break;
            case "exchangerate-api":
                (0, broadcast_1.broadcastLog)(cronName, "Fetching rates from ExchangeRate API");
                await fetchExchangeRateApi(baseCurrency);
                break;
            default:
                throw (0, error_1.createError)({ statusCode: 500, message: `Unsupported fiat rates provider: ${provider}` });
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, "Fetch fiat currency prices completed", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "fetchFiatCurrencyPrices failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Fetch fiat currency prices failed: ${error.message}`, "error");
        console_1.logger.warn("CRON", "Fiat currency prices update failed, but continuing normal operations");
    }
}
async function fetchOpenExchangeRates(baseCurrency) {
    const cronName = "fetchOpenExchangeRates";
    (0, broadcast_1.broadcastLog)(cronName, `Starting OpenExchangeRates API call with baseCurrency: ${baseCurrency}`);
    const openExchangeRatesApiKey = process.env.APP_OPENEXCHANGERATES_APP_ID;
    const openExchangeRatesUrl = `https://openexchangerates.org/api/latest.json?app_id=${openExchangeRatesApiKey}&base=${baseCurrency}`;
    const frankfurterApiUrl = `https://api.frankfurter.app/latest?from=${baseCurrency}`;
    try {
        const data = await fetchWithTimeout(openExchangeRatesUrl, 30000);
        (0, broadcast_1.broadcastLog)(cronName, "Data fetched from OpenExchangeRates API");
        if (data && data.rates) {
            await updateRatesFromData(data.rates);
            (0, broadcast_1.broadcastLog)(cronName, "Rates updated from OpenExchangeRates data", "success");
        }
        else {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid data format received from OpenExchangeRates API" });
        }
    }
    catch (error) {
        console_1.logger.error("CRON", "fetchOpenExchangeRates - OpenExchangeRates failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `OpenExchangeRates API failed: ${error.message}`, "error");
        (0, broadcast_1.broadcastLog)(cronName, "Attempting fallback with Frankfurter API");
        try {
            const data = await fetchWithTimeout(frankfurterApiUrl, 30000);
            (0, broadcast_1.broadcastLog)(cronName, "Data fetched from Frankfurter API");
            if (data && data.rates) {
                await updateRatesFromData(data.rates);
                (0, broadcast_1.broadcastLog)(cronName, "Rates updated from Frankfurter API data", "success");
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: "Invalid data format received from Frankfurter API" });
            }
        }
        catch (fallbackError) {
            console_1.logger.error("CRON", "fetchOpenExchangeRates - Frankfurter failed", fallbackError);
            (0, broadcast_1.broadcastLog)(cronName, `Fallback Frankfurter API failed: ${fallbackError.message}`, "error");
            console_1.logger.warn("CRON", `Both fiat API calls failed: ${error.message}, ${fallbackError.message}`);
            return;
        }
    }
}
async function fetchExchangeRateApi(baseCurrency) {
    const cronName = "fetchExchangeRateApi";
    (0, broadcast_1.broadcastLog)(cronName, `Starting ExchangeRate API call with baseCurrency: ${baseCurrency}`);
    const exchangeRateApiKey = process.env.APP_EXCHANGERATE_API_KEY;
    if (!exchangeRateApiKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "APP_EXCHANGERATE_API_KEY is not configured in environment variables" });
    }
    const exchangeRateApiUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${baseCurrency}`;
    try {
        const data = await fetchWithTimeout(exchangeRateApiUrl, 30000);
        (0, broadcast_1.broadcastLog)(cronName, "Data fetched from ExchangeRate API");
        if (data && data.conversion_rates) {
            await updateRatesFromData(data.conversion_rates);
            (0, broadcast_1.broadcastLog)(cronName, "Rates updated from ExchangeRate API data", "success");
        }
        else {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid data format received from ExchangeRate API" });
        }
    }
    catch (error) {
        console_1.logger.error("CRON", "fetchExchangeRateApi failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `ExchangeRate API call failed: ${error.message}`, "error");
        console_1.logger.warn("CRON", `ExchangeRate API failed: ${error.message}`);
        return;
    }
}
async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            switch (response.status) {
                case 401:
                    throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized: Invalid API key." });
                case 403:
                    throw (0, error_1.createError)({ statusCode: 403, message: "Forbidden: Access denied." });
                case 429:
                    throw (0, error_1.createError)({ statusCode: 429, message: "Too Many Requests: Rate limit exceeded." });
                case 500:
                    throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: The API is currently unavailable." });
                default:
                    throw (0, error_1.createError)({ statusCode: 500, message: `Network response was not ok: ${response.statusText}` });
            }
        }
        const data = await response.json();
        return data;
    }
    finally {
        clearTimeout(id);
    }
}
async function updateRatesFromData(exchangeRates) {
    const cronName = "updateRatesFromData";
    (0, broadcast_1.broadcastLog)(cronName, "Starting update of currency rates from fetched data");
    const ratesToUpdate = {};
    const currenciesRaw = await redis.get("currencies");
    let currencies;
    if (!currenciesRaw) {
        (0, broadcast_1.broadcastLog)(cronName, "No currencies in Redis, fetching from database");
        try {
            const currenciesFromDb = await db_1.models.currency.findAll({
                where: { status: true },
                attributes: ["id", "code"]
            });
            if (!currenciesFromDb || currenciesFromDb.length === 0) {
                (0, broadcast_1.broadcastLog)(cronName, "No currencies found in database, skipping rate update", "warning");
                return;
            }
            currencies = currenciesFromDb.map((c) => ({
                id: c.code,
                code: c.code
            }));
            await redis.set("currencies", JSON.stringify(currencies), "EX", 86400);
            (0, broadcast_1.broadcastLog)(cronName, `Cached ${currencies.length} currencies from database`);
        }
        catch (dbError) {
            (0, broadcast_1.broadcastLog)(cronName, `Database fetch failed: ${dbError.message}`, "error");
            return;
        }
    }
    else {
        try {
            currencies = JSON.parse(currenciesRaw);
        }
        catch (parseError) {
            (0, broadcast_1.broadcastLog)(cronName, `Error parsing currencies data: ${parseError.message}`, "error");
            return;
        }
        if (!Array.isArray(currencies)) {
            (0, broadcast_1.broadcastLog)(cronName, "Currencies data is not an array", "error");
            return;
        }
    }
    for (const currency of currencies) {
        if (Object.prototype.hasOwnProperty.call(exchangeRates, currency.id)) {
            ratesToUpdate[currency.id] = exchangeRates[currency.id];
        }
    }
    (0, broadcast_1.broadcastLog)(cronName, `Updating rates for ${Object.keys(ratesToUpdate).length} currencies`);
    await (0, utils_1.updateCurrencyRates)(ratesToUpdate);
    (0, broadcast_1.broadcastLog)(cronName, "Currency rates updated in database", "success");
    await (0, utils_1.cacheCurrencies)();
    (0, broadcast_1.broadcastLog)(cronName, "Currencies cached successfully", "success");
}
async function cacheExchangeCurrencies() {
    const cronName = "cacheExchangeCurrencies";
    (0, broadcast_1.broadcastLog)(cronName, "Caching exchange currencies");
    const currencies = await (0, index_get_1.getCurrencies)();
    await redis.set("exchangeCurrencies", JSON.stringify(currencies), "EX", 1800);
    (0, broadcast_1.broadcastLog)(cronName, "Exchange currencies cached", "success");
}
async function processCurrenciesPrices() {
    const cronName = "processCurrenciesPrices";
    (0, broadcast_1.broadcastLog)(cronName, "Starting processCurrenciesPrices");
    let unblockTime = await (0, utils_2.loadBanStatus)();
    try {
        if (Date.now() < unblockTime) {
            const waitTime = unblockTime - Date.now();
            console_1.logger.info("CRON", `Waiting for ${(0, utils_2.formatWaitTime)(waitTime)} until unblock time`);
            (0, broadcast_1.broadcastLog)(cronName, `Currently banned; waiting for ${(0, utils_2.formatWaitTime)(waitTime)}`, "info");
            return;
        }
        const exchange = await exchange_1.default.startExchange();
        if (!exchange) {
            (0, broadcast_1.broadcastLog)(cronName, "Exchange instance not available; exiting", "error");
            return;
        }
        let marketsCache = [];
        let currenciesCache = [];
        try {
            marketsCache = await db_1.models.exchangeMarket.findAll({
                where: { status: true },
                attributes: ["currency", "pair"],
            });
            (0, broadcast_1.broadcastLog)(cronName, `Fetched ${marketsCache.length} active market records`);
        }
        catch (err) {
            console_1.logger.error("CRON", "processCurrenciesPrices - fetch markets failed", err);
            (0, broadcast_1.broadcastLog)(cronName, `Error fetching market records: ${err.message}`, "error");
            throw err;
        }
        try {
            currenciesCache = await db_1.models.exchangeCurrency.findAll({
                attributes: ["currency", "id", "price", "status"],
            });
            (0, broadcast_1.broadcastLog)(cronName, `Fetched ${currenciesCache.length} exchange currency records`);
        }
        catch (err) {
            console_1.logger.error("CRON", "processCurrenciesPrices - fetch currencies failed", err);
            (0, broadcast_1.broadcastLog)(cronName, `Error fetching currencies: ${err.message}`, "error");
            throw err;
        }
        const marketSymbols = marketsCache.map((market) => `${market.currency}/${market.pair}`);
        if (!marketSymbols.length) {
            const error = new Error("No market symbols found");
            console_1.logger.error("CRON", "processCurrenciesPrices - market symbols", error);
            (0, broadcast_1.broadcastLog)(cronName, error.message, "error");
            throw error;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Market symbols: ${marketSymbols.join(", ")}`);
        let markets = {};
        try {
            if (exchange.has["fetchLastPrices"]) {
                markets = await exchange.fetchLastPrices(marketSymbols);
            }
            else {
                markets = await exchange.fetchTickers(marketSymbols);
            }
            (0, broadcast_1.broadcastLog)(cronName, "Fetched market data from exchange");
        }
        catch (error) {
            const result = await (0, utils_2.handleExchangeError)(error, exchange_1.default);
            if (typeof result === "number") {
                unblockTime = result;
                await (0, utils_2.saveBanStatus)(unblockTime);
                console_1.logger.warn("CRON", `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`);
                (0, broadcast_1.broadcastLog)(cronName, `Ban detected. Blocked until ${new Date(unblockTime).toLocaleString()}`, "error");
                return;
            }
            console_1.logger.error("CRON", "processCurrenciesPrices - fetch markets data failed", error);
            (0, broadcast_1.broadcastLog)(cronName, `Error fetching market data: ${error.message}`, "error");
            throw error;
        }
        const usdtPairs = Object.keys(markets).filter((symbol) => symbol.endsWith("/USDT"));
        (0, broadcast_1.broadcastLog)(cronName, `Found ${usdtPairs.length} USDT pairs in market data`);
        const bulkUpdateData = usdtPairs
            .map((symbol) => {
            const currency = symbol.split("/")[0];
            const market = markets[symbol];
            let price;
            if (exchange.has["fetchLastPrices"]) {
                price = market.price;
            }
            else {
                price = market.last;
            }
            if (!price || isNaN(parseFloat(String(price)))) {
                console_1.logger.warn("CRON", `Invalid or missing price for symbol: ${symbol}, market data: ${JSON.stringify(market)}`);
                (0, broadcast_1.broadcastLog)(cronName, `Invalid or missing price for symbol: ${symbol}`, "warning");
                return null;
            }
            const matchingCurrency = currenciesCache.find((dbCurrency) => dbCurrency.currency === currency);
            if (matchingCurrency) {
                matchingCurrency.price = parseFloat(String(price));
                return matchingCurrency;
            }
            return null;
        })
            .filter((item) => item !== null);
        const usdtCurrency = currenciesCache.find((dbCurrency) => dbCurrency.currency === "USDT");
        if (usdtCurrency) {
            usdtCurrency.price = 1;
            bulkUpdateData.push(usdtCurrency);
        }
        (0, broadcast_1.broadcastLog)(cronName, `Prepared bulk update data for ${bulkUpdateData.length} currencies`);
        try {
            await db_1.sequelize.transaction(async (transaction) => {
                for (const item of bulkUpdateData) {
                    await item.save({ transaction });
                }
            });
            (0, broadcast_1.broadcastLog)(cronName, "Bulk update of currency prices completed", "success");
        }
        catch (error) {
            console_1.logger.error("CRON", "processCurrenciesPrices - update database failed", error);
            (0, broadcast_1.broadcastLog)(cronName, `Error updating database: ${error.message}`, "error");
            throw error;
        }
    }
    catch (error) {
        console_1.logger.error("CRON", "processCurrenciesPrices failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `processCurrenciesPrices failed: ${error.message}`, "error");
        throw error;
    }
}
async function updateCurrencyPricesBulk(data) {
    const cronName = "updateCurrencyPricesBulk";
    (0, broadcast_1.broadcastLog)(cronName, `Starting bulk update for ${data.length} currency prices`);
    try {
        await db_1.sequelize.transaction(async (transaction) => {
            for (const item of data) {
                await db_1.models.exchangeCurrency.update({ price: item.price }, { where: { id: item.id }, transaction });
            }
        });
        (0, broadcast_1.broadcastLog)(cronName, "Bulk update of currency prices succeeded", "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "updateCurrencyPricesBulk failed", error);
        (0, broadcast_1.broadcastLog)(cronName, `Bulk update failed: ${error.message}`, "error");
        throw error;
    }
}
