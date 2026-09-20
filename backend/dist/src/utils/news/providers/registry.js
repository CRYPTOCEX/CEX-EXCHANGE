"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsAdapter = newsAdapter;
exports.newsAdapterAvailable = newsAdapterAvailable;
exports.newsProviderReadiness = newsProviderReadiness;
exports.runNewsProvider = runNewsProvider;
exports.testNewsProvider = testNewsProvider;
const cryptocompare_1 = require("./cryptocompare");
const cryptopanic_1 = require("./cryptopanic");
const finnhub_1 = require("./finnhub");
const rss_1 = require("./rss");
const config_1 = require("./config");
const policy_1 = require("./policy");
const ADAPTERS = {
    finnhub: finnhub_1.finnhubAdapter,
    cryptocompare: cryptocompare_1.cryptocompareAdapter,
    cryptopanic: cryptopanic_1.cryptopanicAdapter,
    rss: rss_1.rssAdapter,
};
function newsAdapter(name) {
    return ADAPTERS[name];
}
function newsAdapterAvailable(name) {
    return name in ADAPTERS;
}
function newsProviderReadiness(name, config, storedKey) {
    return (0, policy_1.readinessFor)(name, config, newsAdapterAvailable(name), storedKey);
}
async function runNewsProvider(row) {
    var _a;
    const adapter = ADAPTERS[row.name];
    if (!adapter) {
        return {
            ok: false,
            error: {
                message: `No adapter is implemented for "${row.name}" in this release`,
                retryable: false,
            },
        };
    }
    try {
        return await adapter.fetch({
            categories: (0, policy_1.normaliseCategories)(row.name, row.categories),
            limit: (0, policy_1.normaliseFetchLimit)(row.fetchLimit),
            config: (_a = (0, config_1.readProviderConfig)(row.config)) !== null && _a !== void 0 ? _a : {},
            apiKey: (0, policy_1.resolveNewsCredential)(row.name, row.apiKey).apiKey,
        });
    }
    catch (error) {
        return {
            ok: false,
            error: {
                message: `The ${row.name} adapter threw: ${String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 300)}`,
                retryable: true,
            },
        };
    }
}
async function testNewsProvider(name, config, storedKey) {
    const adapter = ADAPTERS[name];
    if (!adapter) {
        return {
            valid: false,
            message: `No adapter is implemented for "${name}" in this release`,
        };
    }
    try {
        return await adapter.test(config !== null && config !== void 0 ? config : {}, (0, policy_1.resolveNewsCredential)(name, storedKey).apiKey);
    }
    catch (error) {
        return {
            valid: false,
            message: `The ${name} adapter threw: ${String((error === null || error === void 0 ? void 0 : error.message) || error).slice(0, 300)}`,
        };
    }
}
