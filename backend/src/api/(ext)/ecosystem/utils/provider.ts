import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { chainConfigs } from "./chains";
import { logError } from "../../../../utils/logger";

// Export chainConfigs for use in other modules
export { chainConfigs };

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

    return new JsonRpcProvider(rpcName);
  } catch (error) {
    logError("get_provider", error, __filename);
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
    logError("get_wss_provider", error, __filename);
    console.error(error.message);
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
