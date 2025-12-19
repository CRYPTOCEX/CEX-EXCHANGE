import { JsonRpcProvider, WebSocketProvider, Network } from "ethers";
import { chainConfigs } from "./chains";
import { logger } from "@b/utils/console";

// Export chainConfigs for use in other modules
export { chainConfigs };

// Cache providers to avoid recreating them
const providerCache: Map<string, JsonRpcProvider> = new Map();

// Initialize Ethereum provider
export const initializeProvider = (chain) => {
  const provider = getProvider(chain);
  if (!provider) {
    throw new Error(`Failed to initialize provider for chain ${chain}`);
  }
  return provider;
};

const getEnv = (key: string, defaultValue = "") =>
  process.env[key] || defaultValue;

export const getProvider = async (
  chainSymbol: string
): Promise<JsonRpcProvider> => {
  try {
    const chainConfig = chainConfigs[chainSymbol];
    if (!chainConfig) throw new Error(`Unsupported chain: ${chainSymbol}`);

    const networkName = getEnv(`${chainSymbol}_NETWORK`);
    if (!networkName)
      throw new Error(`Environment variable ${chainSymbol}_NETWORK is not set`);

    const rpcName = getEnv(`${chainSymbol}_${networkName.toUpperCase()}_RPC`);
    if (!rpcName) throw new Error(`Environment variable ${rpcName} is not set`);

    // Check cache first
    const cacheKey = `${chainSymbol}_${networkName}`;
    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey)!;
    }

    // Get chainId from config
    const network = chainConfig.networks[networkName];
    if (!network?.chainId) {
      throw new Error(`Chain ID not found for ${chainSymbol} on ${networkName}`);
    }

    // Create a static network configuration to prevent auto-detection
    const staticNetwork = Network.from({
      name: networkName,
      chainId: network.chainId,
    });

    // Create provider with static network - this prevents the "failed to detect network" error
    const provider = new JsonRpcProvider(rpcName, staticNetwork, {
      staticNetwork: true,
      batchMaxCount: 1,
    });

    // Cache the provider
    providerCache.set(cacheKey, provider);

    return provider;
  } catch (error) {
    logger.error("PROVIDER", "Failed to get provider", error);
    throw error;
  }
};

export const getWssProvider = (chainSymbol: string): WebSocketProvider => {
  try {
    const chainConfig = chainConfigs[chainSymbol];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainSymbol}`);
    }

    const networkName = getEnv(`${chainSymbol}_NETWORK`);
    if (!networkName) {
      throw new Error(`Environment variable ${chainSymbol}_NETWORK is not set`);
    }

    const rpcWssVar = `${chainSymbol}_${networkName.toUpperCase()}_RPC_WSS`;
    const rpcWssUrl = getEnv(rpcWssVar);
    if (!rpcWssUrl) {
      throw new Error(`Environment variable ${rpcWssVar} is not set`);
    }

    return new WebSocketProvider(rpcWssUrl);
  } catch (error) {
    logger.error("WSS_PROVIDER", "Failed to get WSS provider", error);
    throw error;
  }
};

export async function isProviderHealthy(provider: any): Promise<boolean> {
  try {
    const blockNumber = await provider.getBlockNumber();
    return blockNumber > 0;
  } catch {
    return false;
  }
}
