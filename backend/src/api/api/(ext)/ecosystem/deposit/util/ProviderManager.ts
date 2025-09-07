// ProviderManager.ts
import {
  getProvider,
  getWssProvider,
  isProviderHealthy,
} from "@b/api/(ext)/ecosystem/utils/provider";
import { JsonRpcProvider, WebSocketProvider } from "ethers";

export const chainProviders: Map<string, any> = new Map();

export async function initializeHttpProvider(
  chain: string
): Promise<JsonRpcProvider | null> {
  if (chainProviders.has(chain)) {
    return chainProviders.get(chain);
  }

  try {
    const httpProvider = await getProvider(chain);
    if (await isProviderHealthy(httpProvider)) {
      console.log(`Initialized HTTP provider for chain ${chain}`);
      chainProviders.set(chain, httpProvider);
      return httpProvider;
    }
    throw new Error(`HTTP provider unhealthy for chain ${chain}`);
  } catch (error) {
    console.error(
      `Error initializing HTTP provider for chain ${chain}: ${error.message}`
    );
    return null;
  }
}

export async function initializeWebSocketProvider(
  chain: string
): Promise<WebSocketProvider | null> {
  if (chainProviders.has(chain)) {
    const existing = chainProviders.get(chain);
    if (existing instanceof WebSocketProvider) {
      return existing;
    }
  }

  try {
    const wsProvider = getWssProvider(chain);
    if (await isProviderHealthy(wsProvider)) {
      console.log(`Initialized WebSocket provider for chain ${chain}`);
      chainProviders.set(chain, wsProvider);
      return wsProvider;
    }
    throw new Error(`WebSocket provider unhealthy for chain ${chain}`);
  } catch (error) {
    console.error(
      `Error initializing WebSocket provider for chain ${chain}: ${error.message}`
    );
    return null;
  }
}
