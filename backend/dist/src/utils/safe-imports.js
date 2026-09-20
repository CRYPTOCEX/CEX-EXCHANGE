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
exports.isMissingOptionalAddon = isMissingOptionalAddon;
exports.requireOptionalModule = requireOptionalModule;
exports.isServiceAvailable = isServiceAvailable;
exports.getSolanaService = getSolanaService;
exports.getTronService = getTronService;
exports.getMoneroService = getMoneroService;
exports.getTonService = getTonService;
exports.getBitcoinNodeService = getBitcoinNodeService;
exports.getBackgroundDepositScanner = getBackgroundDepositScanner;
exports.getMempoolProviderClass = getMempoolProviderClass;
exports.getBlockCypherProviderClass = getBlockCypherProviderClass;
exports.getEcosystemWalletUtils = getEcosystemWalletUtils;
exports.getWalletByUserIdAndCurrency = getWalletByUserIdAndCurrency;
exports.updateWalletBalance = updateWalletBalance;
exports.getEcosystemScyllaUtils = getEcosystemScyllaUtils;
exports.getEcosystemScyllaClient = getEcosystemScyllaClient;
exports.placeEcosystemOrderSafe = placeEcosystemOrderSafe;
exports.cancelEcosystemOrderSafe = cancelEcosystemOrderSafe;
exports.getEcosystemOrderSafe = getEcosystemOrderSafe;
exports.getEcosystemBigIntHelpers = getEcosystemBigIntHelpers;
exports.getEcosystemBestPrices = getEcosystemBestPrices;
exports.getEcosystemMarketPrice = getEcosystemMarketPrice;
exports.getEcosystemCandleClose = getEcosystemCandleClose;
exports.createOrder = createOrder;
exports.getOrderBook = getOrderBook;
exports.getSettlementClosePin = getSettlementClosePin;
exports.publishCandleClose = publishCandleClose;
exports.getRealOrderBook = getRealOrderBook;
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
exports.getCopyTradingBinaryUtils = getCopyTradingBinaryUtils;
exports.triggerCopyTradingBinaryOrderCreated = triggerCopyTradingBinaryOrderCreated;
exports.triggerCopyTradingBinarySettled = triggerCopyTradingBinarySettled;
exports.triggerCopyTradingBinaryCanceled = triggerCopyTradingBinaryCanceled;
exports.getCopyTradingFillMonitorUtils = getCopyTradingFillMonitorUtils;
exports.triggerCopyTradingOrderFilled = triggerCopyTradingOrderFilled;
exports.getMailwizardCronUtils = getMailwizardCronUtils;
exports.getGeneralInvestmentCronUtils = getGeneralInvestmentCronUtils;
exports.getForexCronUtils = getForexCronUtils;
exports.getIcoCronUtils = getIcoCronUtils;
exports.getStakingCronUtils = getStakingCronUtils;
exports.getStakingSettingsUtils = getStakingSettingsUtils;
exports.getStakingRealCronUtils = getStakingRealCronUtils;
exports.getEcosystemProviderUtils = getEcosystemProviderUtils;
exports.getAiInvestmentCronUtils = getAiInvestmentCronUtils;
exports.getAiSupportCronUtils = getAiSupportCronUtils;
exports.getAiMarketMakerCronUtils = getAiMarketMakerCronUtils;
exports.getBinaryAiEngineCronUtils = getBinaryAiEngineCronUtils;
exports.getBinaryAiSettlementPrice = getBinaryAiSettlementPrice;
exports.getBinaryAiMaxOrderExposure = getBinaryAiMaxOrderExposure;
exports.triggerBinaryAiReconcile = triggerBinaryAiReconcile;
exports.getEcosystemCronUtils = getEcosystemCronUtils;
exports.getP2pCronUtils = getP2pCronUtils;
exports.getNftCronUtils = getNftCronUtils;
exports.getGatewayCronUtils = getGatewayCronUtils;
exports.getFuturesCronUtils = getFuturesCronUtils;
exports.getFuturesFundingUtils = getFuturesFundingUtils;
exports.getFuturesFeeReversalUtils = getFuturesFeeReversalUtils;
exports.getCopyTradingCronUtils = getCopyTradingCronUtils;
exports.getCopyTradingQueueUtils = getCopyTradingQueueUtils;
exports.getTradingBotCronUtils = getTradingBotCronUtils;
exports.getAffiliateUtils = getAffiliateUtils;
exports.getAffiliateCronUtils = getAffiliateCronUtils;
exports.getScyllaClientUtils = getScyllaClientUtils;
exports.initializeScylla = initializeScylla;
exports.initializeMatchingEngine = initializeMatchingEngine;
exports.stopAiMarketMakerOnStandDown = stopAiMarketMakerOnStandDown;
exports.stopTradingBotOnStandDown = stopTradingBotOnStandDown;
exports.getFuturesEngineModule = getFuturesEngineModule;
exports.initializeFuturesEngine = initializeFuturesEngine;
exports.getFxTradingCronUtils = getFxTradingCronUtils;
exports.getDexCronUtils = getDexCronUtils;
exports.initializeDexConfirmations = initializeDexConfirmations;
exports.initializeDexPoolIndexer = initializeDexPoolIndexer;
exports.getFxTickEngineModule = getFxTickEngineModule;
exports.initializeFxTickEngine = initializeFxTickEngine;
exports.getDexSetupModule = getDexSetupModule;
exports.initializeDex = initializeDex;
const worker_threads_1 = require("worker_threads");
const console_1 = require("@b/utils/console");
function isRequestedModuleMissing(error, modulePath) {
    const code = error === null || error === void 0 ? void 0 : error.code;
    if (code !== "MODULE_NOT_FOUND" && code !== "ERR_MODULE_NOT_FOUND") {
        return false;
    }
    const firstLine = String((error === null || error === void 0 ? void 0 : error.message) || "")
        .split("\n")[0]
        .split(" imported from")[0]
        .replace(/\\/g, "/");
    const specifier = modulePath.replace(/^@b\//, "").replace(/^@db\//, "");
    return firstLine.includes(modulePath) || firstLine.includes(specifier);
}
function addonOf(pathish) {
    const m = /(?:^|\/)api\/\(ext\)\/+(.+)/.exec(String(pathish !== null && pathish !== void 0 ? pathish : "").replace(/\\/g, "/"));
    if (!m)
        return null;
    const parts = m[1].split("/").filter(Boolean);
    if (parts[0] === "admin")
        parts.shift();
    if (!parts.length)
        return null;
    return parts[0] === "ai" && parts[1] ? `ai/${parts[1]}` : parts[0];
}
function isMissingOptionalAddon(error, requestingFile) {
    const code = error === null || error === void 0 ? void 0 : error.code;
    if (code !== "MODULE_NOT_FOUND" && code !== "ERR_MODULE_NOT_FOUND")
        return false;
    const firstLine = String((error === null || error === void 0 ? void 0 : error.message) || "").split("\n")[0];
    const quoted = /Cannot find (?:module|package) '([^']+)'/.exec(firstLine);
    if (!quoted)
        return false;
    const specifier = quoted[1].replace(/\\/g, "/");
    if (specifier.includes("/node_modules/"))
        return false;
    const missing = addonOf(specifier);
    if (!missing)
        return false;
    return missing !== addonOf(requestingFile);
}
function requireOptionalModule(modulePath) {
    try {
        return require(modulePath);
    }
    catch (error) {
        if (isRequestedModuleMissing(error, modulePath)) {
            return null;
        }
        throw error;
    }
}
async function safeImport(modulePath) {
    var _a, _b;
    try {
        const importedModule = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
        return (_a = importedModule.default) !== null && _a !== void 0 ? _a : null;
    }
    catch (error) {
        if (isRequestedModuleMissing(error, modulePath)) {
            return null;
        }
        console_1.logger.error("IMPORT", `Failed to load module ${modulePath}: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`, error);
        return undefined;
    }
}
async function safeImportModule(modulePath) {
    var _a;
    try {
        const importedModule = await Promise.resolve(`${modulePath}`).then(s => __importStar(require(s)));
        return importedModule;
    }
    catch (error) {
        if (isRequestedModuleMissing(error, modulePath)) {
            return null;
        }
        console_1.logger.error("IMPORT", `Failed to load module ${modulePath}: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`, error);
        return undefined;
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
        const mod = await safeImport('@b/blockchains/sol');
        if (mod !== undefined) {
            solanaService = mod;
            solanaChecked = true;
        }
    }
    return solanaService;
}
async function getTronService() {
    if (!tronChecked) {
        const mod = await safeImport('@b/blockchains/tron');
        if (mod !== undefined) {
            tronService = mod;
            tronChecked = true;
        }
    }
    return tronService;
}
async function getMoneroService() {
    if (!moneroChecked) {
        const mod = await safeImport('@b/blockchains/xmr');
        if (mod !== undefined) {
            moneroService = mod;
            moneroChecked = true;
        }
    }
    return moneroService;
}
async function getTonService() {
    if (!tonChecked) {
        const mod = await safeImport('@b/blockchains/ton');
        if (mod !== undefined) {
            tonService = mod;
            tonChecked = true;
        }
    }
    return tonService;
}
async function getBitcoinNodeService() {
    if (!bitcoinNodeChecked) {
        const mod = await safeImport('@b/api/(ext)/ecosystem/utils/utxo/btc-node');
        if (mod !== undefined) {
            bitcoinNodeService = mod;
            bitcoinNodeChecked = true;
        }
    }
    return bitcoinNodeService;
}
let backgroundDepositScannerModule = null;
let backgroundDepositScannerChecked = false;
async function getBackgroundDepositScanner() {
    if (!backgroundDepositScannerChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/deposit/util/BackgroundDepositScanner');
        if (mod !== undefined) {
            backgroundDepositScannerModule = mod;
            backgroundDepositScannerChecked = true;
        }
    }
    return backgroundDepositScannerModule;
}
let mempoolProviderClass = null;
let mempoolProviderChecked = false;
async function getMempoolProviderClass() {
    if (!mempoolProviderChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/MempoolProvider');
        if (mod !== undefined) {
            mempoolProviderClass = (mod === null || mod === void 0 ? void 0 : mod.MempoolProvider) || null;
            mempoolProviderChecked = true;
        }
    }
    return mempoolProviderClass;
}
let blockCypherProviderClass = null;
let blockCypherProviderChecked = false;
async function getBlockCypherProviderClass() {
    if (!blockCypherProviderChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/utxo/providers/BlockCypherProvider');
        if (mod !== undefined) {
            blockCypherProviderClass = (mod === null || mod === void 0 ? void 0 : mod.BlockCypherProvider) || null;
            blockCypherProviderChecked = true;
        }
    }
    return blockCypherProviderClass;
}
let ecosystemWalletUtils = null;
let ecosystemWalletUtilsChecked = false;
async function getEcosystemWalletUtils() {
    if (!ecosystemWalletUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/wallet');
        if (mod !== undefined) {
            ecosystemWalletUtils = mod;
            ecosystemWalletUtilsChecked = true;
        }
    }
    return ecosystemWalletUtils;
}
async function getWalletByUserIdAndCurrency(userId, currency, type, transaction, lock) {
    const utils = await getEcosystemWalletUtils();
    if (!utils || !utils.getWalletByUserIdAndCurrency)
        return null;
    return utils.getWalletByUserIdAndCurrency(userId, currency, type, transaction, lock);
}
async function updateWalletBalance(wallet, amount, operation, idempotencyKey, transaction, releaseOnly) {
    const utils = await getEcosystemWalletUtils();
    if (!utils || !utils.updateWalletBalance)
        return null;
    return utils.updateWalletBalance(wallet, amount, operation, idempotencyKey, transaction, releaseOnly);
}
let ecosystemScyllaUtils = null;
let ecosystemScyllaUtilsChecked = false;
async function getEcosystemScyllaUtils() {
    if (!ecosystemScyllaUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/queries');
        if (mod !== undefined) {
            ecosystemScyllaUtils = mod;
            ecosystemScyllaUtilsChecked = true;
        }
    }
    return ecosystemScyllaUtils;
}
let ecosystemScyllaClientModule = null;
let ecosystemScyllaClientChecked = false;
async function getEcosystemScyllaClient() {
    if (!ecosystemScyllaClientChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/client');
        if (mod !== undefined) {
            ecosystemScyllaClientModule = mod;
            ecosystemScyllaClientChecked = true;
        }
    }
    return ecosystemScyllaClientModule;
}
async function placeEcosystemOrderSafe(params) {
    const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/placeOrder');
    if (!(mod === null || mod === void 0 ? void 0 : mod.placeEcosystemOrder))
        return null;
    return mod.placeEcosystemOrder(params);
}
async function cancelEcosystemOrderSafe(userId, orderId, walletType = "ECO") {
    const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/cancelOrder');
    if (!(mod === null || mod === void 0 ? void 0 : mod.cancelEcosystemOrder))
        return null;
    return mod.cancelEcosystemOrder(userId, orderId, walletType);
}
async function getEcosystemOrderSafe(userId, orderId, symbol) {
    const utils = await getEcosystemScyllaUtils();
    if (symbol && (utils === null || utils === void 0 ? void 0 : utils.findRawOrderByIdOnSymbol)) {
        return utils.findRawOrderByIdOnSymbol(userId, symbol, orderId);
    }
    if (!(utils === null || utils === void 0 ? void 0 : utils.getOrderByUserAndId))
        return null;
    return utils.getOrderByUserAndId(userId, orderId);
}
async function getEcosystemBigIntHelpers() {
    const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/blockchain');
    if (!(mod === null || mod === void 0 ? void 0 : mod.fromBigInt))
        return null;
    return mod;
}
async function getEcosystemBestPrices(symbol) {
    var _a, _b;
    const utils = await getEcosystemScyllaUtils();
    if (!(utils === null || utils === void 0 ? void 0 : utils.getRealOrderBook))
        return null;
    try {
        const book = await utils.getRealOrderBook(symbol);
        const bids = (_a = book === null || book === void 0 ? void 0 : book.bids) !== null && _a !== void 0 ? _a : [];
        const asks = (_b = book === null || book === void 0 ? void 0 : book.asks) !== null && _b !== void 0 ? _b : [];
        return {
            bid: bids.length ? Number(bids[0][0]) : null,
            ask: asks.length ? Number(asks[0][0]) : null,
        };
    }
    catch (_c) {
        return null;
    }
}
async function getEcosystemMarketPrice(symbol) {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h;
    if (!symbol || !symbol.includes("/"))
        return null;
    const [currency, pair] = symbol.split("/");
    try {
        const { models } = await Promise.resolve().then(() => __importStar(require('@b/db')));
        const market = await ((_a = models.ecosystemMarket) === null || _a === void 0 ? void 0 : _a.findOne({
            where: { currency, pair },
        }));
        if (market) {
            const marketMaker = await ((_b = models.aiMarketMaker) === null || _b === void 0 ? void 0 : _b.findOne({
                where: { marketId: market.id },
            }));
            if (marketMaker) {
                const mmModule = await safeImportModule('@b/api/(ext)/admin/ai/market-maker/utils/engine/MarketMakerEngine');
                const marketMakerEngine = (_h = mmModule === null || mmModule === void 0 ? void 0 : mmModule.default) !== null && _h !== void 0 ? _h : mmModule;
                try {
                    const instance = (_e = (_d = (_c = marketMakerEngine === null || marketMakerEngine === void 0 ? void 0 : marketMakerEngine.getMarketManager) === null || _c === void 0 ? void 0 : _c.call(marketMakerEngine)) === null || _d === void 0 ? void 0 : _d.getMarketInstance) === null || _e === void 0 ? void 0 : _e.call(_d, marketMaker.id);
                    const live = (_f = instance === null || instance === void 0 ? void 0 : instance.getCurrentPriceNumber) === null || _f === void 0 ? void 0 : _f.call(instance);
                    if (typeof live === "number" && Number.isFinite(live) && live > 0) {
                        return live;
                    }
                }
                catch (_j) {
                }
                const candleClose = await getEcosystemCandleClose(symbol, Date.now());
                if (typeof candleClose === "number" &&
                    Number.isFinite(candleClose) &&
                    candleClose > 0) {
                    return candleClose;
                }
                const known = Number(marketMaker.lastKnownPrice);
                if (Number.isFinite(known) && known > 0)
                    return known;
            }
        }
        const engineModule = await safeImportModule('@b/api/(ext)/ecosystem/utils/matchingEngine');
        if (engineModule === null || engineModule === void 0 ? void 0 : engineModule.MatchingEngine) {
            const engine = await engineModule.MatchingEngine.getInstance();
            const ticker = (_g = engine === null || engine === void 0 ? void 0 : engine.getTicker) === null || _g === void 0 ? void 0 : _g.call(engine, symbol);
            const last = Number(ticker === null || ticker === void 0 ? void 0 : ticker.last);
            if (Number.isFinite(last) && last > 0)
                return last;
        }
    }
    catch (_k) {
    }
    return null;
}
async function getEcosystemCandleClose(symbol, atMs) {
    var _a, _b;
    try {
        if (!symbol || !Number.isFinite(atMs))
            return null;
        const utils = await getEcosystemScyllaUtils();
        if (!(utils === null || utils === void 0 ? void 0 : utils.getHistoricalCandles))
            return null;
        const MINUTE_MS = 60000;
        const candleStart = Math.floor(atMs / MINUTE_MS) * MINUTE_MS;
        const nowBucket = Math.floor(Date.now() / MINUTE_MS);
        const expiryBucket = Math.floor(atMs / MINUTE_MS);
        if (nowBucket !== expiryBucket) {
            const prevStart = candleStart - MINUTE_MS;
            const prev = await utils.getHistoricalCandles(symbol, "1m", prevStart, prevStart + MINUTE_MS - 1);
            if (Array.isArray(prev) && prev.length > 0) {
                const prevClose = Number((_a = prev[prev.length - 1]) === null || _a === void 0 ? void 0 : _a[4]);
                if (Number.isFinite(prevClose) && prevClose > 0)
                    return prevClose;
            }
        }
        const candles = await utils.getHistoricalCandles(symbol, "1m", candleStart, candleStart + MINUTE_MS - 1);
        if (!Array.isArray(candles) || candles.length === 0)
            return null;
        const containing = candles.find((c) => c[0] <= atMs && atMs < c[0] + MINUTE_MS);
        const close = Number((_b = (containing !== null && containing !== void 0 ? containing : candles[candles.length - 1])) === null || _b === void 0 ? void 0 : _b[4]);
        return Number.isFinite(close) && close > 0 ? close : null;
    }
    catch (_c) {
        return null;
    }
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
async function getSettlementClosePin(symbol, atMs) {
    try {
        const mod = await safeImportModule("@b/api/(ext)/admin/ai/market-maker/utils/scylla/closeAuthority");
        if (!(mod === null || mod === void 0 ? void 0 : mod.getSettlementClose))
            return null;
        return await mod.getSettlementClose(symbol, atMs);
    }
    catch (_a) {
        return null;
    }
}
async function publishCandleClose(symbol, price, atMs) {
    try {
        if (!symbol || !Number.isFinite(price) || price <= 0)
            return false;
        const mod = await safeImportModule("@b/api/(ext)/admin/ai/market-maker/utils/scylla/queries");
        if (!(mod === null || mod === void 0 ? void 0 : mod.syncCandlesFromAiTrade))
            return false;
        const MINUTE_MS = 60000;
        if (Number.isFinite(atMs) &&
            Math.floor(atMs / MINUTE_MS) !== Math.floor(Date.now() / MINUTE_MS)) {
            return false;
        }
        await mod.syncCandlesFromAiTrade(symbol, price, 0, {
            authoritativeClose: true,
        });
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function getRealOrderBook(symbol) {
    const utils = await getEcosystemScyllaUtils();
    if (!utils)
        return { asks: [], bids: [] };
    if (utils.getRealOrderBook)
        return utils.getRealOrderBook(symbol);
    if (utils.getOrderBook)
        return utils.getOrderBook(symbol);
    return { asks: [], bids: [] };
}
let ecosystemBlockchainUtils = null;
let ecosystemBlockchainUtilsChecked = false;
async function getEcosystemBlockchainUtils() {
    if (!ecosystemBlockchainUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/blockchain');
        if (mod !== undefined) {
            ecosystemBlockchainUtils = mod;
            ecosystemBlockchainUtilsChecked = true;
        }
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
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/tokens');
        if (mod !== undefined) {
            ecosystemTokenUtils = mod;
            ecosystemTokenUtilsChecked = true;
        }
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
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/matchingEngine');
        if (mod !== undefined) {
            matchingEngine = mod;
            matchingEngineChecked = true;
        }
    }
    return matchingEngine;
}
let ecosystemChainUtils = null;
let ecosystemChainUtilsChecked = false;
async function getEcosystemChainUtils() {
    if (!ecosystemChainUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/chains');
        if (mod !== undefined) {
            ecosystemChainUtils = mod;
            ecosystemChainUtilsChecked = true;
        }
    }
    return ecosystemChainUtils;
}
let copyTradingUtils = null;
let copyTradingUtilsChecked = false;
async function getCopyTradingUtils() {
    if (!copyTradingUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/copy-trading/utils/tradeListener');
        if (mod !== undefined) {
            copyTradingUtils = mod;
            copyTradingUtilsChecked = true;
        }
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
let copyTradingBinaryUtils = null;
let copyTradingBinaryUtilsChecked = false;
async function getCopyTradingBinaryUtils() {
    if (!copyTradingBinaryUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/copy-trading/utils/binary');
        if (mod !== undefined) {
            copyTradingBinaryUtils = mod;
            copyTradingBinaryUtilsChecked = true;
        }
    }
    return copyTradingBinaryUtils;
}
async function triggerCopyTradingBinaryOrderCreated(event) {
    const utils = await getCopyTradingBinaryUtils();
    if (!utils || !utils.handleBinaryOrderCreated) {
        return;
    }
    try {
        utils.handleBinaryOrderCreated(event).catch((error) => {
            console.error('[COPY_TRADING] Failed to process binary copy trade:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger binary copy trading:', error);
    }
}
async function triggerCopyTradingBinarySettled(orderId, status, profit, closePrice) {
    const utils = await getCopyTradingBinaryUtils();
    if (!utils || !utils.handleBinaryOrderSettled) {
        return;
    }
    try {
        utils.handleBinaryOrderSettled(orderId, status, profit, closePrice).catch((error) => {
            console.error('[COPY_TRADING] Failed to process binary copy settlement:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger binary copy settlement:', error);
    }
}
async function triggerCopyTradingBinaryCanceled(orderId, userId, refundAmount) {
    const utils = await getCopyTradingBinaryUtils();
    if (!utils || !utils.handleBinaryOrderCanceled) {
        return;
    }
    try {
        utils.handleBinaryOrderCanceled(orderId, userId, refundAmount).catch((error) => {
            console.error('[COPY_TRADING] Failed to process binary copy cancellation:', error);
        });
    }
    catch (error) {
        console.error('[COPY_TRADING] Failed to trigger binary copy cancellation:', error);
    }
}
let copyTradingFillMonitorUtils = null;
let copyTradingFillMonitorUtilsChecked = false;
async function getCopyTradingFillMonitorUtils() {
    if (!copyTradingFillMonitorUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/copy-trading/utils/fillMonitor');
        if (mod !== undefined) {
            copyTradingFillMonitorUtils = mod;
            copyTradingFillMonitorUtilsChecked = true;
        }
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
        const mod = await safeImportModule('@b/api/(ext)/admin/mailwizard/utils/cron');
        if (mod !== undefined) {
            mailwizardCronUtils = mod;
            mailwizardCronUtilsChecked = true;
        }
    }
    return mailwizardCronUtils;
}
let generalInvestmentCronUtils = null;
let generalInvestmentCronUtilsChecked = false;
async function getGeneralInvestmentCronUtils() {
    if (!generalInvestmentCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/finance/investment/cron');
        if (mod !== undefined) {
            generalInvestmentCronUtils = mod;
            generalInvestmentCronUtilsChecked = true;
        }
    }
    return generalInvestmentCronUtils;
}
let forexCronUtils = null;
let forexCronUtilsChecked = false;
async function getForexCronUtils() {
    if (!forexCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/forex/utils/cron');
        if (mod !== undefined) {
            forexCronUtils = mod;
            forexCronUtilsChecked = true;
        }
    }
    return forexCronUtils;
}
let icoCronUtils = null;
let icoCronUtilsChecked = false;
async function getIcoCronUtils() {
    if (!icoCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ico/utils/cron');
        if (mod !== undefined) {
            icoCronUtils = mod;
            icoCronUtilsChecked = true;
        }
    }
    return icoCronUtils;
}
let stakingCronUtils = null;
let stakingCronUtilsChecked = false;
async function getStakingCronUtils() {
    if (!stakingCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/staking/utils/cron');
        if (mod !== undefined) {
            stakingCronUtils = mod;
            stakingCronUtilsChecked = true;
        }
    }
    return stakingCronUtils;
}
let stakingSettingsUtils = null;
let stakingSettingsUtilsChecked = false;
async function getStakingSettingsUtils() {
    if (!stakingSettingsUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/staking/utils/settings');
        if (mod !== undefined) {
            stakingSettingsUtils = mod;
            stakingSettingsUtilsChecked = true;
        }
    }
    return stakingSettingsUtils;
}
let stakingRealCronUtils = null;
let stakingRealCronUtilsChecked = false;
async function getStakingRealCronUtils() {
    if (!stakingRealCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/staking/utils/real/cron');
        if (mod !== undefined) {
            stakingRealCronUtils = mod;
            stakingRealCronUtilsChecked = true;
        }
    }
    return stakingRealCronUtils;
}
let ecosystemProviderUtils = null;
let ecosystemProviderUtilsChecked = false;
async function getEcosystemProviderUtils() {
    if (!ecosystemProviderUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/provider');
        if (mod !== undefined) {
            ecosystemProviderUtils = mod;
            ecosystemProviderUtilsChecked = true;
        }
    }
    return ecosystemProviderUtils;
}
let aiInvestmentCronUtils = null;
let aiInvestmentCronUtilsChecked = false;
async function getAiInvestmentCronUtils() {
    if (!aiInvestmentCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ai/investment/utils/cron');
        if (mod !== undefined) {
            aiInvestmentCronUtils = mod;
            aiInvestmentCronUtilsChecked = true;
        }
    }
    return aiInvestmentCronUtils;
}
let aiSupportCronUtils = null;
let aiSupportCronUtilsChecked = false;
async function getAiSupportCronUtils() {
    if (!aiSupportCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ai/support/utils/cron');
        if (mod !== undefined) {
            aiSupportCronUtils = mod;
            aiSupportCronUtilsChecked = true;
        }
    }
    return aiSupportCronUtils;
}
let aiMarketMakerCronUtils = null;
let aiMarketMakerCronUtilsChecked = false;
async function getAiMarketMakerCronUtils() {
    if (!aiMarketMakerCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/admin/ai/market-maker/utils/cron');
        if (mod !== undefined) {
            aiMarketMakerCronUtils = mod;
            aiMarketMakerCronUtilsChecked = true;
        }
    }
    return aiMarketMakerCronUtils;
}
let binaryAiEngineCronUtils = null;
let binaryAiEngineCronUtilsChecked = false;
async function getBinaryAiEngineCronUtils() {
    if (!binaryAiEngineCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/admin/ai/binary-engine/utils/cron');
        if (mod !== undefined) {
            binaryAiEngineCronUtils = mod;
            binaryAiEngineCronUtilsChecked = true;
        }
    }
    return binaryAiEngineCronUtils;
}
async function getBinaryAiSettlementPrice(order, realClosePrice) {
    try {
        const mod = await getBinaryAiEngineCronUtils();
        if (!mod || !mod.getBinaryAiSettlementPrice)
            return realClosePrice;
        const price = await mod.getBinaryAiSettlementPrice(order, realClosePrice);
        return typeof price === "number" && Number.isFinite(price) && price > 0
            ? price
            : realClosePrice;
    }
    catch (_a) {
        return realClosePrice;
    }
}
async function getBinaryAiMaxOrderExposure(symbol) {
    try {
        const mod = await getBinaryAiEngineCronUtils();
        if (!mod || !mod.getBinaryAiMaxOrderExposure)
            return null;
        const limit = await mod.getBinaryAiMaxOrderExposure(symbol);
        return typeof limit === "number" && Number.isFinite(limit) && limit > 0
            ? limit
            : null;
    }
    catch (_a) {
        return null;
    }
}
async function triggerBinaryAiReconcile(order) {
    try {
        const mod = await getBinaryAiEngineCronUtils();
        if (!mod || !mod.reconcileBinaryAiSettlement)
            return;
        mod.reconcileBinaryAiSettlement(order).catch((error) => {
            console.error("[BINARY_AI_ENGINE] Failed to reconcile settlement:", error);
        });
    }
    catch (error) {
        console.error("[BINARY_AI_ENGINE] Failed to trigger reconciliation:", error);
    }
}
let ecosystemCronUtils = null;
let ecosystemCronUtilsChecked = false;
async function getEcosystemCronUtils() {
    if (!ecosystemCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/cron');
        if (mod !== undefined) {
            ecosystemCronUtils = mod;
            ecosystemCronUtilsChecked = true;
        }
    }
    return ecosystemCronUtils;
}
let p2pCronUtils = null;
let p2pCronUtilsChecked = false;
async function getP2pCronUtils() {
    if (!p2pCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/p2p/utils/cron');
        if (mod !== undefined) {
            p2pCronUtils = mod;
            p2pCronUtilsChecked = true;
        }
    }
    return p2pCronUtils;
}
let nftCronUtils = null;
let nftCronUtilsChecked = false;
async function getNftCronUtils() {
    if (!nftCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/nft/utils/cron');
        if (mod !== undefined) {
            nftCronUtils = mod;
            nftCronUtilsChecked = true;
        }
    }
    return nftCronUtils;
}
let gatewayCronUtils = null;
let gatewayCronUtilsChecked = false;
async function getGatewayCronUtils() {
    if (!gatewayCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/gateway/utils/cron');
        if (mod !== undefined) {
            gatewayCronUtils = mod;
            gatewayCronUtilsChecked = true;
        }
    }
    return gatewayCronUtils;
}
let futuresCronUtils = null;
let futuresCronUtilsChecked = false;
async function getFuturesCronUtils() {
    if (!futuresCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/futures/utils/reconciler');
        if (mod !== undefined) {
            futuresCronUtils = mod;
            futuresCronUtilsChecked = true;
        }
    }
    return futuresCronUtils;
}
let futuresFundingUtils = null;
let futuresFundingUtilsChecked = false;
async function getFuturesFundingUtils() {
    if (!futuresFundingUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/futures/utils/funding-settlement');
        if (mod !== undefined) {
            futuresFundingUtils = mod;
            futuresFundingUtilsChecked = true;
        }
    }
    return futuresFundingUtils;
}
let futuresFeeReversalUtils = null;
let futuresFeeReversalUtilsChecked = false;
async function getFuturesFeeReversalUtils() {
    if (!futuresFeeReversalUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/futures/utils/fee-reversal');
        if (mod !== undefined) {
            futuresFeeReversalUtils = mod;
            futuresFeeReversalUtilsChecked = true;
        }
    }
    return futuresFeeReversalUtils;
}
let copyTradingCronUtils = null;
let copyTradingCronUtilsChecked = false;
async function getCopyTradingCronUtils() {
    if (!copyTradingCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/copy-trading/utils/cron');
        if (mod !== undefined) {
            copyTradingCronUtils = mod;
            copyTradingCronUtilsChecked = true;
        }
    }
    return copyTradingCronUtils;
}
let copyTradingQueueUtils = null;
let copyTradingQueueUtilsChecked = false;
async function getCopyTradingQueueUtils() {
    if (!copyTradingQueueUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/copy-trading/utils/copyQueue');
        if (mod !== undefined) {
            copyTradingQueueUtils = mod;
            copyTradingQueueUtilsChecked = true;
        }
    }
    return copyTradingQueueUtils;
}
let tradingBotCronUtils = null;
let tradingBotCronUtilsChecked = false;
async function getTradingBotCronUtils() {
    if (!tradingBotCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/trading-bot/utils/cron');
        if (mod !== undefined) {
            tradingBotCronUtils = mod;
            tradingBotCronUtilsChecked = true;
        }
    }
    return tradingBotCronUtils;
}
let affiliateUtils = null;
let affiliateUtilsChecked = false;
async function getAffiliateUtils() {
    if (!affiliateUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/affiliate/utils');
        if (mod !== undefined) {
            affiliateUtils = mod;
            affiliateUtilsChecked = true;
        }
    }
    return affiliateUtils;
}
let affiliateCronUtils = null;
let affiliateCronUtilsChecked = false;
async function getAffiliateCronUtils() {
    if (!affiliateCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/admin/affiliate/utils/cron');
        if (mod !== undefined) {
            affiliateCronUtils = mod;
            affiliateCronUtilsChecked = true;
        }
    }
    return affiliateCronUtils;
}
let scyllaClientUtils = null;
let scyllaClientUtilsChecked = false;
async function getScyllaClientUtils() {
    if (!scyllaClientUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/ecosystem/utils/scylla/client');
        if (mod !== undefined) {
            scyllaClientUtils = mod;
            scyllaClientUtilsChecked = true;
        }
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
    if (!((_a = m === null || m === void 0 ? void 0 : m.MatchingEngine) === null || _a === void 0 ? void 0 : _a.getInstance))
        return null;
    const engine = await m.MatchingEngine.getInstance();
    await armAiMarketMakerSupervisor(engine);
    await armTradingBotSupervisor(engine);
    return engine;
}
async function armAiMarketMakerSupervisor(engine) {
    var _a, _b;
    try {
        const { isEcosystemDoor } = await Promise.resolve().then(() => __importStar(require("@b/utils/engine-lease")));
        if (!((_a = engine === null || engine === void 0 ? void 0 : engine.isEngineLeader) === null || _a === void 0 ? void 0 : _a.call(engine)) && !isEcosystemDoor())
            return;
        if (!worker_threads_1.isMainThread)
            return;
        const { isCronDelegated } = await Promise.resolve().then(() => __importStar(require("@b/cron/mode")));
        if (!isCronDelegated())
            return;
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const extensions = await CacheManager.getInstance().getExtensions();
        if (!extensions.has("ai_market_maker"))
            return;
        const m = await getAiMarketMakerCronUtils();
        (_b = m === null || m === void 0 ? void 0 : m.startAiMarketMakerSupervisor) === null || _b === void 0 ? void 0 : _b.call(m);
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Could not start the AI market maker supervisor on the matching leaseholder. " +
            "Market making will not run in this deployment until this process is restarted.", error);
    }
}
async function stopAiMarketMakerOnStandDown() {
    var _a;
    try {
        const m = await getAiMarketMakerCronUtils();
        await ((_a = m === null || m === void 0 ? void 0 : m.stopAiMarketMakerSupervisor) === null || _a === void 0 ? void 0 : _a.call(m));
    }
    catch (error) {
        console_1.logger.error("AI_MM", "Failed to stop the AI market maker after the ecosystem matching lease was lost", error);
    }
}
async function armTradingBotSupervisor(engine) {
    var _a, _b;
    try {
        if (!((_a = engine === null || engine === void 0 ? void 0 : engine.isEngineLeader) === null || _a === void 0 ? void 0 : _a.call(engine)))
            return;
        if (!worker_threads_1.isMainThread)
            return;
        const { isCronDelegated } = await Promise.resolve().then(() => __importStar(require("@b/cron/mode")));
        if (!isCronDelegated())
            return;
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const extensions = await CacheManager.getInstance().getExtensions();
        if (!extensions.has("trading_bot"))
            return;
        const m = await getTradingBotCronUtils();
        (_b = m === null || m === void 0 ? void 0 : m.startTradingBotSupervisor) === null || _b === void 0 ? void 0 : _b.call(m);
    }
    catch (error) {
        console_1.logger.error("TRADING_BOT_CRON", "Could not start the trading bot supervisor on the matching leaseholder. " +
            "Live bots will not place orders in this deployment until this process is restarted.", error);
    }
}
async function stopTradingBotOnStandDown() {
    var _a;
    try {
        const m = await getTradingBotCronUtils();
        await ((_a = m === null || m === void 0 ? void 0 : m.stopTradingBotSupervisor) === null || _a === void 0 ? void 0 : _a.call(m));
    }
    catch (error) {
        console_1.logger.error("TRADING_BOT_CRON", "Failed to stop the trading bot engine after the ecosystem matching lease was lost", error);
    }
}
let futuresEngineModule = null;
let futuresEngineChecked = false;
async function getFuturesEngineModule() {
    if (!futuresEngineChecked) {
        const mod = await safeImportModule('@b/api/(ext)/futures/utils/matchingEngine');
        if (mod !== undefined) {
            futuresEngineModule = mod;
            futuresEngineChecked = true;
        }
    }
    return futuresEngineModule;
}
async function initializeFuturesEngine() {
    var _a;
    await initializeScylla();
    const m = await getFuturesEngineModule();
    if (!((_a = m === null || m === void 0 ? void 0 : m.FuturesMatchingEngine) === null || _a === void 0 ? void 0 : _a.getInstance))
        return null;
    return m.FuturesMatchingEngine.getInstance();
}
let fxTickEngineModule = null;
let fxTickEngineChecked = false;
let fxTradingCronUtils = null;
let fxTradingCronUtilsChecked = false;
async function getFxTradingCronUtils() {
    if (!fxTradingCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/forex-trading/utils/cron');
        if (mod !== undefined) {
            fxTradingCronUtils = mod;
            fxTradingCronUtilsChecked = true;
        }
    }
    return fxTradingCronUtils;
}
let dexCronUtils = null;
let dexCronUtilsChecked = false;
async function getDexCronUtils() {
    if (!dexCronUtilsChecked) {
        const mod = await safeImportModule('@b/api/(ext)/dex/utils/cron');
        if (mod !== undefined) {
            dexCronUtils = mod;
            dexCronUtilsChecked = true;
        }
    }
    return dexCronUtils;
}
async function initializeDexConfirmations() {
    const mod = await safeImportModule('@b/api/(ext)/dex/utils/confirmations');
    if (typeof (mod === null || mod === void 0 ? void 0 : mod.armDexConfirmationPoller) === 'function') {
        await mod.armDexConfirmationPoller();
    }
}
async function initializeDexPoolIndexer() {
    const mod = await safeImportModule('@b/api/(ext)/dex/utils/pool-indexer');
    if (typeof (mod === null || mod === void 0 ? void 0 : mod.startDexPoolIndexer) === 'function') {
        await mod.startDexPoolIndexer();
    }
}
async function getFxTickEngineModule() {
    if (!fxTickEngineChecked) {
        const mod = await safeImportModule('@b/api/(ext)/forex-trading/utils/engine/tick-engine');
        if (mod !== undefined) {
            fxTickEngineModule = mod;
            fxTickEngineChecked = true;
        }
    }
    return fxTickEngineModule;
}
async function initializeFxTickEngine() {
    var _a, _b, _c, _d;
    const m = await getFxTickEngineModule();
    if ((_a = m === null || m === void 0 ? void 0 : m.FxTickEngine) === null || _a === void 0 ? void 0 : _a.instance) {
        const { ENGINE_LEASE_KEYS, getEngineLease, noteEngineRunsElsewhere } = await Promise.resolve().then(() => __importStar(require("./engine-lease")));
        const lease = getEngineLease({
            key: ENGINE_LEASE_KEYS.FOREX_TRADING,
            subsystem: "FX",
            label: "forex trading engine",
            unarbitratedConsequence: "Two desks would attach two venue event streams and reconcile the same fills, evaluate " +
                "stop-out twice on the same accounts, and double the market-data draw against a shared " +
                "provider-ban key.",
        });
        const { isCronDelegated, isCronOnlyProcess } = await Promise.resolve().then(() => __importStar(require("@b/cron/mode")));
        if (!(await lease.acquire())) {
            noteEngineRunsElsewhere("FX", "Forex trading engines not started: another process holds the forex-trading lease. " +
                "This process serves forex data from the database only — no quote stream, no risk " +
                "engine, no external execution, no reconciler.", "warn");
            if (isCronOnlyProcess()) {
                m.FxTickEngine.instance.startQuoteMirrorFollower();
            }
            return null;
        }
        await m.FxTickEngine.instance.start();
        if (isCronDelegated()) {
            m.FxTickEngine.instance.startQuoteMirrorPublisher();
        }
        const risk = await safeImportModule('@b/api/(ext)/forex-trading/utils/engine/risk-factory');
        const riskEngine = (_b = risk === null || risk === void 0 ? void 0 : risk.initializeFxRiskEngine) === null || _b === void 0 ? void 0 : _b.call(risk);
        try {
            await ((_c = riskEngine === null || riskEngine === void 0 ? void 0 : riskEngine.primeOpenSymbols) === null || _c === void 0 ? void 0 : _c.call(riskEngine));
        }
        catch (_e) {
        }
        const externalEngine = await safeImportModule('@b/api/(ext)/forex-trading/utils/engine/external-engine-factory');
        const fxReconciler = await safeImportModule('@b/api/(ext)/forex-trading/utils/engine/reconciler');
        void (async () => {
            var _a, _b;
            await ((_a = externalEngine === null || externalEngine === void 0 ? void 0 : externalEngine.bootFxExternalEngine) === null || _a === void 0 ? void 0 : _a.call(externalEngine));
            await ((_b = fxReconciler === null || fxReconciler === void 0 ? void 0 : fxReconciler.bootFxExecutionReconciler) === null || _b === void 0 ? void 0 : _b.call(fxReconciler));
            await armFxVenueSupervisor();
        })();
        const fxNotify = await safeImportModule('@b/api/(ext)/forex-trading/utils/notify');
        void ((_d = fxNotify === null || fxNotify === void 0 ? void 0 : fxNotify.ensureFxTradingTemplates) === null || _d === void 0 ? void 0 : _d.call(fxNotify));
        return m.FxTickEngine.instance;
    }
    return null;
}
let fxVenueTimers = [];
const FX_VENUE_INTERVAL_MS = 60000;
async function armFxVenueSupervisor() {
    try {
        const { isCronDelegated } = await Promise.resolve().then(() => __importStar(require("@b/cron/mode")));
        if (!isCronDelegated())
            return;
        if (fxVenueTimers.length)
            return;
        const reconciler = await safeImportModule("@b/api/(ext)/forex-trading/utils/engine/reconciler");
        const hedge = await safeImportModule("@b/api/(ext)/forex-trading/utils/engine/hedge-monitor");
        const arm = (label, run) => {
            var _a;
            if (typeof run !== "function")
                return;
            const timer = setInterval(() => {
                void Promise.resolve()
                    .then(run)
                    .catch((error) => console_1.logger.error("FX", `${label} failed`, error));
            }, FX_VENUE_INTERVAL_MS);
            (_a = timer.unref) === null || _a === void 0 ? void 0 : _a.call(timer);
            fxVenueTimers.push(timer);
        };
        arm("fx execution reconciler", reconciler === null || reconciler === void 0 ? void 0 : reconciler.runFxExecutionReconciler);
        arm("fx hedge monitor", hedge === null || hedge === void 0 ? void 0 : hedge.runFxHedgeMonitor);
        if (fxVenueTimers.length) {
            console_1.logger.debug("FX", `Driving ${fxVenueTimers.length} venue job(s) from this process every ` +
                `${FX_VENUE_INTERVAL_MS / 1000}s: this realm holds the forex-trading lease and the ` +
                `scheduler is a separate process, which refuses them.`);
        }
    }
    catch (error) {
        console_1.logger.error("FX", "Could not arm the forex venue supervisor", error);
    }
}
let dexSetupModule = null;
let dexSetupModuleChecked = false;
async function getDexSetupModule() {
    if (!dexSetupModuleChecked) {
        const mod = await safeImportModule('@b/api/(ext)/dex/utils/setup');
        if (mod !== undefined) {
            dexSetupModule = mod;
            dexSetupModuleChecked = true;
        }
    }
    return dexSetupModule;
}
async function initializeDex() {
    const m = await getDexSetupModule();
    if (typeof (m === null || m === void 0 ? void 0 : m.setupDex) !== "function")
        return;
    await m.setupDex();
}
