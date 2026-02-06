"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWssProvider = exports.getProvider = exports.initializeProvider = exports.chainConfigs = void 0;
exports.isProviderHealthy = isProviderHealthy;
const ethers_1 = require("ethers");
const chains_1 = require("./chains");
Object.defineProperty(exports, "chainConfigs", { enumerable: true, get: function () { return chains_1.chainConfigs; } });
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const providerCache = new Map();
const initializeProvider = (chain) => {
    const provider = (0, exports.getProvider)(chain);
    if (!provider) {
        throw (0, error_1.createError)({ statusCode: 503, message: `Failed to initialize provider for chain ${chain}` });
    }
    return provider;
};
exports.initializeProvider = initializeProvider;
const getEnv = (key, defaultValue = "") => process.env[key] || defaultValue;
const getProvider = async (chainSymbol) => {
    try {
        const chainConfig = chains_1.chainConfigs[chainSymbol];
        if (!chainConfig)
            throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chainSymbol}` });
        const networkName = getEnv(`${chainSymbol}_NETWORK`);
        if (!networkName)
            throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${chainSymbol}_NETWORK is not set` });
        const rpcName = getEnv(`${chainSymbol}_${networkName.toUpperCase()}_RPC`);
        if (!rpcName)
            throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${rpcName} is not set` });
        const cacheKey = `${chainSymbol}_${networkName}`;
        if (providerCache.has(cacheKey)) {
            return providerCache.get(cacheKey);
        }
        const network = chainConfig.networks[networkName];
        if (!(network === null || network === void 0 ? void 0 : network.chainId)) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Chain ID not found for ${chainSymbol} on ${networkName}` });
        }
        const staticNetwork = ethers_1.Network.from({
            name: networkName,
            chainId: network.chainId,
        });
        const provider = new ethers_1.JsonRpcProvider(rpcName, staticNetwork, {
            staticNetwork: true,
            batchMaxCount: 1,
        });
        providerCache.set(cacheKey, provider);
        return provider;
    }
    catch (error) {
        console_1.logger.error("PROVIDER", "Failed to get provider", error);
        throw error;
    }
};
exports.getProvider = getProvider;
const getWssProvider = async (chainSymbol) => {
    try {
        const chainConfig = chains_1.chainConfigs[chainSymbol];
        if (!chainConfig) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported chain: ${chainSymbol}` });
        }
        const networkName = getEnv(`${chainSymbol}_NETWORK`);
        if (!networkName) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${chainSymbol}_NETWORK is not set` });
        }
        const rpcWssVar = `${chainSymbol}_${networkName.toUpperCase()}_RPC_WSS`;
        let rpcWssUrl = getEnv(rpcWssVar);
        if (!rpcWssUrl) {
            console_1.logger.warn("WSS_PROVIDER", `Environment variable ${rpcWssVar} is not set, skipping WebSocket provider`);
            return null;
        }
        rpcWssUrl = rpcWssUrl.replace(/\/+$/, '');
        if (!rpcWssUrl.startsWith('wss://') && !rpcWssUrl.startsWith('ws://')) {
            console_1.logger.error("WSS_PROVIDER", `Invalid WebSocket URL for ${chainSymbol}: ${rpcWssUrl}. Must start with wss:// or ws://`);
            return null;
        }
        const connectionTimeout = 10000;
        const createProvider = () => new Promise((resolve, reject) => {
            try {
                const wsProvider = new ethers_1.WebSocketProvider(rpcWssUrl);
                const wsErrorHandler = (error) => {
                    console_1.logger.error("WSS_PROVIDER", `WebSocket error for ${chainSymbol}: ${error.message}`);
                    reject(error);
                };
                const ws = wsProvider.websocket;
                if (ws && typeof ws.on === 'function') {
                    ws.on('error', wsErrorHandler);
                }
                wsProvider._waitUntilReady()
                    .then(() => {
                    if (ws && typeof ws.removeListener === 'function') {
                        ws.removeListener('error', wsErrorHandler);
                    }
                    resolve(wsProvider);
                })
                    .catch(reject);
            }
            catch (error) {
                reject(error);
            }
        });
        const wsProvider = await Promise.race([
            createProvider(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`WebSocket connection timeout for ${chainSymbol}`)), connectionTimeout))
        ]);
        return wsProvider;
    }
    catch (error) {
        console_1.logger.error("WSS_PROVIDER", `Failed to get WSS provider for ${chainSymbol}: ${error.message}`);
        return null;
    }
};
exports.getWssProvider = getWssProvider;
async function isProviderHealthy(provider) {
    try {
        const blockNumber = await provider.getBlockNumber();
        return blockNumber > 0;
    }
    catch (_a) {
        return false;
    }
}
