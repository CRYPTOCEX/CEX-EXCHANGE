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
exports.mapChainNameToChainId = mapChainNameToChainId;
const ccxt = __importStar(require("ccxt"));
const https_1 = require("https");
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const system_1 = require("./system");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/exchange/utils");
const httpsAgentIPv4 = new https_1.Agent({
    family: 4,
    keepAlive: true,
    timeout: 30000,
});
function createProxyAgent(proxyUrl) {
    try {
        const url = new URL(proxyUrl);
        const protocol = url.protocol.toLowerCase();
        if (protocol === "socks4:" || protocol === "socks5:" || protocol === "socks:") {
            return new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
        }
        else if (protocol === "http:" || protocol === "https:") {
            return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        }
        else {
            console_1.logger.warn("EXCHANGE", `Unknown proxy protocol: ${protocol}, using HTTPS proxy agent`);
            return new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        }
    }
    catch (error) {
        console_1.logger.error("EXCHANGE", `Invalid proxy URL: ${proxyUrl}`, error);
        return null;
    }
}
class ExchangeManager {
    constructor() {
        this.exchangeCache = new Map();
        this.initializationPromises = new Map();
        this.provider = null;
        this.exchange = null;
        this.exchangeProvider = null;
        this.lastAttemptTime = null;
        this.attemptCount = 0;
        this.isInitializing = false;
        this.initializationQueue = [];
    }
    async fetchActiveProvider() {
        try {
            const provider = await db_1.models.exchange.findOne({
                where: {
                    status: true,
                },
            });
            if (!provider) {
                return null;
            }
            return {
                name: provider.name,
                proxyUrl: provider.proxyUrl || undefined,
            };
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to fetch active provider", error);
            return null;
        }
    }
    async fetchProviderProxyUrl(providerName) {
        try {
            const provider = await db_1.models.exchange.findOne({
                where: {
                    name: providerName,
                },
            });
            return (provider === null || provider === void 0 ? void 0 : provider.proxyUrl) || null;
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to fetch provider proxy URL", error);
            return null;
        }
    }
    async initializeExchange(provider, retries = 3, ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Checking ban status for ${provider}`);
        if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)())) {
            return null;
        }
        if (this.exchangeCache.has(provider)) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Using cached exchange instance for ${provider}`);
            return this.exchangeCache.get(provider);
        }
        const now = Date.now();
        if (this.attemptCount >= 3 &&
            this.lastAttemptTime &&
            now - this.lastAttemptTime < 30 * 60 * 1000) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Rate limit reached for ${provider}, waiting...`);
            return null;
        }
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `Loading API credentials for ${provider}`);
        const apiKey = process.env[`APP_${provider.toUpperCase()}_API_KEY`];
        const apiSecret = process.env[`APP_${provider.toUpperCase()}_API_SECRET`];
        const apiPassphrase = process.env[`APP_${provider.toUpperCase()}_API_PASSPHRASE`];
        if (!apiKey || !apiSecret || apiKey === "" || apiSecret === "") {
            console_1.logger.error("EXCHANGE", `API credentials for ${provider} are missing.`, new Error(`API credentials for ${provider} are missing.`));
            this.attemptCount += 1;
            this.lastAttemptTime = now;
            return null;
        }
        const proxyUrl = await this.fetchProviderProxyUrl(provider);
        const agent = proxyUrl ? createProxyAgent(proxyUrl) : httpsAgentIPv4;
        if (proxyUrl) {
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Using proxy for ${provider}: ${proxyUrl.replace(/\/\/.*@/, "//***@")}`);
            console_1.logger.info("EXCHANGE", `Using proxy for ${provider}`);
        }
        try {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, `Creating exchange instance for ${provider}`);
            let exchange = new ccxt.pro[provider]({
                apiKey,
                secret: apiSecret,
                password: apiPassphrase,
                agent,
                timeout: 30000,
                enableRateLimit: true,
                options: {
                    adjustForTimeDifference: true,
                    recvWindow: 60000,
                },
            });
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, `Validating credentials for ${provider}`);
            const credentialsValid = await exchange.checkRequiredCredentials();
            if (!credentialsValid) {
                console_1.logger.error("EXCHANGE", `API credentials for ${provider} are invalid.`, new Error(`API credentials for ${provider} are invalid.`));
                await exchange.close();
                exchange = new ccxt.pro[provider]({
                    agent,
                    timeout: 30000,
                    enableRateLimit: true,
                });
            }
            await this.syncExchangeTime(exchange, ctx);
            try {
                (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, `Loading markets for ${provider}`);
                await exchange.loadMarkets();
            }
            catch (error) {
                if (this.isRateLimitError(error)) {
                    (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Rate limit error detected for ${provider}, retrying...`);
                    await this.handleRateLimitError(provider, ctx);
                    return this.initializeExchange(provider, retries, ctx);
                }
                else if (this.isTimestampError(error) && retries > 0) {
                    (_k = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _k === void 0 ? void 0 : _k.call(ctx, `Timestamp error detected for ${provider}, creating fresh instance with time sync...`);
                    console_1.logger.info("EXCHANGE", `Timestamp error for ${provider}, recreating exchange with fresh time sync (this is expected and being handled)`);
                    try {
                        await exchange.close();
                    }
                    catch (closeError) {
                    }
                    await (0, system_1.sleep)(1000);
                    const freshExchange = new ccxt.pro[provider]({
                        apiKey,
                        secret: apiSecret,
                        password: apiPassphrase,
                        agent,
                        timeout: 30000,
                        enableRateLimit: true,
                        options: {
                            adjustForTimeDifference: true,
                            recvWindow: 60000,
                        },
                    });
                    const syncSuccess = await this.syncExchangeTime(freshExchange, ctx);
                    if (!syncSuccess) {
                        (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, `Time sync failed, trying manual offset adjustment...`);
                        freshExchange.timeDifference = -1000;
                    }
                    try {
                        (_m = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _m === void 0 ? void 0 : _m.call(ctx, `Retrying loadMarkets with fresh exchange instance...`);
                        await freshExchange.loadMarkets();
                        this.exchangeCache.set(provider, freshExchange);
                        this.attemptCount = 0;
                        this.lastAttemptTime = null;
                        (_o = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _o === void 0 ? void 0 : _o.call(ctx, `Exchange ${provider} initialized successfully after time sync retry`);
                        return freshExchange;
                    }
                    catch (retryError) {
                        try {
                            await freshExchange.close();
                        }
                        catch (closeErr) {
                        }
                        if (retries > 1) {
                            (_p = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _p === void 0 ? void 0 : _p.call(ctx, `Retry failed, attempting again (${retries - 1} retries left)...`);
                            await (0, system_1.sleep)(2000);
                            return this.initializeExchange(provider, retries - 1, ctx);
                        }
                        throw retryError;
                    }
                }
                else {
                    console_1.logger.error("EXCHANGE", `Failed to load markets: ${error.message}`, new Error(`Failed to load markets: ${error.message}`));
                    await exchange.close();
                    exchange = new ccxt.pro[provider]({
                        agent,
                        timeout: 30000,
                        enableRateLimit: true,
                    });
                }
            }
            this.exchangeCache.set(provider, exchange);
            this.attemptCount = 0;
            this.lastAttemptTime = null;
            (_q = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _q === void 0 ? void 0 : _q.call(ctx, `Exchange ${provider} initialized successfully`);
            return exchange;
        }
        catch (error) {
            console_1.logger.error("EXCHANGE", "Failed to initialize exchange", error);
            this.attemptCount += 1;
            this.lastAttemptTime = now;
            if (retries > 0 &&
                (this.attemptCount < 3 || now - this.lastAttemptTime >= 30 * 60 * 1000)) {
                (_r = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _r === void 0 ? void 0 : _r.call(ctx, `Retrying exchange initialization for ${provider} (${retries} retries left)`);
                await (0, system_1.sleep)(5000);
                return this.initializeExchange(provider, retries - 1, ctx);
            }
            return null;
        }
    }
    isRateLimitError(error) {
        return error instanceof ccxt.RateLimitExceeded || error.code === -1003;
    }
    isTimestampError(error) {
        var _a;
        const errorCode = error.code;
        const errorMessage = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        return (errorCode === -1021 ||
            errorCode === "-1021" ||
            error instanceof ccxt.InvalidNonce ||
            error.name === "InvalidNonce" ||
            errorMessage.includes("timestamp") ||
            errorMessage.includes("recvwindow") ||
            errorMessage.includes("ahead of the server") ||
            errorMessage.includes("behind the server"));
    }
    async syncExchangeTime(exchange, ctx) {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Synchronizing exchange server time...");
            const serverTime = await exchange.fetchTime();
            const localTime = Date.now();
            const offset = serverTime - localTime;
            exchange.options = exchange.options || {};
            exchange.options.adjustForTimeDifference = true;
            exchange.options.recvWindow = 60000;
            exchange.options.timeDifference = offset;
            exchange.timeDifference = offset;
            if (Math.abs(offset) > 5000) {
                (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Significant time offset detected: ${offset}ms, adjusting...`);
                console_1.logger.warn("EXCHANGE", `Significant time offset with server: ${offset}ms. Consider syncing your system clock.`);
            }
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Time synchronized. Offset: ${offset}ms`);
            console_1.logger.debug("EXCHANGE", `Time synchronized with server. Offset: ${offset}ms`);
            return true;
        }
        catch (error) {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Failed to sync time, continuing anyway");
            console_1.logger.warn("EXCHANGE", "Failed to sync exchange time", error);
            return false;
        }
    }
    async handleRateLimitError(provider, ctx) {
        var _a;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Rate limit exceeded for ${provider}, applying 1-minute ban`);
        const banTime = Date.now() + 60000;
        await (0, utils_1.saveBanStatus)(banTime);
        await (0, system_1.sleep)(60000);
    }
    async startExchange(ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Starting exchange initialization");
        if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)())) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Exchange is currently banned");
            return null;
        }
        if (this.exchange) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Using existing exchange instance");
            return this.exchange;
        }
        if (this.isInitializing) {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Exchange initialization already in progress, queuing request");
            return new Promise((resolve, reject) => {
                this.initializationQueue.push({ resolve, reject });
            });
        }
        this.isInitializing = true;
        try {
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Fetching active exchange provider");
            if (!this.provider) {
                const providerData = await this.fetchActiveProvider();
                this.provider = (providerData === null || providerData === void 0 ? void 0 : providerData.name) || null;
            }
            if (!this.provider) {
                (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "No active exchange provider found");
                this.resolveQueue(null);
                return null;
            }
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, `Active provider: ${this.provider}`);
            if (this.exchangeCache.has(this.provider)) {
                (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, `Using cached exchange for ${this.provider}`);
                this.exchange = this.exchangeCache.get(this.provider);
                this.resolveQueue(this.exchange);
                return this.exchange;
            }
            (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Initializing exchange: ${this.provider}`);
            this.exchange = await this.initializeExchange(this.provider, 3, ctx);
            this.resolveQueue(this.exchange);
            return this.exchange;
        }
        catch (error) {
            this.rejectQueue(error);
            throw error;
        }
        finally {
            this.isInitializing = false;
        }
    }
    resolveQueue(result) {
        while (this.initializationQueue.length > 0) {
            const { resolve } = this.initializationQueue.shift();
            resolve(result);
        }
    }
    rejectQueue(error) {
        while (this.initializationQueue.length > 0) {
            const { reject } = this.initializationQueue.shift();
            reject(error);
        }
    }
    async startExchangeProvider(provider, ctx) {
        var _a, _b, _c, _d;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Starting exchange provider: ${provider}`);
        if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)())) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Exchange is currently banned");
            return null;
        }
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Provider is required to start exchange provider." });
        }
        if (this.exchangeCache.has(provider)) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Using cached exchange provider: ${provider}`);
        }
        else {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, `Initializing exchange provider: ${provider}`);
        }
        this.exchangeProvider =
            this.exchangeCache.get(provider) ||
                (await this.initializeExchange(provider, 3, ctx));
        return this.exchangeProvider;
    }
    removeExchange(provider) {
        if (!provider) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Provider is required to remove exchange." });
        }
        this.exchangeCache.delete(provider);
        if (this.provider === provider) {
            this.exchange = null;
            this.provider = null;
        }
    }
    async getProvider() {
        if (!this.provider) {
            const providerData = await this.fetchActiveProvider();
            this.provider = (providerData === null || providerData === void 0 ? void 0 : providerData.name) || null;
        }
        return this.provider;
    }
    async testExchangeCredentials(provider, ctx, retryCount = 0) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Testing exchange credentials for ${provider}`);
        if (await (0, utils_1.handleBanStatus)(await (0, utils_1.loadBanStatus)())) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Exchange is currently banned");
            return {
                status: false,
                message: "Service temporarily unavailable. Please try again later.",
            };
        }
        let exchange = null;
        try {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Loading API credentials for ${provider}`);
            const apiKey = process.env[`APP_${provider.toUpperCase()}_API_KEY`];
            const apiSecret = process.env[`APP_${provider.toUpperCase()}_API_SECRET`];
            const apiPassphrase = process.env[`APP_${provider.toUpperCase()}_API_PASSPHRASE`];
            if (!apiKey || !apiSecret || apiKey === "" || apiSecret === "") {
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "API credentials are missing");
                return {
                    status: false,
                    message: "API credentials are missing from environment variables",
                };
            }
            const proxyUrl = await this.fetchProviderProxyUrl(provider);
            const agent = proxyUrl ? createProxyAgent(proxyUrl) : httpsAgentIPv4;
            if (proxyUrl) {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Using proxy for ${provider}: ${proxyUrl.replace(/\/\/.*@/, "//***@")}`);
            }
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, `Creating test exchange instance for ${provider}`);
            exchange = new ccxt.pro[provider]({
                apiKey,
                secret: apiSecret,
                password: apiPassphrase,
                agent,
                timeout: 30000,
                enableRateLimit: true,
                options: {
                    adjustForTimeDifference: true,
                    recvWindow: 60000,
                },
            });
            await this.syncExchangeTime(exchange, ctx);
            (_g = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _g === void 0 ? void 0 : _g.call(ctx, `Loading markets for ${provider}`);
            await exchange.loadMarkets();
            (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, `Fetching balance to verify credentials for ${provider}`);
            const balance = await exchange.fetchBalance();
            (_j = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _j === void 0 ? void 0 : _j.call(ctx, `Closing test connection for ${provider}`);
            await exchange.close();
            if (balance && typeof balance === 'object') {
                (_k = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _k === void 0 ? void 0 : _k.call(ctx, `Credentials verified successfully for ${provider}`);
                return {
                    status: true,
                    message: "API credentials are valid and connection successful",
                };
            }
            else {
                (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, `Failed to verify credentials for ${provider}`);
                return {
                    status: false,
                    message: "Failed to fetch balance with the provided credentials",
                };
            }
        }
        catch (error) {
            if (exchange) {
                try {
                    await exchange.close();
                }
                catch (closeError) {
                }
            }
            if (this.isTimestampError(error) && retryCount < 2) {
                (_m = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _m === void 0 ? void 0 : _m.call(ctx, `Timestamp error detected, retrying with time sync (attempt ${retryCount + 1}/2)...`);
                console_1.logger.info("EXCHANGE", `Timestamp error for ${provider}, retrying with time sync (attempt ${retryCount + 1}/2)`);
                await (0, system_1.sleep)(1000);
                return this.testExchangeCredentials(provider, ctx, retryCount + 1);
            }
            console_1.logger.error("EXCHANGE", "Failed to test exchange credentials", error);
            if (error.name === 'AuthenticationError') {
                (_o = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _o === void 0 ? void 0 : _o.call(ctx, `Authentication error for ${provider}`);
                return {
                    status: false,
                    message: "Invalid API credentials. Please check your API key and secret.",
                };
            }
            else if (error.name === 'NetworkError' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
                (_p = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _p === void 0 ? void 0 : _p.call(ctx, `Network error for ${provider}`);
                return {
                    status: false,
                    message: "Network error. Please check your internet connection and try again.",
                };
            }
            else if (error.name === 'ExchangeNotAvailable') {
                (_q = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _q === void 0 ? void 0 : _q.call(ctx, `Exchange not available: ${provider}`);
                const errorMessage = error.message || '';
                if (errorMessage.includes('451') || errorMessage.includes('restricted location') || errorMessage.includes('Eligibility')) {
                    return {
                        status: false,
                        message: "Access denied: Your server's location is blocked by this exchange. Please configure a proxy in the Settings tab to connect through an allowed region.",
                    };
                }
                return {
                    status: false,
                    message: "Exchange service is temporarily unavailable. Please try again later.",
                };
            }
            else if (error.name === 'RateLimitExceeded') {
                (_r = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _r === void 0 ? void 0 : _r.call(ctx, `Rate limit exceeded for ${provider}`);
                return {
                    status: false,
                    message: "Rate limit exceeded. Please wait a moment and try again.",
                };
            }
            else if (error.name === 'PermissionDenied') {
                (_s = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _s === void 0 ? void 0 : _s.call(ctx, `Permission denied for ${provider}`);
                return {
                    status: false,
                    message: "Insufficient API permissions. Please check your API key permissions.",
                };
            }
            else if (this.isTimestampError(error)) {
                (_t = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _t === void 0 ? void 0 : _t.call(ctx, `Timestamp synchronization failed for ${provider}`);
                return {
                    status: false,
                    message: "Server time synchronization failed. Please ensure your system clock is accurate and try again.",
                };
            }
            else {
                (_u = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _u === void 0 ? void 0 : _u.call(ctx, `Connection failed for ${provider}: ${error.message}`);
                return {
                    status: false,
                    message: `Connection failed: ${error.message || 'Unknown error occurred'}`,
                };
            }
        }
    }
    async stopExchange() {
        if (this.exchange) {
            await this.exchange.close();
            this.exchange = null;
        }
    }
}
ExchangeManager.instance = new ExchangeManager();
exports.default = ExchangeManager.instance;
function mapChainNameToChainId(chainName) {
    const chainMap = {
        BEP20: "bsc",
        BEP2: "bnb",
        ERC20: "eth",
        TRC20: "trx",
        "KAVA EVM CO-CHAIN": "kavaevm",
        "LIGHTNING NETWORK": "lightning",
        "BTC-SEGWIT": "btc",
        "ASSET HUB(POLKADOT)": "polkadot",
    };
    return chainMap[chainName] || chainName;
}
