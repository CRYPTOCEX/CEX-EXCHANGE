"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isServiceAvailable = isServiceAvailable;
exports.getSolanaService = getSolanaService;
exports.getTronService = getTronService;
exports.getMoneroService = getMoneroService;
exports.getTonService = getTonService;
exports.getBitcoinNodeService = getBitcoinNodeService;
exports.getMempoolProviderClass = getMempoolProviderClass;
exports.getBlockCypherProviderClass = getBlockCypherProviderClass;
exports.getEcosystemWalletUtils = getEcosystemWalletUtils;
exports.getWalletByUserIdAndCurrency = getWalletByUserIdAndCurrency;
exports.updateWalletBalance = updateWalletBalance;
exports.getEcosystemScyllaUtils = getEcosystemScyllaUtils;
exports.createOrder = createOrder;
exports.getOrderBook = getOrderBook;
exports.getEcosystemBlockchainUtils = getEcosystemBlockchainUtils;
exports.toBigIntFloat = toBigIntFloat;
exports.fromBigInt = fromBigInt;
exports.getEcosystemTokenUtils = getEcosystemTokenUtils;
exports.getEcosystemToken = getEcosystemToken;
exports.getMatchingEngine = getMatchingEngine;
exports.getEcosystemChainUtils = getEcosystemChainUtils;
exports.getCopyTradingUtils = getCopyTradingUtils;
exports.triggerCopyTrading = triggerCopyTrading;
exports.triggerCopyTradingCancellation = triggerCopyTradingCancellation;
exports.getCopyTradingFillMonitorUtils = getCopyTradingFillMonitorUtils;
exports.triggerCopyTradingOrderFilled = triggerCopyTradingOrderFilled;
exports.getMailwizardCronUtils = getMailwizardCronUtils;
exports.getGeneralInvestmentCronUtils = getGeneralInvestmentCronUtils;
exports.getForexCronUtils = getForexCronUtils;
exports.getIcoCronUtils = getIcoCronUtils;
exports.getStakingCronUtils = getStakingCronUtils;
exports.getAiInvestmentCronUtils = getAiInvestmentCronUtils;
exports.getAiMarketMakerCronUtils = getAiMarketMakerCronUtils;
exports.getEcosystemCronUtils = getEcosystemCronUtils;
exports.getP2pCronUtils = getP2pCronUtils;
exports.getNftCronUtils = getNftCronUtils;
exports.getGatewayCronUtils = getGatewayCronUtils;
exports.getCopyTradingCronUtils = getCopyTradingCronUtils;
exports.getCopyTradingQueueUtils = getCopyTradingQueueUtils;
exports.getAffiliateUtils = getAffiliateUtils;
exports.getScyllaClientUtils = getScyllaClientUtils;
exports.initializeScylla = initializeScylla;
exports.initializeMatchingEngine = initializeMatchingEngine;
async function safeImport(modulePath) {
    try {
        const importedModule = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
        return importedModule.default;
    }
    catch (error) {
        return null;
    }
}
async function safeImportModule(modulePath) {
    try {
        const importedModule = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
        return importedModule;
    }
    catch (error) {
        return null;
    }
}
function isServiceAvailable(service) {
    return service !== null && service !== undefined;
}
let solanaService = null;
let tronService = null;
let moneroService = null;
let tonService = null;
let bitcoinNodeService = null;
let solanaChecked = false;
let tronChecked = false;
let moneroChecked = false;
let tonChecked = false;
let bitcoinNodeChecked = false;
async function getSolanaService() {
    if (!solanaChecked) {
        solanaService = await safeImport('@b/blockchains/sol');
        solanaChecked = true;
    }
    return solanaService;
}
async function getTronService() {
    if (!tronChecked) {
        tronService = await safeImport('@b/blockchains/tron');
        tronChecked = true;
    }
    return tronService;
}
async function getMoneroService() {
    if (!moneroChecked) {
        moneroService = await safeImport('@b/blockchains/xmr');
        moneroChecked = true;
    }
    return moneroService;
}
async function getTonService() {
    if (!tonChecked) {
        tonService = await safeImport('@b/blockchains/ton');
        tonChecked = true;
    }
    return tonService;
}
async function getBitcoinNodeService() {
    if (!bitcoinNodeChecked) {
        bitcoinNodeService = await safeImport('@b/api/(ext)/ecosystem/utils/utxo/btc-node');
        bitcoinNodeChecked = true;
    }
    return bitcoinNodeService;
}
let mempoolProviderClass = null;
let mempoolProviderChecked = false;
async function getMempoolProviderClass() {
    if (!mempoolProviderChecked) {
        const module = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/MempoolProvider');
        mempoolProviderClass = (module === null || module === void 0 ? void 0 : module.MempoolProvider) || null;
        mempoolProviderChecked = true;
    }
    return mempoolProviderClass;
}
let blockCypherProviderClass = null;
let blockCypherProviderChecked = false;
async function getBlockCypherProviderClass() {
    if (!blockCypherProviderChecked) {
        const module = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/BlockCypherProvider');
        blockCypherProviderClass = (module === null || module === void 0 ? void 0 : module.BlockCypherProvider) || null;
        blockCypherProviderChecked = true;
    }
    return blockCypherProviderClass;
}
let ecosystemWalletUtils = null;
let ecosystemWalletUtilsChecked = false;
async function getEcosystemWalletUtils() {
    if (!ecosystemWalletUtilsChecked) {
        ecosystemWalletUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/wallet');
        ecosystemWalletUtilsChecked = true;
    }
    return ecosystemWalletUtils;
}
async function getWalletByUserIdAndCurrency(userId, currency) {
    const utils = await getEcosystemWalletUtils();
    if (!utils || !utils.getWalletByUserIdAndCurrency)
        return null;
    return utils.getWalletByUserIdAndCurrency(userId, currency);
}
async function updateWalletBalance(wallet, amount, operation) {
    const utils = await getEcosystemWalletUtils();
    if (!utils || !utils.updateWalletBalance)
        return null;
    return utils.updateWalletBalance(wallet, amount, operation);
}
let ecosystemScyllaUtils = null;
let ecosystemScyllaUtilsChecked = false;
async function getEcosystemScyllaUtils() {
    if (!ecosystemScyllaUtilsChecked) {
        ecosystemScyllaUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/queries');
        ecosystemScyllaUtilsChecked = true;
    }
    return ecosystemScyllaUtils;
}
async function createOrder(orderData) {
    const utils = await getEcosystemScyllaUtils();
    if (!utils || !utils.createOrder)
        return null;
    return utils.createOrder(orderData);
}
async function getOrderBook(symbol) {
    const utils = await getEcosystemScyllaUtils();
    if (!utils || !utils.getOrderBook)
        return { asks: [], bids: [] };
    return utils.getOrderBook(symbol);
}
let ecosystemBlockchainUtils = null;
let ecosystemBlockchainUtilsChecked = false;
async function getEcosystemBlockchainUtils() {
    if (!ecosystemBlockchainUtilsChecked) {
        ecosystemBlockchainUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/blockchain');
        ecosystemBlockchainUtilsChecked = true;
    }
    return ecosystemBlockchainUtils;
}
async function toBigIntFloat(value) {
    const utils = await getEcosystemBlockchainUtils();
    if (!utils || !utils.toBigIntFloat)
        return null;
    return utils.toBigIntFloat(value);
}
async function fromBigInt(value) {
    const utils = await getEcosystemBlockchainUtils();
    if (!utils || !utils.fromBigInt)
        return null;
    return utils.fromBigInt(value);
}
let ecosystemTokenUtils = null;
let ecosystemTokenUtilsChecked = false;
async function getEcosystemTokenUtils() {
    if (!ecosystemTokenUtilsChecked) {
        ecosystemTokenUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/tokens');
        ecosystemTokenUtilsChecked = true;
    }
    return ecosystemTokenUtils;
}
async function getEcosystemToken(currency) {
    const utils = await getEcosystemTokenUtils();
    if (!utils || !utils.getEcosystemToken)
        return null;
    return utils.getEcosystemToken(currency);
}
let matchingEngine = null;
let matchingEngineChecked = false;
async function getMatchingEngine() {
    if (!matchingEngineChecked) {
        matchingEngine = await safeImportModule('@b/api/(ext)/ecosystem/utils/matchingEngine');
        matchingEngineChecked = true;
    }
    return matchingEngine;
}
let ecosystemChainUtils = null;
let ecosystemChainUtilsChecked = false;
async function getEcosystemChainUtils() {
    if (!ecosystemChainUtilsChecked) {
        ecosystemChainUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/chains');
        ecosystemChainUtilsChecked = true;
    }
    return ecosystemChainUtils;
}
let copyTradingUtils = null;
let copyTradingUtilsChecked = false;
async function getCopyTradingUtils() {
    if (!copyTradingUtilsChecked) {
        copyTradingUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/tradeListener');
        copyTradingUtilsChecked = true;
    }
    return copyTradingUtils;
}
async function triggerCopyTrading(orderId, userId, symbol, side, type, amount, price) {
    const utils = await getCopyTradingUtils();
    if (!utils || !utils.handleOrderCreated) {
        return;
    }
    try {
        utils.handleOrderCreated(orderId, userId, symbol, side, type, amount, price).catch((error) => {
            console.error('[COPY_TRADING] Failed to process copy trade:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger copy trading:', error);
    }
}
async function triggerCopyTradingCancellation(orderId, userId, symbol) {
    const utils = await getCopyTradingUtils();
    if (!utils || !utils.handleOrderCancelled) {
        return;
    }
    try {
        utils.handleOrderCancelled(orderId, userId, symbol).catch((error) => {
            console.error('[COPY_TRADING] Failed to process copy trade cancellation:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger copy trading cancellation:', error);
    }
}
let copyTradingFillMonitorUtils = null;
let copyTradingFillMonitorUtilsChecked = false;
async function getCopyTradingFillMonitorUtils() {
    if (!copyTradingFillMonitorUtilsChecked) {
        copyTradingFillMonitorUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/fillMonitor');
        copyTradingFillMonitorUtilsChecked = true;
    }
    return copyTradingFillMonitorUtils;
}
async function triggerCopyTradingOrderFilled(orderId, userId, symbol, side, filledAmount, filledPrice, fee, status) {
    const utils = await getCopyTradingFillMonitorUtils();
    if (!utils || !utils.handleOrderFilled) {
        return;
    }
    try {
        utils.handleOrderFilled(orderId, userId, symbol, side, filledAmount, filledPrice, fee, status).catch((error) => {
            console.error('[COPY_TRADING] Failed to process copy trade fill:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger copy trading fill:', error);
    }
}
let mailwizardCronUtils = null;
let mailwizardCronUtilsChecked = false;
async function getMailwizardCronUtils() {
    if (!mailwizardCronUtilsChecked) {
        mailwizardCronUtils = await safeImportModule('@b/api/(ext)/admin/mailwizard/utils/cron');
        mailwizardCronUtilsChecked = true;
    }
    return mailwizardCronUtils;
}
let generalInvestmentCronUtils = null;
let generalInvestmentCronUtilsChecked = false;
async function getGeneralInvestmentCronUtils() {
    if (!generalInvestmentCronUtilsChecked) {
        generalInvestmentCronUtils = await safeImportModule('@b/api/finance/investment/cron');
        generalInvestmentCronUtilsChecked = true;
    }
    return generalInvestmentCronUtils;
}
let forexCronUtils = null;
let forexCronUtilsChecked = false;
async function getForexCronUtils() {
    if (!forexCronUtilsChecked) {
        forexCronUtils = await safeImportModule('@b/api/(ext)/forex/utils/cron');
        forexCronUtilsChecked = true;
    }
    return forexCronUtils;
}
let icoCronUtils = null;
let icoCronUtilsChecked = false;
async function getIcoCronUtils() {
    if (!icoCronUtilsChecked) {
        icoCronUtils = await safeImportModule('@b/api/(ext)/ico/utils/cron');
        icoCronUtilsChecked = true;
    }
    return icoCronUtils;
}
let stakingCronUtils = null;
let stakingCronUtilsChecked = false;
async function getStakingCronUtils() {
    if (!stakingCronUtilsChecked) {
        stakingCronUtils = await safeImportModule('@b/api/(ext)/staking/utils/cron');
        stakingCronUtilsChecked = true;
    }
    return stakingCronUtils;
}
let aiInvestmentCronUtils = null;
let aiInvestmentCronUtilsChecked = false;
async function getAiInvestmentCronUtils() {
    if (!aiInvestmentCronUtilsChecked) {
        aiInvestmentCronUtils = await safeImportModule('@/src/api/(ext)/ai/investment/utils/cron');
        aiInvestmentCronUtilsChecked = true;
    }
    return aiInvestmentCronUtils;
}
let aiMarketMakerCronUtils = null;
let aiMarketMakerCronUtilsChecked = false;
async function getAiMarketMakerCronUtils() {
    if (!aiMarketMakerCronUtilsChecked) {
        aiMarketMakerCronUtils = await safeImportModule('@b/api/(ext)/admin/ai/market-maker/utils/cron');
        aiMarketMakerCronUtilsChecked = true;
    }
    return aiMarketMakerCronUtils;
}
let ecosystemCronUtils = null;
let ecosystemCronUtilsChecked = false;
async function getEcosystemCronUtils() {
    if (!ecosystemCronUtilsChecked) {
        ecosystemCronUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/cron');
        ecosystemCronUtilsChecked = true;
    }
    return ecosystemCronUtils;
}
let p2pCronUtils = null;
let p2pCronUtilsChecked = false;
async function getP2pCronUtils() {
    if (!p2pCronUtilsChecked) {
        p2pCronUtils = await safeImportModule('@b/api/(ext)/p2p/utils/cron');
        p2pCronUtilsChecked = true;
    }
    return p2pCronUtils;
}
let nftCronUtils = null;
let nftCronUtilsChecked = false;
async function getNftCronUtils() {
    if (!nftCronUtilsChecked) {
        nftCronUtils = await safeImportModule('@b/api/(ext)/nft/utils/cron');
        nftCronUtilsChecked = true;
    }
    return nftCronUtils;
}
let gatewayCronUtils = null;
let gatewayCronUtilsChecked = false;
async function getGatewayCronUtils() {
    if (!gatewayCronUtilsChecked) {
        gatewayCronUtils = await safeImportModule('@b/api/(ext)/gateway/utils/cron');
        gatewayCronUtilsChecked = true;
    }
    return gatewayCronUtils;
}
let copyTradingCronUtils = null;
let copyTradingCronUtilsChecked = false;
async function getCopyTradingCronUtils() {
    if (!copyTradingCronUtilsChecked) {
        copyTradingCronUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/cron');
        copyTradingCronUtilsChecked = true;
    }
    return copyTradingCronUtils;
}
let copyTradingQueueUtils = null;
let copyTradingQueueUtilsChecked = false;
async function getCopyTradingQueueUtils() {
    if (!copyTradingQueueUtilsChecked) {
        copyTradingQueueUtils = await safeImportModule('@b/api/(ext)/copy-trading/utils/copyQueue');
        copyTradingQueueUtilsChecked = true;
    }
    return copyTradingQueueUtils;
}
let affiliateUtils = null;
let affiliateUtilsChecked = false;
async function getAffiliateUtils() {
    if (!affiliateUtilsChecked) {
        affiliateUtils = await safeImportModule('@b/api/(ext)/affiliate/utils');
        affiliateUtilsChecked = true;
    }
    return affiliateUtils;
}
let scyllaClientUtils = null;
let scyllaClientUtilsChecked = false;
async function getScyllaClientUtils() {
    if (!scyllaClientUtilsChecked) {
        scyllaClientUtils = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/client');
        scyllaClientUtilsChecked = true;
    }
    return scyllaClientUtils;
}
async function initializeScylla() {
    const m = await getScyllaClientUtils();
    if (m === null || m === void 0 ? void 0 : m.initialize)
        return m.initialize();
}
async function initializeMatchingEngine() {
    var _a;
    const m = await getMatchingEngine();
    if ((_a = m === null || m === void 0 ? void 0 : m.MatchingEngine) === null || _a === void 0 ? void 0 : _a.getInstance)
        return m.MatchingEngine.getInstance();
    return null;
}
