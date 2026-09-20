"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
const cassandra_driver_1 = require("cassandra-driver");
const date_fns_1 = require("date-fns");
const evm_rpc_1 = require("@b/utils/evm-rpc");
const rpc_pool_1 = require("@b/utils/rpc-pool");
const lodash_1 = require("lodash");
const stripe_1 = __importDefault(require("stripe"));
const sms_1 = require("@b/services/notification/providers/sms");
const resolve_1 = require("@b/services/notification/providers/sms/resolve");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const fiat_rates_1 = require("@b/utils/fiat-rates");
const cachedResults = {};
exports.metadata = {
    summary: "Gets system details",
    operationId: "getSystemDetails",
    tags: ["Admin", "System"],
    responses: {
        200: {
            description: "System details fetched successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {},
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, admin permission required",
        },
        500: {
            description: "Internal system error",
        },
    },
    requiresAuth: true,
    parameters: [
        {
            in: "query",
            name: "service",
            schema: {
                type: "string",
            },
            description: "Service name to check",
            required: false,
        },
    ],
    permission: "access.admin",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Get System Health",
};
const getOrCheckService = async (serviceName, checkFunction) => {
    if (cachedResults[serviceName])
        return cachedResults[serviceName];
    const serviceCheck = await checkFunction();
    cachedResults[serviceName] = serviceCheck;
    return serviceCheck;
};
async function getServiceMap() {
    const baseServices = {
        email: checkEmailService,
        stripe: checkStripeService,
        transfi: checkTransfiService,
        sms: checkSmsService,
        openexchangerates: checkOpenExchangeRatesService,
        googletranslate: checkGoogleTranslateService,
        ethereum: checkEthereumService,
        bsc: checkBscService,
        polygon: checkPolygonService,
        ftm: checkFtmService,
        optimism: checkOptimismService,
        arbitrum: checkArbitrumService,
        celo: checkCeloService,
    };
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (extensions.has("ecosystem")) {
        baseServices.scylla = checkScyllaService;
    }
    return baseServices;
}
exports.default = async (data) => {
    const { query, ctx } = data;
    const { service } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking ${service} service health`);
    const serviceMap = await getServiceMap();
    const result = serviceMap[service]
        ? await getOrCheckService(service, serviceMap[service])
        : {};
    ctx === null || ctx === void 0 ? void 0 : ctx.success("System health check completed");
    return {
        [service]: result,
    };
};
async function checkEmailService() {
    if (process.env.NEXT_PUBLIC_APP_EMAIL === undefined ||
        process.env.NEXT_PUBLIC_APP_EMAIL === "")
        return {
            service: "Email",
            status: "Down",
            message: "App Email address not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    const currentTime = (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss");
    if ((0, emails_1.mailDisabled)()) {
        return {
            service: "Email",
            status: "Down",
            message: "MAIL_DISABLED is set in .env — the test message was dropped and no mail is being sent at all.",
            timestamp: currentTime,
        };
    }
    try {
        await emails_1.emailQueue.add({
            emailData: {
                TO: process.env.NEXT_PUBLIC_APP_EMAIL,
                FIRSTNAME: "test",
                TIME: currentTime,
            },
            emailType: "EmailTest",
        });
        const emailProvider = process.env.APP_EMAILER;
        return {
            service: "Email",
            status: "Up",
            message: `Test email QUEUED for ${process.env.NEXT_PUBLIC_APP_EMAIL} via ` +
                `${(0, lodash_1.capitalize)(emailProvider)}. This check does not wait for delivery — ` +
                "confirm the message actually arrived before trusting the transport.",
            timestamp: currentTime,
        };
    }
    catch (error) {
        return {
            service: "Email",
            status: "Down",
            message: error,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
}
async function checkStripeService() {
    const stripeSecretKey = process.env.APP_STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey === "") {
        return {
            service: "Stripe",
            status: "Down",
            message: "Stripe API key not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    try {
        const stripe = new stripe_1.default(stripeSecretKey);
        await stripe.balance.retrieve();
        return {
            service: "Stripe",
            status: "Up",
            message: "Stripe API key valid",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    catch (error) {
        return {
            service: "Stripe",
            status: "Down",
            message: error.message,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
}
async function checkTransfiService() {
    var _a;
    const base = {
        service: "TransFi",
        timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
    const username = process.env.APP_TRANSFI_USERNAME;
    const password = process.env.APP_TRANSFI_PASSWORD;
    const mid = process.env.APP_TRANSFI_MID;
    const missing = [
        !username && "APP_TRANSFI_USERNAME",
        !password && "APP_TRANSFI_PASSWORD",
        !mid && "APP_TRANSFI_MID",
    ].filter(Boolean);
    if (missing.length) {
        return { ...base, status: "Down", message: `Not configured: ${missing.join(", ")}` };
    }
    if (!process.env.APP_TRANSFI_WEBHOOK_SECRET) {
        return {
            ...base,
            status: "Down",
            message: "APP_TRANSFI_WEBHOOK_SECRET is not set — deposits could never be credited",
        };
    }
    const baseUrl = (process.env.APP_TRANSFI_BASE_URL || "https://sandbox-api.transfi.com").replace(/\/+$/, "");
    try {
        const res = await fetch(`${baseUrl}/v3/balance`, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`,
                MID: mid,
                Accept: "application/json",
            },
            signal: AbortSignal.timeout(10000),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && (body === null || body === void 0 ? void 0 : body.status) === "success") {
            const env = baseUrl.includes("sandbox") ? "sandbox" : "production";
            return { ...base, status: "Up", message: `Credentials valid (${env})` };
        }
        return {
            ...base,
            status: "Down",
            message: ((_a = body === null || body === void 0 ? void 0 : body.error) === null || _a === void 0 ? void 0 : _a.message) || (body === null || body === void 0 ? void 0 : body.message) || `HTTP ${res.status}`,
        };
    }
    catch (error) {
        return { ...base, status: "Down", message: (error === null || error === void 0 ? void 0 : error.message) || "Unreachable" };
    }
}
async function checkSmsService() {
    const timestamp = (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss");
    const configError = (0, resolve_1.getSmsConfigError)();
    if (configError) {
        return {
            service: "SMS",
            status: "Down",
            message: configError,
            timestamp,
        };
    }
    try {
        const provider = (0, resolve_1.resolveOtpProvider)();
        const health = await (0, sms_1.getSmsProviderFor)("AUTH_OTP").healthCheck();
        return {
            service: "SMS",
            status: health.ok ? "Up" : "Down",
            message: `[${provider}] ${health.message}`,
            timestamp,
        };
    }
    catch (error) {
        return {
            service: "SMS",
            status: "Down",
            message: (error === null || error === void 0 ? void 0 : error.message) || "SMS health check failed",
            timestamp,
        };
    }
}
async function checkOpenExchangeRatesService() {
    const timestamp = (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss");
    const { enabled, skipped } = (0, fiat_rates_1.resolveFiatRateProviders)();
    if (!enabled.length) {
        return {
            service: "Fiat Rates",
            status: "Down",
            message: `No usable fiat rate provider configured${skipped.length ? ` (skipped: ${skipped.map((s) => `${s.id} — ${s.reason}`).join("; ")})` : ""}`,
            timestamp,
        };
    }
    const probes = await Promise.all(enabled.map(async (provider) => {
        var _a;
        try {
            const response = await fetch(provider.buildUrl("USD"), {
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const payload = await response.json();
            const rates = provider.extract(payload);
            const count = rates ? Object.keys(rates).length : 0;
            if (!count)
                throw new Error("no rates in payload");
            const freshness = (0, fiat_rates_1.describeFreshness)(provider, payload);
            return {
                id: provider.id,
                ok: true,
                stale: freshness.stale,
                detail: `${count} rates${freshness.age ? `, ${freshness.age} old` : ""}${freshness.stale ? " — STALE" : ""}`,
            };
        }
        catch (error) {
            return {
                id: provider.id,
                ok: false,
                stale: false,
                detail: (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error),
            };
        }
    }));
    const up = probes.filter((p) => p.ok);
    const down = probes.filter((p) => !p.ok);
    const stale = up.filter((p) => p.stale);
    const summary = [
        ...up.map((p) => `${p.id} (${p.detail})`),
        ...down.map((p) => `${p.id} DOWN — ${p.detail}`),
    ].join("; ");
    return {
        service: "Fiat Rates",
        status: down.length === 0 && !stale.length
            ? "Up"
            : up.length
                ? "Degraded"
                : "Down",
        message: `${up.length}/${probes.length} provider(s) responding: ${summary}${skipped.length ? ` | not configured: ${skipped.map((s) => s.id).join(", ")}` : ""}`,
        timestamp,
    };
}
async function checkGoogleTranslateService() {
    const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!googleTranslateApiKey || googleTranslateApiKey === "") {
        return {
            service: "GoogleTranslate",
            status: "Down",
            message: "Google Translate API key not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}&q=Hello&target=es`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            service: "GoogleTranslate",
            status: "Up",
            message: `Translation successful: ${data.data.translations[0].translatedText}`,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    catch (error) {
        return {
            service: "GoogleTranslate",
            status: "Down",
            message: error.message,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
}
async function checkScyllaService() {
    const scyllaUsername = process.env.SCYLLA_USERNAME;
    const scyllaPassword = process.env.SCYLLA_PASSWORD;
    if (!scyllaUsername ||
        !scyllaPassword ||
        scyllaUsername === "" ||
        scyllaPassword === "") {
        return {
            service: "Scylla",
            status: "Down",
            message: "Scylla credentials not found or incomplete",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    const client = new cassandra_driver_1.Client({
        contactPoints: ["localhost"],
        localDataCenter: "datacenter1",
        credentials: { username: scyllaUsername, password: scyllaPassword },
    });
    try {
        await client.connect();
        const result = await client.execute("SELECT now() FROM system.local");
        return {
            service: "Scylla",
            status: "Up",
            message: `Scylla connection successful.`,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    catch (error) {
        return {
            service: "Scylla",
            status: "Down",
            message: error.message,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    finally {
        await client.shutdown();
    }
}
async function checkEthereumService() {
    const ethExplorerApiKey = process.env.ETH_EXPLORER_API_KEY;
    const ethNetwork = process.env.ETH_NETWORK || "mainnet";
    const ethRpcMap = {
        mainnet: process.env.ETH_MAINNET_RPC,
        goerli: process.env.ETH_GOERLI_RPC,
        sepolia: process.env.ETH_SEPOLIA_RPC,
    };
    const ethWssMap = {
        mainnet: process.env.ETH_MAINNET_RPC_WSS,
        goerli: process.env.ETH_GOERLI_RPC_WSS,
        sepolia: process.env.ETH_SEPOLIA_RPC_WSS,
    };
    if (!ethExplorerApiKey ||
        !ethRpcMap[ethNetwork] ||
        ethExplorerApiKey === "" ||
        ethRpcMap[ethNetwork] === "") {
        return {
            service: "Ethereum",
            status: "Down",
            message: "Ethereum Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("Ethereum", ethRpcMap[ethNetwork], ethWssMap[ethNetwork], ethNetwork);
}
async function checkBscService() {
    const bscExplorerApiKey = process.env.BSC_EXPLORER_API_KEY;
    const bscNetwork = process.env.BSC_NETWORK || "mainnet";
    const bscRpcMap = {
        mainnet: process.env.BSC_MAINNET_RPC,
        testnet: process.env.BSC_TESTNET_RPC,
    };
    const bscWssMap = {
        mainnet: process.env.BSC_MAINNET_RPC_WSS,
        testnet: process.env.BSC_TESTNET_RPC_WSS,
    };
    if (!bscExplorerApiKey ||
        !bscRpcMap[bscNetwork] ||
        bscExplorerApiKey === "" ||
        bscRpcMap[bscNetwork] === "") {
        return {
            service: "BSC",
            status: "Down",
            message: "BSC Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("BSC", bscRpcMap[bscNetwork], bscWssMap[bscNetwork], bscNetwork);
}
async function checkPolygonService() {
    const polygonExplorerApiKey = process.env.POLYGON_EXPLORER_API_KEY;
    const polygonNetwork = process.env.POLYGON_NETWORK || "matic";
    const polygonRpcMap = {
        matic: process.env.POLYGON_MATIC_RPC,
        "matic-mumbai": process.env.POLYGON_MATIC_MUMBAI_RPC,
    };
    const polygonWssMap = {
        matic: process.env.POLYGON_MATIC_RPC_WSS,
        "matic-mumbai": process.env.POLYGON_MATIC_MUMBAI_RPC_WSS,
    };
    if (!polygonExplorerApiKey ||
        !polygonRpcMap[polygonNetwork] ||
        polygonExplorerApiKey === "" ||
        polygonRpcMap[polygonNetwork] === "") {
        return {
            service: "Polygon",
            status: "Down",
            message: "Polygon Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("Polygon", polygonRpcMap[polygonNetwork], polygonWssMap[polygonNetwork], polygonNetwork);
}
async function checkFtmService() {
    const ftmExplorerApiKey = process.env.FTM_EXPLORER_API_KEY;
    const ftmNetwork = process.env.FTM_NETWORK || "mainnet";
    const ftmRpcMap = {
        mainnet: process.env.FTM_MAINNET_RPC,
        testnet: process.env.FTM_TESTNET_RPC,
    };
    const ftmWssMap = {
        mainnet: process.env.FTM_MAINNET_RPC_WSS,
        testnet: process.env.FTM_TESTNET_RPC_WSS,
    };
    if (!ftmExplorerApiKey ||
        !ftmRpcMap[ftmNetwork] ||
        ftmExplorerApiKey === "" ||
        ftmRpcMap[ftmNetwork] === "") {
        return {
            service: "FTM",
            status: "Down",
            message: "FTM Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("FTM", ftmRpcMap[ftmNetwork], ftmWssMap[ftmNetwork], ftmNetwork);
}
async function checkOptimismService() {
    const optimismExplorerApiKey = process.env.OPTIMISM_EXPLORER_API_KEY;
    const optimismNetwork = process.env.OPTIMISM_NETWORK || "mainnet";
    const optimismRpcMap = {
        mainnet: process.env.OPTIMISM_MAINNET_RPC,
        goerli: process.env.OPTIMISM_GOERLI_RPC,
    };
    const optimismWssMap = {
        mainnet: process.env.OPTIMISM_MAINNET_RPC_WSS,
        goerli: process.env.OPTIMISM_GOERLI_RPC_WSS,
    };
    if (!optimismExplorerApiKey ||
        !optimismRpcMap[optimismNetwork] ||
        optimismExplorerApiKey === "" ||
        optimismRpcMap[optimismNetwork] === "") {
        return {
            service: "Optimism",
            status: "Down",
            message: "Optimism Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("Optimism", optimismRpcMap[optimismNetwork], optimismWssMap[optimismNetwork], optimismNetwork);
}
async function checkArbitrumService() {
    const arbitrumExplorerApiKey = process.env.ARBITRUM_EXPLORER_API_KEY;
    const arbitrumNetwork = process.env.ARBITRUM_NETWORK || "mainnet";
    const arbitrumRpcMap = {
        mainnet: process.env.ARBITRUM_MAINNET_RPC || process.env.ARBIRUM_MAINNET_RPC,
        goerli: process.env.ARBITRUM_GOERLI_RPC,
    };
    const arbitrumWssMap = {
        mainnet: process.env.ARBITRUM_MAINNET_RPC_WSS ||
            process.env.ARBIRUM_MAINNET_RPC_WSS,
        goerli: process.env.ARBITRUM_GOERLI_RPC_WSS,
    };
    if (!arbitrumExplorerApiKey ||
        !arbitrumRpcMap[arbitrumNetwork] ||
        arbitrumExplorerApiKey === "" ||
        arbitrumRpcMap[arbitrumNetwork] === "") {
        return {
            service: "Arbitrum",
            status: "Down",
            message: "Arbitrum Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("Arbitrum", arbitrumRpcMap[arbitrumNetwork], arbitrumWssMap[arbitrumNetwork], arbitrumNetwork);
}
async function checkCeloService() {
    const celoExplorerApiKey = process.env.CELO_EXPLORER_API_KEY;
    const celoNetwork = process.env.CELO_NETWORK || "mainnet";
    const celoRpcMap = {
        mainnet: process.env.CELO_MAINNET_RPC,
        alfajores: process.env.CELO_ALFAJORES_RPC,
    };
    const celoWssMap = {
        mainnet: process.env.CELO_MAINNET_RPC_WSS,
        alfajores: process.env.CELO_ALFAJORES_RPC_WSS,
    };
    if (!celoExplorerApiKey ||
        !celoRpcMap[celoNetwork] ||
        celoExplorerApiKey === "" ||
        celoRpcMap[celoNetwork] === "") {
        return {
            service: "Celo",
            status: "Down",
            message: "Celo Explorer API key or RPC endpoint not found",
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    return checkEvmNetwork("Celo", celoRpcMap[celoNetwork], celoWssMap[celoNetwork], celoNetwork);
}
async function checkEvmNetwork(serviceName, rpc, wss, network) {
    var _a, _b;
    const endpoints = (0, rpc_pool_1.parseRpcEndpoints)(rpc);
    if (endpoints.length === 0) {
        return {
            service: serviceName,
            status: "Down",
            message: `${serviceName} HTTP RPC endpoint not found`,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    try {
        const { blockNumber, answered, total } = await (0, evm_rpc_1.probeAnyEvmRpcBlockNumber)(rpc, 8000);
        const endpointStatus = total > 1 ? ` [${answered}/${total} endpoints]` : "";
        let wssStatus = "";
        if ((0, rpc_pool_1.parseRpcEndpoints)(wss).length > 0) {
            try {
                const wssBlockNumber = await (0, evm_rpc_1.probeAnyEvmWssBlockNumber)(wss, 8000);
                wssStatus = ` and WebSocket (latest block: ${wssBlockNumber})`;
            }
            catch (error) {
                console_1.logger.error("HEALTH", `WSS connection error for ${serviceName}: ${error.message}`, error);
                wssStatus = `, but WebSocket connection failed`;
            }
        }
        return {
            service: serviceName,
            status: "Up",
            message: `Connected to ${serviceName} (${network}) via HTTP (latest block: ${blockNumber})${endpointStatus}${wssStatus}`,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    catch (error) {
        let errorMsg;
        const code = [error.code, (_a = error === null || error === void 0 ? void 0 : error.cause) === null || _a === void 0 ? void 0 : _a.code].find((c) => typeof c === "string") || "";
        switch (code) {
            case "ENOTFOUND":
                errorMsg = `RPC endpoint for ${serviceName} (${network}) not found.`;
                break;
            case "ECONNREFUSED":
            case "ECONNRESET":
            case "ETIMEDOUT":
            case "UND_ERR_CONNECT_TIMEOUT":
                errorMsg = `Network error (${code}): Failed to connect to ${serviceName} (${network}).`;
                break;
            case "SERVER_ERROR":
                errorMsg = `Server error: ${error.message}. RPC endpoint may be down.`;
                break;
            default:
                errorMsg = ((_b = error === null || error === void 0 ? void 0 : error.cause) === null || _b === void 0 ? void 0 : _b.message)
                    ? `${error.message}: ${error.cause.message}`
                    : error.message;
                break;
        }
        console_1.logger.error("HEALTH", `Failed to connect to ${serviceName} RPC: ${error.message}`, error);
        return {
            service: serviceName,
            status: "Down",
            message: errorMsg,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
}
