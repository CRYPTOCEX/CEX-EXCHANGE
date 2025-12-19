// Safe import utility for optional blockchain extensions and (ext) folder modules
// IMPORTANT: Use these safe imports when one addon needs to access another addon's utilities
// For imports within the same addon, use direct imports instead

// Safe import function that returns null if module doesn't exist (for default exports)
async function safeImport(modulePath: string): Promise<any> {
  try {
    const importedModule = await import(modulePath);
    return importedModule.default;
  } catch (error) {
    // Module doesn't exist or failed to load
    return null;
  }
}

// Safe import function for modules with named exports
async function safeImportModule(modulePath: string): Promise<any> {
  try {
    const importedModule = await import(modulePath);
    return importedModule;
  } catch (error) {
    // Module doesn't exist or failed to load
    return null;
  }
}

// Helper function to check if a service is available
export function isServiceAvailable(service: any): boolean {
  return service !== null && service !== undefined;
}

// =============================================================================
// BLOCKCHAIN SERVICES
// =============================================================================

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

// =============================================================================
// UTXO PROVIDERS (Mempool, BlockCypher)
// =============================================================================

let mempoolProviderClass: any = null;
let mempoolProviderChecked = false;

export async function getMempoolProviderClass(): Promise<any> {
  if (!mempoolProviderChecked) {
    const module = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/MempoolProvider');
    mempoolProviderClass = module?.MempoolProvider || null;
    mempoolProviderChecked = true;
  }
  return mempoolProviderClass;
}

let blockCypherProviderClass: any = null;
let blockCypherProviderChecked = false;

export async function getBlockCypherProviderClass(): Promise<any> {
  if (!blockCypherProviderChecked) {
    const module = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/BlockCypherProvider');
    blockCypherProviderClass = module?.BlockCypherProvider || null;
    blockCypherProviderChecked = true;
  }
  return blockCypherProviderClass;
}

// =============================================================================
// ECOSYSTEM WALLET UTILITIES
// Used by other addons that need to interact with ecosystem wallets
// =============================================================================

let ecosystemWalletUtils: any = null;
let ecosystemWalletUtilsChecked = false;

export async function getEcosystemWalletUtils(): Promise<any> {
  if (!ecosystemWalletUtilsChecked) {
    ecosystemWalletUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/wallet');
    ecosystemWalletUtilsChecked = true;
  }
  return ecosystemWalletUtils;
}

// Convenience wrapper functions for common wallet operations
export async function getWalletByUserIdAndCurrency(userId: string, currency: string): Promise<any> {
  const utils = await getEcosystemWalletUtils();
  if (!utils || !utils.getWalletByUserIdAndCurrency) return null;
  return utils.getWalletByUserIdAndCurrency(userId, currency);
}

export async function updateWalletBalance(wallet: any, amount: number, operation: 'add' | 'subtract'): Promise<any> {
  const utils = await getEcosystemWalletUtils();
  if (!utils || !utils.updateWalletBalance) return null;
  return utils.updateWalletBalance(wallet, amount, operation);
}

// =============================================================================
// ECOSYSTEM SCYLLA/ORDER UTILITIES
// Used by other addons that need to create orders or access order book
// =============================================================================

let ecosystemScyllaUtils: any = null;
let ecosystemScyllaUtilsChecked = false;

export async function getEcosystemScyllaUtils(): Promise<any> {
  if (!ecosystemScyllaUtilsChecked) {
    ecosystemScyllaUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/queries');
    ecosystemScyllaUtilsChecked = true;
  }
  return ecosystemScyllaUtils;
}

// Convenience wrapper functions for common scylla operations
export async function createOrder(orderData: any): Promise<any> {
  const utils = await getEcosystemScyllaUtils();
  if (!utils || !utils.createOrder) return null;
  return utils.createOrder(orderData);
}

export async function getOrderBook(symbol: string): Promise<{ asks: any[]; bids: any[] }> {
  const utils = await getEcosystemScyllaUtils();
  if (!utils || !utils.getOrderBook) return { asks: [], bids: [] };
  return utils.getOrderBook(symbol);
}

