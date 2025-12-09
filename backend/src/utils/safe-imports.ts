// Safe import utility for optional blockchain extensions
interface BlockchainService {
  getInstance(): Promise<any>;
}

// Safe import function that returns null if module doesn't exist
async function safeImport(modulePath: string): Promise<any> {
  try {
    const importedModule = await import(modulePath);
    return importedModule.default;
  } catch (error) {
    // Module doesn't exist or failed to load
    return null;
  }
}

// Cached service instances
let solanaService: any = null;
let tronService: any = null;
let moneroService: any = null;
let tonService: any = null;
let bitcoinNodeService: any = null;

// Flags to track if we've attempted to load services
let solanaChecked = false;
let tronChecked = false;
let moneroChecked = false;
let tonChecked = false;
let bitcoinNodeChecked = false;

export async function getSolanaService(): Promise<any> {
  if (!solanaChecked) {
    solanaService = await safeImport('@b/blockchains/sol');
    solanaChecked = true;
  }
  return solanaService;
}

export async function getTronService(): Promise<any> {
  if (!tronChecked) {
    tronService = await safeImport('@b/blockchains/tron');
    tronChecked = true;
  }
  return tronService;
}

export async function getMoneroService(): Promise<any> {
  if (!moneroChecked) {
    moneroService = await safeImport('@b/blockchains/xmr');
    moneroChecked = true;
  }
  return moneroService;
}

export async function getTonService(): Promise<any> {
  if (!tonChecked) {
    tonService = await safeImport('@b/blockchains/ton');
    tonChecked = true;
  }
  return tonService;
}

export async function getBitcoinNodeService(): Promise<any> {
  if (!bitcoinNodeChecked) {
    bitcoinNodeService = await safeImport('@b/api/(ext)/ecosystem/utils/utxo/btc-node');
    bitcoinNodeChecked = true;
  }
  return bitcoinNodeService;
}

// Cached ecosystem wallet utils
let ecosystemWalletUtils: any = null;
let ecosystemWalletUtilsChecked = false;

export async function getEcosystemWalletUtils(): Promise<any> {
  if (!ecosystemWalletUtilsChecked) {
    ecosystemWalletUtils = await safeImport('@b/api/(ext)/ecosystem/utils/wallet');
    ecosystemWalletUtilsChecked = true;
  }
  return ecosystemWalletUtils;
}

// Helper function to check if a service is available
export function isServiceAvailable(service: any): boolean {
  return service !== null && service !== undefined;
}

// Cached P2P utils
let p2pTradeTimeoutUtils: any = null;
let p2pTradeTimeoutUtilsChecked = false;

export async function getP2PTradeTimeoutUtils(): Promise<any> {
  if (!p2pTradeTimeoutUtilsChecked) {
    try {
      // Import the whole module since it uses named exports (not default export)
      const module = await import('@b/api/(ext)/p2p/utils/p2p-trade-timeout');
      p2pTradeTimeoutUtils = module;
    } catch (error) {
      console.log("P2P trade timeout utils not available:", error);
      p2pTradeTimeoutUtils = null;
    }
    p2pTradeTimeoutUtilsChecked = true;
  }
  return p2pTradeTimeoutUtils;
}

// Cached AI Market Maker Engine
let aiMarketMakerEngine: any = null;
let aiMarketMakerEngineChecked = false;

export async function getAiMarketMakerEngine(): Promise<any> {
  if (!aiMarketMakerEngineChecked) {
    aiMarketMakerEngine = await safeImport('@b/api/(ext)/admin/ai/market-maker/utils/engine/MarketMakerEngine');
    aiMarketMakerEngineChecked = true;
  }
  return aiMarketMakerEngine;
}

// Cached Gateway Payout Cron
let gatewayPayoutCron: any = null;
let gatewayPayoutCronChecked = false;

export async function getGatewayPayoutCron(): Promise<any> {
  if (!gatewayPayoutCronChecked) {
    try {
      const module = await import('@b/utils/crons/gatewayPayout');
      gatewayPayoutCron = module;
    } catch (error) {
      console.log("Gateway payout cron not available:", error);
      gatewayPayoutCron = null;
    }
    gatewayPayoutCronChecked = true;
  }
  return gatewayPayoutCron;
} 