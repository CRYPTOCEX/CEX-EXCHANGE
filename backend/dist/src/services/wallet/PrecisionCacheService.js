"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrecisionCacheService = exports.precisionCacheService = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
class PrecisionCacheService {
    constructor() {
        this.fiatPrecisions = {};
        this.spotPrecisions = {};
        this.ecoPrecisions = {};
        this.initialized = false;
        this.initializing = null;
        this.DEFAULT_FIAT_PRECISION = 2;
        this.DEFAULT_SPOT_PRECISION = 8;
        this.DEFAULT_ECO_PRECISION = 8;
        this.DEFAULT_ECO_DECIMALS = 18;
    }
    static getInstance() {
        if (!PrecisionCacheService.instance) {
            PrecisionCacheService.instance = new PrecisionCacheService();
        }
        return PrecisionCacheService.instance;
    }
    async initialize() {
        if (this.initialized)
            return;
        if (this.initializing) {
            return this.initializing;
        }
        this.initializing = this._doInitialize();
        await this.initializing;
        this.initializing = null;
    }
    async _doInitialize() {
        try {
            await Promise.all([
                this.loadFiatPrecisions(),
                this.loadSpotPrecisions(),
                this.loadEcoPrecisions(),
            ]);
            this.initialized = true;
            console_1.logger.success("PRECISION_CACHE", "Precision cache initialized successfully");
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", "Failed to initialize precision cache", error);
        }
    }
    async loadFiatPrecisions() {
        try {
            const currencies = await db_1.models.currency.findAll({
                attributes: ["symbol", "precision"],
                where: { status: true },
            });
            const now = new Date();
            this.fiatPrecisions = {};
            for (const currency of currencies) {
                this.fiatPrecisions[currency.symbol.toUpperCase()] = {
                    precision: currency.precision,
                    lastUpdated: now,
                };
            }
            console_1.logger.debug("PRECISION_CACHE", `Loaded ${currencies.length} FIAT precisions`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", "Failed to load FIAT precisions", error);
        }
    }
    async loadSpotPrecisions() {
        try {
            const currencies = await db_1.models.exchangeCurrency.findAll({
                attributes: ["currency", "precision"],
                where: { status: true },
            });
            const now = new Date();
            this.spotPrecisions = {};
            for (const currency of currencies) {
                this.spotPrecisions[currency.currency.toUpperCase()] = {
                    precision: currency.precision,
                    lastUpdated: now,
                };
            }
            console_1.logger.debug("PRECISION_CACHE", `Loaded ${currencies.length} SPOT precisions`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", "Failed to load SPOT precisions", error);
        }
    }
    async loadEcoPrecisions() {
        var _a, _b;
        try {
            const tokens = await db_1.models.ecosystemToken.findAll({
                attributes: ["currency", "chain", "precision", "decimals"],
                where: { status: true },
            });
            const now = new Date();
            this.ecoPrecisions = {};
            for (const token of tokens) {
                const currency = token.currency.toUpperCase();
                const chain = token.chain.toUpperCase();
                if (!this.ecoPrecisions[currency]) {
                    this.ecoPrecisions[currency] = {};
                }
                this.ecoPrecisions[currency][chain] = {
                    precision: (_a = token.precision) !== null && _a !== void 0 ? _a : this.DEFAULT_ECO_PRECISION,
                    decimals: (_b = token.decimals) !== null && _b !== void 0 ? _b : this.DEFAULT_ECO_DECIMALS,
                    lastUpdated: now,
                };
            }
            console_1.logger.debug("PRECISION_CACHE", `Loaded ${tokens.length} ECO token precisions`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", "Failed to load ECO precisions", error);
        }
    }
    async getPrecision(walletType, currency, chain) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!this.initialized) {
            await this.initialize();
        }
        const upperCurrency = currency.toUpperCase();
        switch (walletType) {
            case "FIAT":
                return (_b = (_a = this.fiatPrecisions[upperCurrency]) === null || _a === void 0 ? void 0 : _a.precision) !== null && _b !== void 0 ? _b : this.DEFAULT_FIAT_PRECISION;
            case "SPOT":
                return (_d = (_c = this.spotPrecisions[upperCurrency]) === null || _c === void 0 ? void 0 : _c.precision) !== null && _d !== void 0 ? _d : this.DEFAULT_SPOT_PRECISION;
            case "ECO":
            case "FUTURES":
            case "COPY_TRADING":
                if (chain) {
                    const upperChain = chain.toUpperCase();
                    return ((_g = (_f = (_e = this.ecoPrecisions[upperCurrency]) === null || _e === void 0 ? void 0 : _e[upperChain]) === null || _f === void 0 ? void 0 : _f.precision) !== null && _g !== void 0 ? _g : this.DEFAULT_ECO_PRECISION);
                }
                const chains = this.ecoPrecisions[upperCurrency];
                if (chains) {
                    const firstChain = Object.keys(chains)[0];
                    return (_j = (_h = chains[firstChain]) === null || _h === void 0 ? void 0 : _h.precision) !== null && _j !== void 0 ? _j : this.DEFAULT_ECO_PRECISION;
                }
                return this.DEFAULT_ECO_PRECISION;
            default:
                return this.DEFAULT_SPOT_PRECISION;
        }
    }
    async getDecimals(currency, chain) {
        var _a, _b, _c;
        if (!this.initialized) {
            await this.initialize();
        }
        const upperCurrency = currency.toUpperCase();
        const upperChain = chain.toUpperCase();
        return ((_c = (_b = (_a = this.ecoPrecisions[upperCurrency]) === null || _a === void 0 ? void 0 : _a[upperChain]) === null || _b === void 0 ? void 0 : _b.decimals) !== null && _c !== void 0 ? _c : this.DEFAULT_ECO_DECIMALS);
    }
    async getChainsForCurrency(currency) {
        if (!this.initialized) {
            await this.initialize();
        }
        const chains = this.ecoPrecisions[currency.toUpperCase()];
        return chains ? Object.keys(chains) : [];
    }
    async invalidateFiatCache() {
        await this.loadFiatPrecisions();
        console_1.logger.info("PRECISION_CACHE", "FIAT precision cache invalidated and reloaded");
    }
    async invalidateFiatCurrency(symbol) {
        try {
            const currency = await db_1.models.currency.findOne({
                attributes: ["symbol", "precision"],
                where: { symbol, status: true },
            });
            if (currency) {
                this.fiatPrecisions[symbol.toUpperCase()] = {
                    precision: currency.precision,
                    lastUpdated: new Date(),
                };
            }
            else {
                delete this.fiatPrecisions[symbol.toUpperCase()];
            }
            console_1.logger.info("PRECISION_CACHE", `FIAT currency ${symbol} cache invalidated`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", `Failed to invalidate FIAT currency ${symbol}`, error);
        }
    }
    async invalidateSpotCache() {
        await this.loadSpotPrecisions();
        console_1.logger.info("PRECISION_CACHE", "SPOT precision cache invalidated and reloaded");
    }
    async invalidateSpotCurrency(currency) {
        try {
            const exchangeCurrency = await db_1.models.exchangeCurrency.findOne({
                attributes: ["currency", "precision"],
                where: { currency, status: true },
            });
            if (exchangeCurrency) {
                this.spotPrecisions[currency.toUpperCase()] = {
                    precision: exchangeCurrency.precision,
                    lastUpdated: new Date(),
                };
            }
            else {
                delete this.spotPrecisions[currency.toUpperCase()];
            }
            console_1.logger.info("PRECISION_CACHE", `SPOT currency ${currency} cache invalidated`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", `Failed to invalidate SPOT currency ${currency}`, error);
        }
    }
    async invalidateEcoCache() {
        await this.loadEcoPrecisions();
        console_1.logger.info("PRECISION_CACHE", "ECO precision cache invalidated and reloaded");
    }
    async invalidateEcoToken(currency, chain) {
        var _a, _b;
        try {
            const token = await db_1.models.ecosystemToken.findOne({
                attributes: ["currency", "chain", "precision", "decimals"],
                where: { currency, chain, status: true },
            });
            const upperCurrency = currency.toUpperCase();
            const upperChain = chain.toUpperCase();
            if (token) {
                if (!this.ecoPrecisions[upperCurrency]) {
                    this.ecoPrecisions[upperCurrency] = {};
                }
                this.ecoPrecisions[upperCurrency][upperChain] = {
                    precision: (_a = token.precision) !== null && _a !== void 0 ? _a : this.DEFAULT_ECO_PRECISION,
                    decimals: (_b = token.decimals) !== null && _b !== void 0 ? _b : this.DEFAULT_ECO_DECIMALS,
                    lastUpdated: new Date(),
                };
            }
            else {
                if (this.ecoPrecisions[upperCurrency]) {
                    delete this.ecoPrecisions[upperCurrency][upperChain];
                    if (Object.keys(this.ecoPrecisions[upperCurrency]).length === 0) {
                        delete this.ecoPrecisions[upperCurrency];
                    }
                }
            }
            console_1.logger.info("PRECISION_CACHE", `ECO token ${currency}/${chain} cache invalidated`);
        }
        catch (error) {
            console_1.logger.error("PRECISION_CACHE", `Failed to invalidate ECO token ${currency}/${chain}`, error);
        }
    }
    async invalidateAll() {
        await Promise.all([
            this.loadFiatPrecisions(),
            this.loadSpotPrecisions(),
            this.loadEcoPrecisions(),
        ]);
        console_1.logger.info("PRECISION_CACHE", "All precision caches invalidated and reloaded");
    }
    async reinitialize() {
        this.initialized = false;
        this.fiatPrecisions = {};
        this.spotPrecisions = {};
        this.ecoPrecisions = {};
        await this.initialize();
    }
    async formatAmount(amount, walletType, currency, chain) {
        const precision = await this.getPrecision(walletType, currency, chain);
        return parseFloat(amount.toFixed(precision));
    }
    isInitialized() {
        return this.initialized;
    }
    getStats() {
        return {
            fiatCount: Object.keys(this.fiatPrecisions).length,
            spotCount: Object.keys(this.spotPrecisions).length,
            ecoCount: Object.values(this.ecoPrecisions).reduce((acc, chains) => acc + Object.keys(chains).length, 0),
            initialized: this.initialized,
        };
    }
}
exports.PrecisionCacheService = PrecisionCacheService;
exports.precisionCacheService = PrecisionCacheService.getInstance();