// =============================================================================
// ECOSYSTEM BLOCKCHAIN UTILITIES
// Used by other addons that need blockchain conversion functions
// =============================================================================

let ecosystemBlockchainUtils: any = null;
let ecosystemBlockchainUtilsChecked = false;

export async function getEcosystemBlockchainUtils(): Promise<any> {
  if (!ecosystemBlockchainUtilsChecked) {
    ecosystemBlockchainUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/blockchain');
    ecosystemBlockchainUtilsChecked = true;
  }
  return ecosystemBlockchainUtils;
}

// Convenience wrapper functions for blockchain operations
export async function toBigIntFloat(value: number): Promise<bigint | null> {
  const utils = await getEcosystemBlockchainUtils();
  if (!utils || !utils.toBigIntFloat) return null;
  return utils.toBigIntFloat(value);
}

export async function fromBigInt(value: bigint): Promise<number | null> {
  const utils = await getEcosystemBlockchainUtils();
  if (!utils || !utils.fromBigInt) return null;
  return utils.fromBigInt(value);
}

// =============================================================================
// ECOSYSTEM TOKEN UTILITIES
// =============================================================================

let ecosystemTokenUtils: any = null;
let ecosystemTokenUtilsChecked = false;

export async function getEcosystemTokenUtils(): Promise<any> {
  if (!ecosystemTokenUtilsChecked) {
    ecosystemTokenUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/tokens');
    ecosystemTokenUtilsChecked = true;
  }
  return ecosystemTokenUtils;
}

export async function getEcosystemToken(currency: string): Promise<any> {
  const utils = await getEcosystemTokenUtils();
  if (!utils || !utils.getEcosystemToken) return null;
  return utils.getEcosystemToken(currency);
}

// =============================================================================
// ECOSYSTEM MATCHING ENGINE
// =============================================================================

let matchingEngine: any = null;
let matchingEngineChecked = false;

export async function getMatchingEngine(): Promise<any> {
  if (!matchingEngineChecked) {
    matchingEngine = await safeImportModule('@b/api/(ext)/ecosystem/utils/matchingEngine');
    matchingEngineChecked = true;
  }
  return matchingEngine;
}

// =============================================================================
// ECOSYSTEM CHAIN UTILITIES
// =============================================================================

let ecosystemChainUtils: any = null;
let ecosystemChainUtilsChecked = false;

export async function getEcosystemChainUtils(): Promise<any> {
  if (!ecosystemChainUtilsChecked) {
    ecosystemChainUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/chains');
    ecosystemChainUtilsChecked = true;
  }
  return ecosystemChainUtils;
}

// =============================================================================
// COPY TRADING UTILITIES
// Used to trigger copy trading from ecosystem orders
// =============================================================================

let copyTradingUtils: any = null;
let copyTradingUtilsChecked = false;

export async function getCopyTradingUtils(): Promise<any> {
  if (!copyTradingUtilsChecked) {
    copyTradingUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/tradeListener');
    copyTradingUtilsChecked = true;
  }
  return copyTradingUtils;
}

export async function triggerCopyTrading(
  orderId: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  type: "MARKET" | "LIMIT",
  amount: number,
  price: number
): Promise<void> {
  const utils = await getCopyTradingUtils();
  if (!utils || !utils.handleOrderCreated) {
    // Copy trading module not available, skip silently
    return;
  }

  try {
    // Queue the copy trading task asynchronously (don't await)
    utils.handleOrderCreated(orderId, userId, symbol, side, type, amount, price).catch((error: any) => {
      // Log error but don't throw
      console.error('[COPY_TRADING] Failed to process copy trade:', error);
    });
  } catch (error) {
    // Catch any synchronous errors
    console.error('[COPY_TRADING] Failed to trigger copy trading:', error);
  }
}

