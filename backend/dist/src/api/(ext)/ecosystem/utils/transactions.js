"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPublicEcosystemTransactions = exports.fetchGeneralEcosystemTransactions = exports.fetchEcosystemTransactions = void 0;
const date_fns_1 = require("date-fns");
const chains_1 = require("./chains");
const utxo_1 = require("./utxo");
const redis_1 = require("../../../../utils/redis");
const console_1 = require("@b/utils/console");
const safe_imports_1 = require("@b/utils/safe-imports");
const error_1 = require("@b/utils/error");
const providers_1 = require("./providers");
const CACHE_EXPIRATION = 30;
const fetchEcosystemTransactions = async (chain, address) => {
    const config = chains_1.chainConfigs[chain];
    if (!config) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chain}` });
    }
    try {
        if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
            return await (0, utxo_1.fetchUTXOTransactions)(chain, address);
        }
        else if (chain === "SOL") {
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            const solanaService = await SolanaService.getInstance();
            return await solanaService.fetchTransactions(address);
        }
        else if (chain === "TRON") {
            const TronService = await (0, safe_imports_1.getTronService)();
            const tronService = await TronService.getInstance();
            return await tronService.fetchTransactions(address);
        }
        else if (chain === "XMR") {
            const MoneroService = await (0, safe_imports_1.getMoneroService)();
            const moneroService = await MoneroService.getInstance();
            return await moneroService.fetchTransactions("master_wallet");
        }
        else if (chain === "TON") {
            const TonService = await (0, safe_imports_1.getTonService)();
            const tonService = await TonService.getInstance();
            return await tonService.fetchTransactions(address);
        }
        else {
            return await fetchAndParseTransactions(address, chain, config);
        }
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM_TRANSACTIONS", "Failed to fetch ecosystem transactions", error);
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
exports.fetchEcosystemTransactions = fetchEcosystemTransactions;
const fetchAndParseTransactions = async (address, chain, config) => {
    const cacheKey = `wallet:${address}:transactions:${chain.toLowerCase()}`;
    if (config.cache) {
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
            return cachedData;
        }
    }
    const rawTransactions = await config.fetchFunction(address, chain);
    const parsedTransactions = parseRawTransactions(rawTransactions);
    if (config.cache) {
        const cacheData = {
            transactions: parsedTransactions,
            timestamp: new Date().toISOString(),
        };
        const redis = redis_1.RedisSingleton.getInstance();
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(cacheData));
    }
    return parsedTransactions;
};
const getCachedData = async (cacheKey) => {
    const redis = redis_1.RedisSingleton.getInstance();
    let cachedData = await redis.get(cacheKey);
    if (cachedData && typeof cachedData === "string") {
        cachedData = JSON.parse(cachedData);
    }
    if (cachedData) {
        const now = new Date();
        const lastUpdated = new Date(cachedData.timestamp);
        if ((0, date_fns_1.differenceInMinutes)(now, lastUpdated) < CACHE_EXPIRATION) {
            return cachedData.transactions;
        }
    }
    return null;
};
const parseRawTransactions = (rawTransactions) => {
    if (!Array.isArray(rawTransactions === null || rawTransactions === void 0 ? void 0 : rawTransactions.result)) {
        console_1.logger.error("TRANSACTIONS", "Invalid raw transactions format received", {
            type: typeof rawTransactions,
            isArray: Array.isArray(rawTransactions),
            hasResult: rawTransactions === null || rawTransactions === void 0 ? void 0 : rawTransactions.hasOwnProperty('result'),
            resultType: typeof (rawTransactions === null || rawTransactions === void 0 ? void 0 : rawTransactions.result),
            keys: rawTransactions ? Object.keys(rawTransactions) : 'null',
            sample: JSON.stringify(rawTransactions).substring(0, 500)
        });
        throw (0, error_1.createError)({ statusCode: 500, message: `Invalid raw transactions format: expected {result: array}, got ${typeof rawTransactions}` });
    }
    return rawTransactions.result.map((rawTx) => {
        return {
            timestamp: rawTx.timeStamp,
            hash: rawTx.hash,
            from: rawTx.from,
            to: rawTx.to,
            amount: rawTx.value,
            method: rawTx.functionName,
            methodId: rawTx.methodId,
            contract: rawTx.contractAddress,
            confirmations: rawTx.confirmations,
            status: rawTx.txreceipt_status,
            isError: rawTx.isError,
            gas: rawTx.gas,
            gasPrice: rawTx.gasPrice,
            gasUsed: rawTx.gasUsed,
        };
    });
};
const fetchGeneralEcosystemTransactions = async (chain, address) => {
    const chainConfig = chains_1.chainConfigs[chain];
    if (!chainConfig) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chain}` });
    }
    const networkEnvVar = `${chain}_NETWORK`;
    const networkName = process.env[networkEnvVar];
    if (!networkName) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${networkEnvVar} is not set` });
    }
    const network = chainConfig.networks[networkName];
    if (!network) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Unsupported or misconfigured network: ${networkName} for chain: ${chain}` });
    }
    const apiKey = process.env[`${chain}_EXPLORER_API_KEY`] || process.env.ETHERSCAN_API_KEY;
    try {
        return await (0, providers_1.fetchWithProviders)({
            chain,
            address,
            apiKey,
            network: networkName,
            chainId: network.chainId,
            explorerUrl: network.explorer,
        });
    }
    catch (error) {
        console_1.logger.error("GENERAL_TRANSACTIONS", `All providers failed for ${chain}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: `Transaction fetch failed for ${chain}: ${error.message}` });
    }
};
exports.fetchGeneralEcosystemTransactions = fetchGeneralEcosystemTransactions;
const fetchPublicEcosystemTransactions = async (url) => {
    try {
        const response = await fetch(url);
        return await response.json();
    }
    catch (error) {
        console_1.logger.error("PUBLIC_TRANSACTIONS", "API call failed", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `API call failed: ${error.message}` });
    }
};
exports.fetchPublicEcosystemTransactions = fetchPublicEcosystemTransactions;
