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
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const index_get_1 = require("@b/api/exchange/currency/index.get");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const utils_2 = require("@b/api/exchange/utils");
const broadcast_1 = require("../broadcast");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const fiat_rates_1 = require("@b/utils/fiat-rates");
const redis = redis_1.RedisSingleton.getInstance();
async function fetchFiatCurrencyPrices() {
    var _a, _b;
    const cronName = "fetchFiatCurrencyPrices";
    const startTime = Date.now();
    (0, broadcast_1.broadcastStatus)(cronName, "running");
    (0, broadcast_1.broadcastLog)(cronName, "Starting fetch fiat currency prices");
    const baseCurrency = "USD";
    const { enabled, skipped } = (0, fiat_rates_1.resolveFiatRateProviders)();
    for (const skip of skipped) {
        (0, broadcast_1.broadcastLog)(cronName, `Skipping provider ${skip.id}: ${skip.reason}`, "warning");
    }
    if (!enabled.length) {
        const error = (0, error_1.createError)({
            statusCode: 500,
            message: "No usable fiat rate providers. Set APP_FIAT_RATES_PROVIDERS to one or more of: " +
                fiat_rates_1.FIAT_RATE_PROVIDERS.map((p) => p.id).join(", "),
        });
        console_1.logger.error("CRON", "fetchFiatCurrencyPrices failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, error.message, "error");
        throw error;
    }
    (0, broadcast_1.broadcastLog)(cronName, `Querying ${enabled.length} provider(s) in priority order: ${enabled
        .map((p) => p.id)
        .join(" > ")} (base ${baseCurrency})`);
    try {
        const results = await Promise.all(enabled.map(async (provider) => {
            var _a, _b;
            try {
                const payload = await fetchWithTimeout(provider.buildUrl(baseCurrency), 30000);
                const raw = provider.extract(payload);
                if (!raw || typeof raw !== "object") {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: `Invalid data format received from ${provider.label}`,
                    });
                }
                const rates = {};
                let rejected = 0;
                for (const [code, value] of Object.entries(raw)) {
                    const rate = (0, fiat_rates_1.parseRate)(value);
                    if (rate === null) {
                        rejected++;
                        continue;
                    }
                    rates[code.toUpperCase()] = rate;
                }
                const freshness = (0, fiat_rates_1.describeFreshness)(provider, payload);
                const age = freshness.age ? `, published ${freshness.age} ago` : "";
                if (freshness.stale) {
                    console_1.logger.warn("CRON", `Fiat rate provider ${provider.id} answered with data published ${freshness.age} ago — past its ${provider.staleAfterHours}h refresh cadence. Its quotes are being merged as if current; move it down APP_FIAT_RATES_PROVIDERS if it stays behind.`);
                }
                (0, broadcast_1.broadcastLog)(cronName, `${provider.label}: ${Object.keys(rates).length} rates${rejected ? ` (${rejected} rejected as implausible)` : ""}${age}${freshness.stale ? " — STALE" : ""}`, freshness.stale ? "warning" : "success");
                return { provider, rates, freshness, error: null };
            }
            catch (error) {
                console_1.logger.warn("CRON", `Fiat rate provider ${provider.id} failed: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
                (0, broadcast_1.broadcastLog)(cronName, `${provider.label} failed: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, "error");
                return {
                    provider,
                    rates: null,
                    freshness: null,
                    error,
                };
            }
        }));
        const succeeded = results.filter((r) => r.rates && Object.keys(r.rates).length);
        if (!succeeded.length) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "All fiat rate providers failed — " +
                    results
                        .map((r) => { var _a; var _b; return `${r.provider.id}: ${(_b = (_a = r.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "no rates"}`; })
                        .join("; "),
            });
        }
        const { merged, sourceOf, disagreements, policyActions, strategy } = (0, fiat_rates_1.mergeProviderRates)(succeeded);
        const enabledCurrencies = await loadEnabledCurrencies();
        const pricedCodes = new Set(enabledCurrencies.map((c) => c.id));
        const priced = (code) => pricedCodes.has(code);
        for (const action of policyActions) {
            const dropped = action.dropped
                .map((d) => `${d.providerId}=${d.rate}`)
                .join(", ");
            const line = action.unpriced
                ? `${action.code} left unpriced — ${action.policy.note} Discarded: ${dropped}.`
                : `${action.code}: discarded ${dropped} as quoting a different unit — ${action.policy.note}`;
            if (priced(action.code))
                console_1.logger.warn("CRON", `Fiat rate policy: ${line}`);
            (0, broadcast_1.broadcastLog)(cronName, line, priced(action.code) ? "warning" : "info");
        }
        const ageOf = new Map();
        for (const r of succeeded) {
            if ((_a = r.freshness) === null || _a === void 0 ? void 0 : _a.age) {
                ageOf.set(r.provider.id, `${r.freshness.age} old${r.freshness.stale ? ", STALE" : ""}`);
            }
        }
        const routine = disagreements.filter((d) => d.lagExplained);
        if (routine.length) {
            (0, broadcast_1.broadcastLog)(cronName, `${routine.length} currencies differ across sources by no more than their publication times explain (${routine.map((d) => d.code).join(", ")}) — normal cadence drift, not reported individually`);
        }
        const substantiveAll = disagreements.filter((x) => !x.lagExplained);
        const unpricedDisagreements = substantiveAll.filter((d) => !priced(d.code));
        if (unpricedDisagreements.length) {
            (0, broadcast_1.broadcastLog)(cronName, `${unpricedDisagreements.length} currency(ies) disagree across sources but are not enabled on this install, so no price is written for them (${unpricedDisagreements
                .map((d) => d.code)
                .join(", ")}) — enable one and its disagreement is reported in full`);
        }
        for (const d of substantiveAll.filter((x) => priced(x.code))) {
            const detail = d.values
                .map((v) => {
                const age = ageOf.get(v.providerId);
                return `${v.providerId}=${v.rate}${age ? ` (${age})` : ""}`;
            })
                .join(", ");
            const outvoted = d.overrodePriority
                ? ` Consensus outvoted the higher-priority ${d.overrodePriority.providerId}=${d.overrodePriority.rate}, whose value is further from the others than the gap between their publication times explains.`
                : "";
            const hint = ((_b = d.policy) === null || _b === void 0 ? void 0 : _b.kind) === "multi-rate"
                ? ` This currency has several concurrent official/parallel rates and the sources track different ones — the spread is a property of the currency, not a broken feed. ${d.policy.note} Pin the window you mean by reordering APP_FIAT_RATES_PROVIDERS, or disable the currency.`
                : d.spread > 1
                    ? " A gap this size means the sources disagree about which UNIT the code names — codes reused after a redenomination do this. Declare the unit with APP_FIAT_RATES_UNITS=CODE=<units per USD>, or CODE=retired if it no longer trades."
                    : " Too large to be publication lag, so one source is genuinely off the market.";
            console_1.logger.warn("CRON", `Fiat rate disagreement for ${d.code}: ${(d.spread * 100).toFixed(1)}% spread across ${d.families} independent source families (${detail}). Using ${d.chosenProviderId}=${d.chosen}.${outvoted}${hint}`);
            (0, broadcast_1.broadcastLog)(cronName, `${d.code}: sources disagree by ${(d.spread * 100).toFixed(1)}% (${detail}) — using ${d.chosenProviderId}${d.overrodePriority ? ` (outvoted ${d.overrodePriority.providerId})` : ""}`, "warning");
        }
        const outvotedCount = disagreements.filter((d) => d.overrodePriority).length;
        const substantive = substantiveAll.filter((d) => priced(d.code)).length;
        const staleProviders = succeeded.filter((r) => { var _a; return (_a = r.freshness) === null || _a === void 0 ? void 0 : _a.stale; });
        (0, broadcast_1.broadcastLog)(cronName, `Merged ${Object.keys(merged).length} rates from ${succeeded.length}/${enabled.length} provider(s) using "${strategy}" strategy; ${substantive} enabled currencies with unexplained cross-source disagreement${unpricedDisagreements.length ? ` (plus ${unpricedDisagreements.length} on currencies this install does not price)` : ""}${routine.length ? ` (plus ${routine.length} explained by publication lag)` : ""}${outvotedCount ? `, ${outvotedCount} resolved against priority order by consensus` : ""}${staleProviders.length ? `; STALE feeds: ${staleProviders.map((r) => { var _a; return `${r.provider.id} (${(_a = r.freshness) === null || _a === void 0 ? void 0 : _a.age})`; }).join(", ")}` : ""}`, staleProviders.length ? "warning" : "info");
        await updateRatesFromData(merged, sourceOf, enabledCurrencies);
        const failed = results.filter((r) => r.error);
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Fetch fiat currency prices completed via ${succeeded.map((r) => r.provider.id).join(", ")}${failed.length ? ` (failed: ${failed.map((r) => r.provider.id).join(", ")})` : ""}`, failed.length ? "warning" : "success");
    }
    catch (error) {
        console_1.logger.error("CRON", "fetchFiatCurrencyPrices failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed");
        (0, broadcast_1.broadcastLog)(cronName, `Fetch fiat currency prices failed: ${error.message}`, "error");
        throw error;
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
async function loadEnabledCurrencies() {
    const cronName = "updateRatesFromData";
    const currenciesRaw = await redis.get("currencies");
    if (!currenciesRaw) {
        (0, broadcast_1.broadcastLog)(cronName, "No currencies in Redis, fetching from database");
        try {
            const currenciesFromDb = await db_1.models.currency.findAll({
                where: { status: true },
                attributes: ["id"]
            });
            if (!currenciesFromDb || currenciesFromDb.length === 0) {
                (0, broadcast_1.broadcastLog)(cronName, "No currencies found in database, skipping rate update", "warning");
                return [];
            }
            const currencies = currenciesFromDb.map((c) => ({
                id: c.id,
                code: c.id
            }));
            await redis.set("currencies", JSON.stringify(currencies), "EX", 300);
            (0, broadcast_1.broadcastLog)(cronName, `Cached ${currencies.length} currencies from database`);
            return currencies;
        }
        catch (dbError) {
            console_1.logger.error("CRON", "updateRatesFromData - currency lookup failed; NO rates were written", dbError);
            (0, broadcast_1.broadcastLog)(cronName, `Database fetch failed, no rates written: ${dbError.message}`, "error");
            throw dbError;
        }
    }
    try {
        const currencies = JSON.parse(currenciesRaw);
        if (!Array.isArray(currencies)) {
            (0, broadcast_1.broadcastLog)(cronName, "Currencies data is not an array", "error");
            return [];
        }
        return currencies;
    }
    catch (parseError) {
        (0, broadcast_1.broadcastLog)(cronName, `Error parsing currencies data: ${parseError.message}`, "error");
        return [];
    }
}
async function updateRatesFromData(exchangeRates, sourceOf = {}, currencies) {
    var _a, _b;
    const cronName = "updateRatesFromData";
    (0, broadcast_1.broadcastLog)(cronName, "Starting update of currency rates from fetched data");
    const ratesToUpdate = {};
    if (!currencies.length)
        return;
    const unpriced = [];
    for (const currency of currencies) {
        if (Object.prototype.hasOwnProperty.call(exchangeRates, currency.id)) {
            const rate = (0, fiat_rates_1.parseRate)(exchangeRates[currency.id]);
            if (rate === null) {
                unpriced.push(currency.id);
                continue;
            }
            ratesToUpdate[currency.id] = rate;
        }
        else {
            unpriced.push(currency.id);
        }
    }
    if (unpriced.length) {
        console_1.logger.warn("CRON", `No usable rate this run for ${unpriced.length} enabled currency(ies): ${unpriced.join(", ")}. They keep their previous price.`);
        (0, broadcast_1.broadcastLog)(cronName, `${unpriced.length} enabled currency(ies) had no usable rate: ${unpriced.join(", ")}`, "warning");
    }
    const bySource = new Map();
    for (const code of Object.keys(ratesToUpdate)) {
        const src = (_a = sourceOf[code]) !== null && _a !== void 0 ? _a : "unknown";
        bySource.set(src, ((_b = bySource.get(src)) !== null && _b !== void 0 ? _b : 0) + 1);
    }
    const attribution = [...bySource.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([src, count]) => `${src}:${count}`)
        .join(", ");
    (0, broadcast_1.broadcastLog)(cronName, `Updating rates for ${Object.keys(ratesToUpdate).length} currencies${attribution ? ` (by source — ${attribution})` : ""}`);
    if (!Object.keys(ratesToUpdate).length) {
        (0, broadcast_1.broadcastLog)(cronName, "No rates matched an enabled currency; nothing written", "warning");
        return;
    }
    await (0, utils_1.updateCurrencyRates)(ratesToUpdate);
    (0, broadcast_1.broadcastLog)(cronName, "Currency rates updated in database", "success");
    await (0, utils_1.cacheCurrencies)();
    (0, broadcast_1.broadcastLog)(cronName, "Currencies cached successfully", "success");
}
async function cacheExchangeCurrencies() {
    const cronName = "cacheExchangeCurrencies";
    (0, broadcast_1.broadcastLog)(cronName, "Caching exchange currencies");
    const currencies = await (0, index_get_1.getCurrencies)();
    await redis.set("exchangeCurrencies", JSON.stringify(currencies), "EX", 120);
    (0, broadcast_1.broadcastLog)(cronName, "Exchange currencies cached", "success");
}
let lastSkippedSymbolsSignature = "";
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
        const poisonedMarkets = marketsCache.filter((market) => String(market.currency).includes(":") ||
            String(market.pair).includes(":"));
        if (poisonedMarkets.length) {
            try {
                await db_1.models.exchangeMarket.update({ status: false }, {
                    where: {
                        [sequelize_1.Op.or]: poisonedMarkets.map((market) => ({
                            currency: market.currency,
                            pair: market.pair,
                        })),
                    },
                });
                const poisonedSymbols = poisonedMarkets.map((market) => `${market.currency}/${market.pair}`);
                console_1.logger.warn("CRON", `processCurrenciesPrices - disabled ${poisonedMarkets.length} non-spot market row(s): ${poisonedSymbols.join(", ")}`);
                (0, broadcast_1.broadcastLog)(cronName, `Disabled ${poisonedMarkets.length} non-spot market row(s): ${poisonedSymbols.join(", ")}`, "warning");
                marketsCache = marketsCache.filter((market) => !poisonedMarkets.includes(market));
            }
            catch (err) {
                console_1.logger.error("CRON", "processCurrenciesPrices - failed to disable non-spot market rows", err);
            }
        }
        const marketSymbols = marketsCache.map((market) => `${market.currency}/${market.pair}`);
        if (!marketSymbols.length) {
            console_1.logger.warn("CRON", "processCurrenciesPrices - no exchange market is enabled; skipping price update");
            (0, broadcast_1.broadcastLog)(cronName, "No exchange market is enabled; skipping price update", "warning");
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Pricing ${marketSymbols.length} market symbol(s)`);
        let markets = {};
        try {
            const { valid, skipped } = await (0, utils_2.filterSpotMarketSymbols)(exchange, marketSymbols);
            const skippedSignature = skipped.join(",");
            if (skipped.length && skippedSignature !== lastSkippedSymbolsSignature) {
                console_1.logger.warn("CRON", `processCurrenciesPrices - skipping ${skipped.length} symbol(s) not listed as spot on the active exchange: ${skipped.join(", ")}`);
                (0, broadcast_1.broadcastLog)(cronName, `Skipping ${skipped.length} symbol(s) not listed as spot on the active exchange: ${skipped.join(", ")}`, "warning");
            }
            lastSkippedSymbolsSignature = skippedSignature;
            if (!valid.length) {
                console_1.logger.warn("CRON", "processCurrenciesPrices - none of the active market symbols are listed as spot on the active exchange; skipping price update");
                (0, broadcast_1.broadcastLog)(cronName, "None of the active market symbols are listed as spot on the active exchange; skipping price update", "warning");
                return;
            }
            if (exchange.has["fetchLastPrices"]) {
                try {
                    markets = await exchange.fetchLastPrices(valid);
                }
                catch (_last) {
                    markets = {};
                }
            }
            if (!markets || !Object.keys(markets).length) {
                markets = await (0, utils_2.fetchTickersSafe)(exchange, valid);
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
        const STABLES = ["USDT", "USDC", "USD", "FDUSD", "DAI", "BUSD", "USDD", "USDE"];
        const usdtPairs = Object.keys(markets).filter((symbol) => STABLES.some((q) => symbol.endsWith("/" + q)));
        (0, broadcast_1.broadcastLog)(cronName, `Found ${usdtPairs.length} stable pairs in market data`);
        const currencyByCode = new Map();
        for (const dbCurrency of currenciesCache) {
            if (!currencyByCode.has(dbCurrency.currency)) {
                currencyByCode.set(dbCurrency.currency, dbCurrency);
            }
        }
        const priced = new Map();
        for (const code of currencyByCode.keys()) {
            if (STABLES.includes(code))
                continue;
            for (const q of STABLES) {
                const p = (0, utils_2.readTickerPrice)(markets[`${code}/${q}`]);
                if (p) {
                    priced.set(code, p);
                    break;
                }
            }
        }
        const bulkUpdateData = [];
        for (const [code, price] of priced.entries()) {
            const matchingCurrency = currencyByCode.get(code);
            if (!matchingCurrency)
                continue;
            if (parseFloat(String(matchingCurrency.price)) === price)
                continue;
            matchingCurrency.price = price;
            bulkUpdateData.push(matchingCurrency);
        }
        for (const stable of STABLES) {
            const row = currencyByCode.get(stable);
            if (row && parseFloat(String(row.price)) !== 1) {
                row.price = 1;
                bulkUpdateData.push(row);
            }
        }
        (0, broadcast_1.broadcastLog)(cronName, `Prepared bulk update data for ${bulkUpdateData.length} currencies with a changed price`);
        if (!bulkUpdateData.length) {
            (0, broadcast_1.broadcastLog)(cronName, "No currency price changed this tick; nothing written");
            return;
        }
        try {
            await db_1.sequelize.transaction(async (transaction) => {
                const CHUNK = 500;
                for (let i = 0; i < bulkUpdateData.length; i += CHUNK) {
                    const chunk = bulkUpdateData.slice(i, i + CHUNK);
                    const cases = chunk.map(() => "WHEN ? THEN ?").join(" ");
                    const placeholders = chunk.map(() => "?").join(", ");
                    const replacements = [];
                    for (const item of chunk) {
                        if (!Number.isFinite(item.price)) {
                            throw new Error(`processCurrenciesPrices: non-finite price ${String(item.price)} for currency ${item.currency} (${item.id})`);
                        }
                        replacements.push(item.id, item.price.toFixed(15));
                    }
                    for (const item of chunk) {
                        replacements.push(item.id);
                    }
                    await db_1.sequelize.query(`UPDATE exchange_currency SET price = CASE id ${cases} END WHERE id IN (${placeholders})`, { replacements, type: sequelize_1.QueryTypes.UPDATE, transaction });
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