export async function triggerCopyTradingCancellation(
  orderId: string,
  userId: string,
  symbol: string
): Promise<void> {
  const utils = await getCopyTradingUtils();
  if (!utils || !utils.handleOrderCancelled) {
    // Copy trading module not available, skip silently
    return;
  }

  try {
    // Trigger cancellation asynchronously (don't await)
    utils.handleOrderCancelled(orderId, userId, symbol).catch((error: any) => {
      // Log error but don't throw
      console.error('[COPY_TRADING] Failed to process copy trade cancellation:', error);
    });
  } catch (error) {
    // Catch any synchronous errors
    console.error('[COPY_TRADING] Failed to trigger copy trading cancellation:', error);
  }
}

// Cache for fill monitor utils
let copyTradingFillMonitorUtils: any = null;
let copyTradingFillMonitorUtilsChecked = false;

export async function getCopyTradingFillMonitorUtils(): Promise<any> {
  if (!copyTradingFillMonitorUtilsChecked) {
    copyTradingFillMonitorUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/fillMonitor');
    copyTradingFillMonitorUtilsChecked = true;
  }
  return copyTradingFillMonitorUtils;
}

export async function triggerCopyTradingOrderFilled(
  orderId: string,
  userId: string,
  symbol: string,
  side: "BUY" | "SELL",
  filledAmount: number,
  filledPrice: number,
  fee: number,
  status: "FILLED" | "PARTIALLY_FILLED"
): Promise<void> {
  const utils = await getCopyTradingFillMonitorUtils();
  if (!utils || !utils.handleOrderFilled) {
    // Copy trading fill monitor not available, skip silently
    return;
  }

  try {
    // Trigger fill handling asynchronously (don't await)
    utils.handleOrderFilled(
      orderId,
      userId,
      symbol,
      side,
      filledAmount,
      filledPrice,
      fee,
      status
    ).catch((error: any) => {
      // Log error but don't throw
      console.error('[COPY_TRADING] Failed to process copy trade fill:', error);
    });
  } catch (error) {
    // Catch any synchronous errors
    console.error('[COPY_TRADING] Failed to trigger copy trading fill:', error);
  }
}

// =============================================================================
// CRON JOB UTILITIES
// Safe imports for addon cron functions
// =============================================================================

// Mailwizard
let mailwizardCronUtils: any = null;
let mailwizardCronUtilsChecked = false;

export async function getMailwizardCronUtils(): Promise<any> {
  if (!mailwizardCronUtilsChecked) {
    mailwizardCronUtils = await safeImportModule('@b/api/(ext)/admin/mailwizard/utils/cron');
    mailwizardCronUtilsChecked = true;
  }
  return mailwizardCronUtils;
}

// General Investment
let generalInvestmentCronUtils: any = null;
let generalInvestmentCronUtilsChecked = false;

export async function getGeneralInvestmentCronUtils(): Promise<any> {
  if (!generalInvestmentCronUtilsChecked) {
    generalInvestmentCronUtils = await safeImportModule('@b/api/finance/investment/cron');
    generalInvestmentCronUtilsChecked = true;
  }
  return generalInvestmentCronUtils;
}

// Forex
let forexCronUtils: any = null;
let forexCronUtilsChecked = false;

export async function getForexCronUtils(): Promise<any> {
  if (!forexCronUtilsChecked) {
    forexCronUtils = await safeImportModule('@b/api/(ext)/forex/utils/cron');
    forexCronUtilsChecked = true;
  }
  return forexCronUtils;
}

// ICO
let icoCronUtils: any = null;
let icoCronUtilsChecked = false;

export async function getIcoCronUtils(): Promise<any> {
  if (!icoCronUtilsChecked) {
    icoCronUtils = await safeImportModule('@b/api/(ext)/ico/utils/cron');
    icoCronUtilsChecked = true;
  }
  return icoCronUtils;
}

// Staking
let stakingCronUtils: any = null;
let stakingCronUtilsChecked = false;

export async function getStakingCronUtils(): Promise<any> {
  if (!stakingCronUtilsChecked) {
    stakingCronUtils = await safeImportModule('@b/api/(ext)/staking/utils/cron');
    stakingCronUtilsChecked = true;
  }
  return stakingCronUtils;
}

