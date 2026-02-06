"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainProviders = void 0;
exports.initializeHttpProvider = initializeHttpProvider;
exports.initializeWebSocketProvider = initializeWebSocketProvider;
const provider_1 = require("@b/api/(ext)/ecosystem/utils/provider");
const ethers_1 = require("ethers");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.chainProviders = new Map();
async function initializeHttpProvider(chain) {
    if (exports.chainProviders.has(chain)) {
        return exports.chainProviders.get(chain);
    }
    try {
        const httpProvider = await (0, provider_1.getProvider)(chain);
        if (await (0, provider_1.isProviderHealthy)(httpProvider)) {
            console_1.logger.success("ECO_PROVIDER", `Initialized HTTP provider for chain ${chain}`);
            exports.chainProviders.set(chain, httpProvider);
            return httpProvider;
        }
        throw (0, error_1.createError)({ statusCode: 503, message: `HTTP provider unhealthy for chain ${chain}` });
    }
    catch (error) {
        console_1.logger.error("ECO_PROVIDER", `Error initializing HTTP provider for chain ${chain}: ${error.message}`);
        return null;
    }
}
async function initializeWebSocketProvider(chain) {
    if (exports.chainProviders.has(chain)) {
        const existing = exports.chainProviders.get(chain);
        if (existing instanceof ethers_1.WebSocketProvider) {
            return existing;
        }
    }
    try {
        const wsProvider = await (0, provider_1.getWssProvider)(chain);
        if (!wsProvider) {
            console_1.logger.warn("ECO_PROVIDER", `WebSocket provider not available for chain ${chain}, will use HTTP fallback`);
            return null;
        }
        if (await (0, provider_1.isProviderHealthy)(wsProvider)) {
            console_1.logger.success("ECO_PROVIDER", `Initialized WebSocket provider for chain ${chain}`);
            exports.chainProviders.set(chain, wsProvider);
            return wsProvider;
        }
        console_1.logger.warn("ECO_PROVIDER", `WebSocket provider unhealthy for chain ${chain}, will use HTTP fallback`);
        return null;
    }
    catch (error) {
        console_1.logger.error("ECO_PROVIDER", `Error initializing WebSocket provider for chain ${chain}: ${error.message}`);
        return null;
    }
}
