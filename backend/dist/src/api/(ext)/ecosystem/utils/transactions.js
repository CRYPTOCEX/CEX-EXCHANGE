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
    var _a;
    const chainConfig = chains_1.chainConfigs[chain];
    if (!chainConfig) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chain}` });
    }
    const networkEnvVar = `${chain}_NETWORK`;
    const networkName = process.env[networkEnvVar];
    if (!networkName) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${networkEnvVar} is not set` });
    }
    const hasExplorerApi = (_a = chainConfig.explorerApi) !== null && _a !== void 0 ? _a : true;
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env[`${chain}_EXPLORER_API_KEY`];
    if (hasExplorerApi && !apiKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ETHERSCAN_API_KEY or ${chain}_EXPLORER_API_KEY is not set` });
    }
    const network = chainConfig.networks[networkName];
    if (!network || !network.chainId) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Unsupported or misconfigured network: ${networkName} for chain: ${chain}. ChainId is required for V2 API.` });
    }
    const url = `https://api.etherscan.io/v2/api?chainid=${network.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${hasExplorerApi ? `&apikey=${apiKey}` : ""}`;
    try {
        console_1.logger.info("ETHERSCAN", `${chain} Fetching transactions for address ${address.substring(0, 10)}... using chainId ${network.chainId}`);
        const response = await fetch(url);
        if (!response.ok) {
            const statusText = response.statusText || 'Unknown error';
            const text = await response.text();
            throw (0, error_1.createError)({ statusCode: response.status, message: `HTTP ${response.status} ${statusText}: ${text.substring(0, 200)}` });
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            const text = await response.text();
            throw (0, error_1.createError)({ statusCode: 502, message: `Received HTML instead of JSON. API might be down or rate limited. Response: ${text.substring(0, 200)}` });
        }
        const data = await response.json();
        if (data.status === "0") {
            if (data.message === "NOTOK") {
                console_1.logger.warn("ETHERSCAN", `${chain} API error: ${data.result}`);
                return { status: "1", message: "OK", result: [] };
            }
        }
        if (!data.result || !Array.isArray(data.result)) {
            console_1.logger.warn("ETHERSCAN", `${chain} Unexpected response format, returning empty results`);
            return { status: "1", message: "OK", result: [] };
        }
        console_1.logger.info("ETHERSCAN", `${chain} Successfully fetched ${data.result.length} transactions`);
        return data;
    }
    catch (error) {
        console_1.logger.error("GENERAL_TRANSACTIONS", "API call failed", error);
        throw (0, error_1.createError)({ statusCode: 500, message: `API call failed: ${error.message}` });
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