// AI Investment
let aiInvestmentCronUtils: any = null;
let aiInvestmentCronUtilsChecked = false;

export async function getAiInvestmentCronUtils(): Promise<any> {
  if (!aiInvestmentCronUtilsChecked) {
    aiInvestmentCronUtils = await safeImportModule('@/src/api/(ext)/ai/investment/utils/cron');
    aiInvestmentCronUtilsChecked = true;
  }
  return aiInvestmentCronUtils;
}

// AI Market Maker
let aiMarketMakerCronUtils: any = null;
let aiMarketMakerCronUtilsChecked = false;

export async function getAiMarketMakerCronUtils(): Promise<any> {
  if (!aiMarketMakerCronUtilsChecked) {
    aiMarketMakerCronUtils = await safeImportModule('@b/api/(ext)/admin/ai/market-maker/utils/cron');
    aiMarketMakerCronUtilsChecked = true;
  }
  return aiMarketMakerCronUtils;
}

// Ecosystem
let ecosystemCronUtils: any = null;
let ecosystemCronUtilsChecked = false;

export async function getEcosystemCronUtils(): Promise<any> {
  if (!ecosystemCronUtilsChecked) {
    ecosystemCronUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/cron');
    ecosystemCronUtilsChecked = true;
  }
  return ecosystemCronUtils;
}

// P2P
let p2pCronUtils: any = null;
let p2pCronUtilsChecked = false;

export async function getP2pCronUtils(): Promise<any> {
  if (!p2pCronUtilsChecked) {
    p2pCronUtils = await safeImportModule('@b/api/(ext)/p2p/utils/cron');
    p2pCronUtilsChecked = true;
  }
  return p2pCronUtils;
}

// NFT
let nftCronUtils: any = null;
let nftCronUtilsChecked = false;

export async function getNftCronUtils(): Promise<any> {
  if (!nftCronUtilsChecked) {
    nftCronUtils = await safeImportModule('@b/api/(ext)/nft/utils/cron');
    nftCronUtilsChecked = true;
  }
  return nftCronUtils;
}

// Gateway
let gatewayCronUtils: any = null;
let gatewayCronUtilsChecked = false;

export async function getGatewayCronUtils(): Promise<any> {
  if (!gatewayCronUtilsChecked) {
    gatewayCronUtils = await safeImportModule('@b/api/(ext)/gateway/utils/cron');
    gatewayCronUtilsChecked = true;
  }
  return gatewayCronUtils;
}

// Copy Trading Cron
let copyTradingCronUtils: any = null;
let copyTradingCronUtilsChecked = false;

export async function getCopyTradingCronUtils(): Promise<any> {
  if (!copyTradingCronUtilsChecked) {
    copyTradingCronUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/cron');
    copyTradingCronUtilsChecked = true;
  }
  return copyTradingCronUtils;
}

// Copy Trading Queue
let copyTradingQueueUtils: any = null;
let copyTradingQueueUtilsChecked = false;

export async function getCopyTradingQueueUtils(): Promise<any> {
  if (!copyTradingQueueUtilsChecked) {
    copyTradingQueueUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/copyQueue');
    copyTradingQueueUtilsChecked = true;
  }
  return copyTradingQueueUtils;
}

// =============================================================================
// ECOSYSTEM SERVER UTILITIES
// Used for initializing ecosystem components on server startup
// =============================================================================

// Scylla Client
let scyllaClientUtils: any = null;
let scyllaClientUtilsChecked = false;

export async function getScyllaClientUtils(): Promise<any> {
  if (!scyllaClientUtilsChecked) {
    scyllaClientUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/client');
    scyllaClientUtilsChecked = true;
  }
  return scyllaClientUtils;
}

export async function initializeScylla(): Promise<void> {
  const m = await getScyllaClientUtils();
  if (m?.initialize) return m.initialize();
}

export async function initializeMatchingEngine(): Promise<any> {
  const m = await getMatchingEngine();
  if (m?.MatchingEngine?.getInstance) return m.MatchingEngine.getInstance();
  return null;
}
