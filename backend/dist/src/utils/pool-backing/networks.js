"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_SIGNER_KINDS = exports.BUILT_IN_NETWORK_MAP = void 0;
exports.normaliseExchangeNetworks = normaliseExchangeNetworks;
exports.canonicalChainName = canonicalChainName;
exports.isKnownEcosystemChain = isKnownEcosystemChain;
exports.resolveNetworkId = resolveNetworkId;
exports.checkLeg = checkLeg;
exports.isEvmTokenChain = isEvmTokenChain;
exports.isUtxoChain = isUtxoChain;
exports.tokenKindFor = tokenKindFor;
exports.chainHasMemo = chainHasMemo;
function finiteOrUndefined(value) {
    if (value === null || value === undefined || value === "")
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function boolOrUndefined(value) {
    return typeof value === "boolean" ? value : undefined;
}
function normaliseExchangeNetworks(ccxtCurrency) {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h;
    const out = {};
    const networks = ccxtCurrency === null || ccxtCurrency === void 0 ? void 0 : ccxtCurrency.networks;
    if (!networks || typeof networks !== "object")
        return out;
    for (const [key, raw] of Object.entries(networks)) {
        const n = raw !== null && raw !== void 0 ? raw : {};
        const fee = (_h = finiteOrUndefined(n.fee)) !== null && _h !== void 0 ? _h : finiteOrUndefined((_a = n.fees) === null || _a === void 0 ? void 0 : _a.withdraw);
        out[key] = {
            id: key,
            active: boolOrUndefined(n.active),
            deposit: boolOrUndefined(n.deposit),
            withdraw: boolOrUndefined(n.withdraw),
            fee,
            withdrawMin: finiteOrUndefined((_c = (_b = n.limits) === null || _b === void 0 ? void 0 : _b.withdraw) === null || _c === void 0 ? void 0 : _c.min),
            withdrawMax: finiteOrUndefined((_e = (_d = n.limits) === null || _d === void 0 ? void 0 : _d.withdraw) === null || _e === void 0 ? void 0 : _e.max),
            depositMin: finiteOrUndefined((_g = (_f = n.limits) === null || _f === void 0 ? void 0 : _f.deposit) === null || _g === void 0 ? void 0 : _g.min),
            precision: finiteOrUndefined(n.precision),
            name: typeof n.name === "string" ? n.name : typeof n.network === "string" ? n.network : undefined,
        };
    }
    return out;
}
exports.BUILT_IN_NETWORK_MAP = {
    kucoin: {
        ETH: "ERC20",
        BSC: "BEP20",
        TRON: "TRC20",
        POLYGON: "POLYGON",
        ARBITRUM: "ARBITRUM",
        OPTIMISM: "OPTIMISM",
        BASE: "BASE",
        AVAX: "AVAX",
        BTC: "BTC",
        LTC: "LTC",
        DOGE: "DOGE",
        DASH: "DASH",
        SOL: "SOL",
        TON: "TON",
        XMR: "XMR",
    },
    binance: {
        ETH: "ETH",
        BSC: "BSC",
        TRON: "TRX",
        POLYGON: "MATIC",
        ARBITRUM: "ARBITRUM",
        OPTIMISM: "OPTIMISM",
        BASE: "BASE",
        AVAX: "AVAXC",
        BTC: "BTC",
        LTC: "LTC",
        DOGE: "DOGE",
        DASH: "DASH",
        SOL: "SOL",
        TON: "TON",
        XMR: "XMR",
    },
    xt: {
        ETH: "ERC20",
        BSC: "BEP20",
        TRON: "TRC20",
        POLYGON: "POLYGON",
        ARBITRUM: "ARBITRUM",
        OPTIMISM: "OPTIMISM",
        BASE: "BASE",
        AVAX: "AVAX",
        BTC: "BTC",
        LTC: "LTC",
        DOGE: "DOGE",
        DASH: "DASH",
        SOL: "SOL",
        TON: "TON",
        XMR: "XMR",
    },
    okx: {
        ETH: "ERC20",
        BSC: "BSC",
        TRON: "TRC20",
        POLYGON: "MATIC",
        ARBITRUM: "ARBITRUM",
        OPTIMISM: "OPTIMISM",
        BASE: "BASE",
        AVAX: "AVAXC",
        BTC: "BTC",
        LTC: "LTC",
        DOGE: "DOGE",
        DASH: "DASH",
        SOL: "SOL",
        TON: "TON",
        XMR: "XMR",
    },
    bybit: {
        ETH: "ETH",
        BSC: "BSC",
        TRON: "TRX",
        POLYGON: "MATIC",
        ARBITRUM: "ARBI",
        OPTIMISM: "OP",
        BASE: "BASE",
        AVAX: "CAVAX",
        BTC: "BTC",
        LTC: "LTC",
        DOGE: "DOGE",
        DASH: "DASH",
        SOL: "SOL",
        TON: "TON",
        XMR: "XMR",
    },
};
const RAIL_ALIASES = {
    ETH: ["ETH", "ERC20", "ETHEREUM"],
    BSC: ["BSC", "BEP20", "BNB", "BEP-20", "BNB SMART CHAIN"],
    TRON: ["TRX", "TRC20", "TRON"],
    POLYGON: ["MATIC", "POLYGON", "POL"],
    AVAX: ["AVAXC", "AVAX", "AVALANCHE", "CAVAX", "AVALANCHE C-CHAIN"],
    ARBITRUM: ["ARBITRUM", "ARB", "ARBONE", "ARBI"],
    OPTIMISM: ["OPTIMISM", "OP"],
    BASE: ["BASE"],
    SOL: ["SOL", "SOLANA"],
    TON: ["TON"],
    XMR: ["XMR", "MONERO"],
    BTC: ["BTC", "BITCOIN"],
    LTC: ["LTC", "LITECOIN"],
    DOGE: ["DOGE", "DOGECOIN"],
    DASH: ["DASH"],
};
function canonicalChainName(key) {
    const typed = String(key !== null && key !== void 0 ? key : "").trim().toUpperCase();
    if (!typed)
        return typed;
    if (RAIL_ALIASES[typed])
        return typed;
    for (const [chain, aliases] of Object.entries(RAIL_ALIASES)) {
        if (aliases.includes(typed))
            return chain;
    }
    return typed;
}
function isKnownEcosystemChain(chain) {
    return Object.prototype.hasOwnProperty.call(RAIL_ALIASES, String(chain !== null && chain !== void 0 ? chain : "").trim().toUpperCase());
}
function resolveNetworkId(p) {
    var _a, _b, _c, _d, _e;
    const chain = String((_a = p.chain) !== null && _a !== void 0 ? _a : "").trim();
    if (!chain)
        return { networkId: null, source: "none" };
    const keys = Object.keys((_b = p.networks) !== null && _b !== void 0 ? _b : {});
    const listed = (id) => {
        var _a;
        const wanted = id.toLowerCase();
        return (_a = keys.find((k) => k.toLowerCase() === wanted)) !== null && _a !== void 0 ? _a : null;
    };
    const anchor = readMapEntry(p.networkMap, chain);
    if (anchor)
        return { networkId: keys.length ? ((_c = listed(anchor)) !== null && _c !== void 0 ? _c : anchor) : anchor, source: "anchor" };
    const table = exports.BUILT_IN_NETWORK_MAP[String((_d = p.provider) !== null && _d !== void 0 ? _d : "").toLowerCase()];
    const builtin = table === null || table === void 0 ? void 0 : table[chain.toUpperCase()];
    if (builtin) {
        if (!keys.length)
            return { networkId: builtin, source: "builtin" };
        const hit = listed(builtin);
        if (hit)
            return { networkId: hit, source: "builtin" };
    }
    const exact = listed(chain);
    if (exact)
        return { networkId: exact, source: "exact" };
    if (keys.length) {
        for (const alias of (_e = RAIL_ALIASES[chain.toUpperCase()]) !== null && _e !== void 0 ? _e : []) {
            const hit = listed(alias);
            if (hit)
                return { networkId: hit, source: "builtin" };
        }
    }
    return { networkId: null, source: "none" };
}
function readMapEntry(map, chain) {
    if (!map || typeof map !== "object")
        return null;
    const direct = map[chain];
    if (typeof direct === "string" && direct.trim())
        return direct.trim();
    const wanted = chain.toUpperCase();
    for (const [key, value] of Object.entries(map)) {
        if (key.toUpperCase() === wanted && typeof value === "string" && value.trim())
            return value.trim();
    }
    return null;
}
function checkLeg(p) {
    const { network } = p;
    if (!network)
        return { ok: false, reason: "the exchange lists no such network for this currency" };
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0)
        return { ok: false, reason: "nothing to move" };
    const id = network.id;
    if (p.direction === "eco_to_exchange") {
        const depositEnabled = network.deposit === true || (network.deposit === undefined && network.active === true);
        if (!depositEnabled)
            return { ok: false, reason: `deposits on ${id} are disabled on the exchange` };
        if (p.needsTag && !p.chainHasMemo) {
            return { ok: false, reason: `the exchange's ${id} deposit address needs a memo/tag and the ecosystem handler for this chain cannot send one` };
        }
        if (network.depositMin !== undefined && network.depositMin > 0 && amount < network.depositMin) {
            return { ok: false, reason: `${amount} is below the exchange's minimum deposit of ${network.depositMin} on ${id}; the exchange would not credit it` };
        }
        return { ok: true };
    }
    const withdrawEnabled = network.withdraw === true || (network.withdraw === undefined && network.active === true);
    if (!withdrawEnabled)
        return { ok: false, reason: `withdrawals on ${id} are disabled on the exchange` };
    if (network.withdrawMin !== undefined && amount < network.withdrawMin) {
        return { ok: false, reason: `${amount} is below the exchange's minimum withdrawal of ${network.withdrawMin} on ${id}` };
    }
    if (network.withdrawMax !== undefined && network.withdrawMax > 0 && amount > network.withdrawMax) {
        return { ok: false, reason: `${amount} is above the exchange's maximum withdrawal of ${network.withdrawMax} on ${id}` };
    }
    return { ok: true };
}
const NON_EVM_CHAINS = new Set(["SOL", "TRON", "TON", "XMR", "BTC", "LTC", "DOGE", "DASH"]);
const UTXO_CHAINS = new Set(["BTC", "LTC", "DOGE", "DASH"]);
function isEvmTokenChain(chain, contractType) {
    const type = String(contractType !== null && contractType !== void 0 ? contractType : "").toUpperCase();
    if (type !== "PERMIT" && type !== "NO_PERMIT")
        return false;
    return !NON_EVM_CHAINS.has(String(chain !== null && chain !== void 0 ? chain : "").toUpperCase());
}
function isUtxoChain(chain) {
    return UTXO_CHAINS.has(String(chain !== null && chain !== void 0 ? chain : "").toUpperCase());
}
exports.NATIVE_SIGNER_KINDS = new Set([
    "native_evm",
    "sol",
    "spl",
    "tron",
    "trc20",
    "ton",
    "xmr",
]);
function tokenKindFor(chain, contractType) {
    const c = String(chain !== null && chain !== void 0 ? chain : "").trim().toUpperCase();
    const type = String(contractType !== null && contractType !== void 0 ? contractType : "").trim().toUpperCase();
    if (!c)
        return "unsupported";
    if (UTXO_CHAINS.has(c))
        return "utxo";
    const native = type === "NATIVE";
    const token = type === "PERMIT" || type === "NO_PERMIT";
    switch (c) {
        case "SOL":
            return native ? "sol" : token ? "spl" : "unsupported";
        case "TRON":
            return native ? "tron" : token ? "trc20" : "unsupported";
        case "TON":
            return native ? "ton" : "unsupported";
        case "XMR":
            return native ? "xmr" : "unsupported";
        default:
            break;
    }
    if (native)
        return "native_evm";
    if (isEvmTokenChain(c, type))
        return "evm_token";
    return "unsupported";
}
function chainHasMemo(chain) {
    return String(chain !== null && chain !== void 0 ? chain : "").trim().toUpperCase() === "TON";
}
