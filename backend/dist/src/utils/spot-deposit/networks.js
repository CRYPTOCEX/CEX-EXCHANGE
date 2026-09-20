"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECOSYSTEM_CHAINS = exports.SPOT_NETWORK_TO_CHAIN = void 0;
exports.normaliseNetwork = normaliseNetwork;
exports.exchangeNetworkToChain = exchangeNetworkToChain;
exports.chainToExchangeNetworks = chainToExchangeNetworks;
exports.isEcosystemChain = isEcosystemChain;
exports.resolveChainForNetwork = resolveChainForNetwork;
exports.precisionDecimals = precisionDecimals;
exports.findExchangeCurrencyEntry = findExchangeCurrencyEntry;
exports.describeExchangeNetwork = describeExchangeNetwork;
exports.eligibilityForCustody = eligibilityForCustody;
const console_1 = require("@b/utils/console");
exports.SPOT_NETWORK_TO_CHAIN = Object.freeze({
    ERC20: "ETH",
    ETH: "ETH",
    ETHEREUM: "ETH",
    BEP20: "BSC",
    BSC: "BSC",
    BNB: "BSC",
    TRC20: "TRON",
    TRX: "TRON",
    TRON: "TRON",
    MATIC: "POLYGON",
    POLYGON: "POLYGON",
    ARBITRUM: "ARBITRUM",
    OPTIMISM: "OPTIMISM",
    BASE: "BASE",
    FTM: "FTM",
    FANTOM: "FTM",
    CELO: "CELO",
    CRO: "CRONOS",
    CRONOS: "CRONOS",
    HECO: "HECO",
    RSK: "RSK",
    SOL: "SOL",
    SOLANA: "SOL",
    BTC: "BTC",
    BITCOIN: "BTC",
    LTC: "LTC",
    DOGE: "DOGE",
    DASH: "DASH",
    TON: "TON",
    XMR: "XMR",
});
exports.ECOSYSTEM_CHAINS = Object.freeze([
    "ETH", "BSC", "POLYGON", "FTM", "OPTIMISM", "ARBITRUM", "BASE", "CELO", "MO", "TRON",
    "RSK", "HECO", "CRONOS", "BTC", "LTC", "DOGE", "DASH", "SOL", "XMR", "TON",
]);
function normaliseNetwork(network) {
    return String(network !== null && network !== void 0 ? network : "").trim().toUpperCase();
}
function exchangeNetworkToChain(networkId) {
    var _a;
    const key = normaliseNetwork(networkId);
    if (!key)
        return null;
    return (_a = exports.SPOT_NETWORK_TO_CHAIN[key]) !== null && _a !== void 0 ? _a : null;
}
function chainToExchangeNetworks(chain) {
    const wanted = normaliseNetwork(chain);
    if (!wanted)
        return [];
    return Object.entries(exports.SPOT_NETWORK_TO_CHAIN)
        .filter(([, c]) => c === wanted)
        .map(([network]) => network);
}
function customChainSymbols() {
    try {
        const { getCustomEvmChainSymbols } = require("@b/api/(ext)/ecosystem/utils/customChains");
        const symbols = getCustomEvmChainSymbols === null || getCustomEvmChainSymbols === void 0 ? void 0 : getCustomEvmChainSymbols();
        return Array.isArray(symbols) ? symbols.map((s) => normaliseNetwork(String(s))) : [];
    }
    catch (_a) {
        return [];
    }
}
function isEcosystemChain(chain) {
    const key = normaliseNetwork(chain);
    if (!key)
        return false;
    return exports.ECOSYSTEM_CHAINS.includes(key) || customChainSymbols().includes(key);
}
function resolveChainForNetwork(networkId, exchangeNetwork) {
    var _a;
    const mapped = (_a = exchangeNetworkToChain(networkId)) !== null && _a !== void 0 ? _a : exchangeNetworkToChain(exchangeNetwork);
    if (mapped)
        return mapped;
    const custom = customChainSymbols();
    for (const candidate of [normaliseNetwork(networkId), normaliseNetwork(exchangeNetwork)]) {
        if (candidate && custom.includes(candidate))
            return candidate;
    }
    return null;
}
function precisionDecimals(precision, fallback = 8) {
    const n = Number(precision);
    if (!Number.isFinite(n) || n < 0)
        return fallback;
    if (n === 0)
        return fallback;
    if (n === 1)
        return 0;
    let decimals;
    if (n > 1)
        decimals = Number.isInteger(n) ? n : fallback;
    else
        decimals = Math.round(-Math.log10(n));
    if (!Number.isFinite(decimals) || decimals < 0)
        return fallback;
    return Math.min(18, decimals);
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function findExchangeCurrencyEntry(currencies, code, provider) {
    var _a, _b, _c;
    const wanted = String(code !== null && code !== void 0 ? code : "").toUpperCase();
    const list = Object.values(currencies || {});
    if (provider === "xt") {
        return (_a = list.find((c) => { var _a; return String((_a = c === null || c === void 0 ? void 0 : c.code) !== null && _a !== void 0 ? _a : "").toUpperCase() === wanted; })) !== null && _a !== void 0 ? _a : null;
    }
    return ((_c = (_b = list.find((c) => { var _a; return String((_a = c === null || c === void 0 ? void 0 : c.code) !== null && _a !== void 0 ? _a : "").toUpperCase() === wanted; })) !== null && _b !== void 0 ? _b : list.find((c) => { var _a; return String((_a = c === null || c === void 0 ? void 0 : c.id) !== null && _a !== void 0 ? _a : "").toUpperCase() === wanted; })) !== null && _c !== void 0 ? _c : null);
}
function describeExchangeNetwork(currencies, currency, network, provider) {
    var _a, _b;
    var _c, _d, _e;
    const entry = findExchangeCurrencyEntry(currencies, currency, provider);
    const networks = entry === null || entry === void 0 ? void 0 : entry.networks;
    if (!networks || typeof networks !== "object")
        return null;
    const keys = Object.keys(networks);
    const wanted = String(network !== null && network !== void 0 ? network : "").trim();
    const wantedUpper = normaliseNetwork(wanted);
    if (!wantedUpper)
        return null;
    let key = (_c = keys.find((k) => k === wanted)) !== null && _c !== void 0 ? _c : keys.find((k) => normaliseNetwork(k) === wantedUpper);
    if (!key) {
        const chain = exchangeNetworkToChain(wantedUpper);
        if (chain) {
            const aliases = chainToExchangeNetworks(chain);
            key = keys.find((k) => aliases.includes(normaliseNetwork(k)));
        }
    }
    if (!key) {
        key = keys.find((k) => {
            var _a;
            const n = (_a = networks[k]) !== null && _a !== void 0 ? _a : {};
            return [n.network, n.name, n.id].some((v) => normaliseNetwork(v) === wantedUpper);
        });
    }
    if (!key)
        return null;
    const raw = (_d = networks[key]) !== null && _d !== void 0 ? _d : {};
    const precision = finiteOrNull(raw.precision);
    return {
        key,
        id: String((_e = raw.id) !== null && _e !== void 0 ? _e : key),
        name: String(raw.network || raw.name || key),
        precision,
        decimals: precisionDecimals(precision),
        depositMin: finiteOrNull((_b = (_a = raw === null || raw === void 0 ? void 0 : raw.limits) === null || _a === void 0 ? void 0 : _a.deposit) === null || _b === void 0 ? void 0 : _b.min),
        depositEnabled: (raw === null || raw === void 0 ? void 0 : raw.active) !== false && ((raw === null || raw === void 0 ? void 0 : raw.deposit) === true || ((raw === null || raw === void 0 ? void 0 : raw.deposit) === undefined && (raw === null || raw === void 0 ? void 0 : raw.active) !== false)),
        raw,
    };
}
async function ecosystemAddonEnabled() {
    try {
        const { CacheManager } = require("@b/utils/cache");
        const extensions = await CacheManager.getInstance().getExtensions();
        return !!extensions && typeof extensions.has === "function" && extensions.has("ecosystem");
    }
    catch (error) {
        console_1.logger.warn("SPOT_DEPOSIT", `Could not read the extension list; treating the Ecosystem addon as absent: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return false;
    }
}
async function eligibilityForCustody(p) {
    var _a, _b;
    const currency = String((_a = p.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase();
    const chain = resolveChainForNetwork(p.networkId, p.exchangeNetwork);
    if (!chain) {
        return {
            eligible: false,
            reason: `Exchange network "${p.networkId}" does not map to an ecosystem chain`,
        };
    }
    if (!(await ecosystemAddonEnabled())) {
        return { eligible: false, chain, reason: "The Ecosystem addon is not installed or not enabled" };
    }
    if (p.exchangeAddressHasTag) {
        return { eligible: false, chain, reason: `The exchange address for ${currency} on ${p.networkId} needs a tag/memo, which the ${chain} handler cannot send` };
    }
    let tokens;
    try {
        tokens = require("@b/api/(ext)/ecosystem/utils/tokens");
    }
    catch (error) {
        return { eligible: false, chain, reason: `Ecosystem token utilities are not available: ${(error === null || error === void 0 ? void 0 : error.message) || error}` };
    }
    let token;
    try {
        token = await tokens.getEcosystemToken(chain, currency);
    }
    catch (error) {
        return { eligible: false, chain, reason: `No enabled ${currency} token on ${chain}: ${(error === null || error === void 0 ? void 0 : error.message) || error}` };
    }
    if (!token || token.status === false) {
        return { eligible: false, chain, reason: `No enabled ${currency} token on ${chain}` };
    }
    let catalogue = null;
    try {
        catalogue = typeof tokens.loadChainNetworkCatalogue === "function" ? await tokens.loadChainNetworkCatalogue() : null;
    }
    catch (_c) {
        catalogue = null;
    }
    const matchesEnv = typeof tokens.tokenNetworkMatchesEnv === "function" ? tokens.tokenNetworkMatchesEnv(token, catalogue) : false;
    if (!matchesEnv) {
        return {
            eligible: false,
            chain,
            reason: `The ${currency} token on ${chain} (network "${(_b = token.network) !== null && _b !== void 0 ? _b : "?"}") runs on a network this deployment cannot monitor`,
        };
    }
    const depositMin = finiteOrNull(p.depositMin);
    return {
        eligible: true,
        chain,
        minUnknown: depositMin === null,
        depositMin,
        token: {
            id: token.id,
            contractType: token.contractType,
            contract: token.contract,
            decimals: token.decimals,
            precision: token.precision,
            network: token.network,
        },
    };
}
