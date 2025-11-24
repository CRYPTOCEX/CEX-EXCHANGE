/**
 * UTXO Provider Factory
 * Creates and manages UTXO providers based on environment configuration
 */

import { IUTXOProvider } from './IUTXOProvider';
import { MempoolProvider } from './MempoolProvider';
import { BlockCypherProvider } from './BlockCypherProvider';
import { BitcoinNodeProvider } from './BitcoinNodeProvider';

export type ProviderType = 'mempool' | 'blockcypher' | 'node';

export class UTXOProviderFactory {
  private static instances: Map<string, IUTXOProvider> = new Map();

  /**
   * Get provider for a specific chain
   * Provider selection order (if available):
   * 1. Environment variable (BTC_PROVIDER, LTC_PROVIDER, etc.)
   * 2. Default provider based on chain
   */
  static async getProvider(chain: string): Promise<IUTXOProvider> {
    const cacheKey = chain;

    // Return cached instance if available
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Get provider type from environment
    const providerType = this.getProviderType(chain);

    // Create provider instance
    const provider = await this.createProvider(chain, providerType);

    // Cache the instance
    this.instances.set(cacheKey, provider);

    return provider;
  }

  /**
   * Get provider type from environment variables
   */
  private static getProviderType(chain: string): ProviderType {
    const envVar = `${chain}_NODE`;
    const providerEnv = process.env[envVar]?.toLowerCase();

    if (providerEnv === 'mempool' || providerEnv === 'blockcypher' || providerEnv === 'node') {
      return providerEnv as ProviderType;
    }

    // Default providers by chain
    const defaults: Record<string, ProviderType> = {
      'BTC': 'mempool',
      'LTC': 'mempool',
      'DOGE': 'blockcypher',
      'DASH': 'blockcypher',
    };

    return defaults[chain] || 'blockcypher';
  }

  /**
   * Create a provider instance
   */
  private static async createProvider(chain: string, type: ProviderType): Promise<IUTXOProvider> {
    console.log(`[UTXO_PROVIDER] Creating ${type} provider for ${chain}`);

    switch (type) {
      case 'mempool':
        // Check if Mempool supports this chain
        if (!['BTC', 'LTC'].includes(chain)) {
          console.warn(`[UTXO_PROVIDER] Mempool doesn't support ${chain}, falling back to BlockCypher`);
          return new BlockCypherProvider(chain);
        }
        return new MempoolProvider(chain);

      case 'blockcypher':
        return new BlockCypherProvider(chain);

      case 'node':
        // Only BTC is supported by Bitcoin Core node
        if (chain !== 'BTC') {
          console.warn(`[UTXO_PROVIDER] Bitcoin Node only supports BTC, falling back to BlockCypher for ${chain}`);
          return new BlockCypherProvider(chain);
        }

        const nodeProvider = new BitcoinNodeProvider(chain);
        await nodeProvider.initialize();

        // Check if node is available
        const isAvailable = await nodeProvider.isAvailable();
        if (!isAvailable) {
          console.warn('[UTXO_PROVIDER] Bitcoin Node is not available or not synced, falling back to Mempool');
          return new MempoolProvider(chain);
        }

        return nodeProvider;

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Clear cached providers (useful for testing or switching providers)
   */
  static clearCache(chain?: string): void {
    if (chain) {
      this.instances.delete(chain);
    } else {
      this.instances.clear();
    }
  }

  /**
   * Get all available providers for a chain
   */
  static async getAvailableProviders(chain: string): Promise<{ type: ProviderType; available: boolean; name: string }[]> {
    const providers: ProviderType[] = ['mempool', 'blockcypher', 'node'];
    const results: { type: ProviderType; available: boolean; name: string }[] = [];

    for (const type of providers) {
      try {
        const provider = await this.createProvider(chain, type);
        const available = await provider.isAvailable();

        results.push({
          type: type,
          available: available,
          name: provider.getName(),
        });
      } catch (error) {
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

// Export helper functions for backward compatibility
export async function getUTXOProvider(chain: string): Promise<IUTXOProvider> {
  return UTXOProviderFactory.getProvider(chain);
}