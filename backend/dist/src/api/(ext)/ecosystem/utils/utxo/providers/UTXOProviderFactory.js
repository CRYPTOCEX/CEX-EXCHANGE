"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UTXOProviderFactory = void 0;
exports.getUTXOProvider = getUTXOProvider;
const MempoolProvider_1 = require("./MempoolProvider");
const BlockCypherProvider_1 = require("./BlockCypherProvider");
const BitcoinNodeProvider_1 = require("./BitcoinNodeProvider");
const error_1 = require("@b/utils/error");
class UTXOProviderFactory {
    static async getProvider(chain) {
        const cacheKey = chain;
        if (this.instances.has(cacheKey)) {
            return this.instances.get(cacheKey);
        }
        const providerType = this.getProviderType(chain);
        const provider = await this.createProvider(chain, providerType);
        this.instances.set(cacheKey, provider);
        return provider;
    }
    static getProviderType(chain) {
        var _a;
        const envVar = `${chain}_NODE`;
        const providerEnv = (_a = process.env[envVar]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (providerEnv === 'mempool' || providerEnv === 'blockcypher' || providerEnv === 'node') {
            return providerEnv;
        }
        const defaults = {
            'BTC': 'mempool',
            'LTC': 'mempool',
            'DOGE': 'blockcypher',
            'DASH': 'blockcypher',
        };
        return defaults[chain] || 'blockcypher';
    }
    static async createProvider(chain, type) {
        console.log(`[UTXO_PROVIDER] Creating ${type} provider for ${chain}`);
        switch (type) {
            case 'mempool':
                if (!['BTC', 'LTC'].includes(chain)) {
                    console.warn(`[UTXO_PROVIDER] Mempool doesn't support ${chain}, falling back to BlockCypher`);
                    return new BlockCypherProvider_1.BlockCypherProvider(chain);
                }
                return new MempoolProvider_1.MempoolProvider(chain);
            case 'blockcypher':
                return new BlockCypherProvider_1.BlockCypherProvider(chain);
            case 'node':
                if (chain !== 'BTC') {
                    console.warn(`[UTXO_PROVIDER] Bitcoin Node only supports BTC, falling back to BlockCypher for ${chain}`);
                    return new BlockCypherProvider_1.BlockCypherProvider(chain);
                }
                const nodeProvider = new BitcoinNodeProvider_1.BitcoinNodeProvider(chain);
                await nodeProvider.initialize();
                const isAvailable = await nodeProvider.isAvailable();
                if (!isAvailable) {
                    console.warn('[UTXO_PROVIDER] Bitcoin Node is not available or not synced, falling back to Mempool');
                    return new MempoolProvider_1.MempoolProvider(chain);
                }
                return nodeProvider;
            default:
                throw (0, error_1.createError)({ statusCode: 400, message: `Unknown provider type: ${type}` });
        }
    }
    static clearCache(chain) {
        if (chain) {
            this.instances.delete(chain);
        }
        else {
            this.instances.clear();
        }
    }
    static async getAvailableProviders(chain) {
        const providers = ['mempool', 'blockcypher', 'node'];
        const results = [];
        for (const type of providers) {
            try {
                const provider = await this.createProvider(chain, type);
                const available = await provider.isAvailable();
                results.push({
                    type: type,
                    available: available,
                    name: provider.getName(),
                });
            }
            catch (error) {
                results.push({
                    type: type,
                    available: false,
                    name: `${type} (${chain})`,
                });
            }
        }
        return results;
    }
}
exports.UTXOProviderFactory = UTXOProviderFactory;
UTXOProviderFactory.instances = new Map();
async function getUTXOProvider(chain) {
    return UTXOProviderFactory.getProvider(chain);
}
