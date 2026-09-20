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
exports.NETWORK_AGNOSTIC_CHAINS = void 0;
exports.bucketNetwork = bucketNetwork;
exports.resolveConfiguredNetwork = resolveConfiguredNetwork;
exports.loadChainNetworkCatalogue = loadChainNetworkCatalogue;
exports.tokenNetworkLabelMatchesEnv = tokenNetworkLabelMatchesEnv;
exports.tokenNetworkMatchesEnv = tokenNetworkMatchesEnv;
exports.describeTokenNetworkMismatch = describeTokenNetworkMismatch;
exports.NETWORK_AGNOSTIC_CHAINS = [
    "XMR",
    "TON",
    "SOL",
    "TRON",
    "BTC",
    "LTC",
    "DOGE",
    "DASH",
];
function bucketNetwork(chain, raw) {
    if (!raw)
        return null;
    switch (chain.toUpperCase()) {
        case "SOL":
            return raw === "mainnet" || raw === "testnet" || raw === "devnet" ? raw : null;
        case "TON":
            return raw === "testnet" || raw === "mainnet" ? raw : null;
        case "TRON":
        case "XMR":
            return raw;
        case "BTC":
        case "LTC":
        case "DOGE":
        case "DASH": {
            const v = raw.toLowerCase();
            if (v === "regtest")
                return "regtest";
            if (v.includes("testnet") || v === "test" || v === "signet")
                return "testnet";
            if (v === "mainnet")
                return "mainnet";
            return null;
        }
        default:
            return raw;
    }
}
function resolveConfiguredNetwork(chain) {
    const key = `${chain.toUpperCase()}_NETWORK`;
    const raw = (process.env[key] || "").trim();
    const bucket = bucketNetwork(chain, raw);
    if (bucket)
        return bucket;
    switch (chain.toUpperCase()) {
        case "SOL":
            return "devnet";
        case "TON":
        case "TRON":
        case "XMR":
        case "BTC":
        case "LTC":
        case "DOGE":
        case "DASH":
            return "mainnet";
        default:
            return null;
    }
}
function networkLabelMatches(token, expectedNetwork) {
    var _a;
    if (token.network === expectedNetwork)
        return true;
    const rowLabel = String((_a = token.network) !== null && _a !== void 0 ? _a : "").trim();
    if (!rowLabel)
        return false;
    if (bucketNetwork(token.chain, rowLabel) === expectedNetwork)
        return true;
    if (token.network === token.chain && expectedNetwork === "mainnet")
        return true;
    const networkMappings = {
        BSC: "mainnet",
        ETH: "mainnet",
        POLYGON: "mainnet",
        ARBITRUM: "mainnet",
        OPTIMISM: "mainnet",
        AVALANCHE: "mainnet",
        FANTOM: "mainnet",
    };
    if (networkMappings[token.chain] === token.network && expectedNetwork === "mainnet") {
        return true;
    }
    return false;
}
function rpcEnvKey(chain, network) {
    return `${chain.toUpperCase()}_${network.toUpperCase()}_RPC`;
}
async function loadChainNetworkCatalogue() {
    try {
        const { getEcosystemChainUtils } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
        const chains = await getEcosystemChainUtils();
        const catalogue = chains === null || chains === void 0 ? void 0 : chains.chainConfigs;
        return catalogue && typeof catalogue === "object" ? catalogue : null;
    }
    catch (_a) {
        return null;
    }
}
function catalogueCarriesNetwork(catalogue, chain, network) {
    var _a, _b;
    const entry = catalogue[chain.toUpperCase()];
    if (!entry)
        return false;
    return Boolean((_b = (_a = entry.networks) === null || _a === void 0 ? void 0 : _a[network]) === null || _b === void 0 ? void 0 : _b.chainId);
}
function tokenNetworkLabelMatchesEnv(token) {
    const expectedNetwork = resolveConfiguredNetwork(token.chain);
    if (!expectedNetwork)
        return false;
    return networkLabelMatches(token, expectedNetwork);
}
function tokenNetworkMatchesEnv(token, catalogue) {
    if (!tokenNetworkLabelMatchesEnv(token))
        return false;
    if (exports.NETWORK_AGNOSTIC_CHAINS.includes(token.chain))
        return true;
    const expectedNetwork = resolveConfiguredNetwork(token.chain);
    if (!expectedNetwork)
        return false;
    if (!process.env[rpcEnvKey(token.chain, expectedNetwork)])
        return false;
    if (!catalogue)
        return true;
    return catalogueCarriesNetwork(catalogue, token.chain, expectedNetwork);
}
function describeTokenNetworkMismatch(tokens, catalogue) {
    var _a;
    var _b, _c;
    const seen = new Set();
    const reasons = [];
    for (const token of tokens) {
        const chain = String(token.chain || "").toUpperCase();
        if (!chain || seen.has(chain))
            continue;
        seen.add(chain);
        const envVar = `${chain}_NETWORK`;
        const raw = process.env[envVar];
        const expected = resolveConfiguredNetwork(chain);
        if (!expected) {
            reasons.push(`${chain} has no ${envVar} configured`);
            continue;
        }
        if (!networkLabelMatches(token, expected)) {
            const folded = raw && raw.trim() !== expected
                ? ` (which this deployment resolves to "${expected}")`
                : "";
            reasons.push(`${chain} token network "${(_b = token.network) !== null && _b !== void 0 ? _b : "null"}" != ${envVar}="${raw !== null && raw !== void 0 ? raw : "(unset)"}"${folded}` +
                ` — re-label the row "${expected}" (the admin token editor cannot change` +
                ` \`network\`, so this is a re-import or a direct row edit)`);
            continue;
        }
        if (exports.NETWORK_AGNOSTIC_CHAINS.includes(chain)) {
            reasons.push(`${chain} is configured and reachable`);
            continue;
        }
        const rpcVar = rpcEnvKey(chain, expected);
        if (!process.env[rpcVar]) {
            reasons.push(`${chain} matches ${envVar}="${expected}" but ${rpcVar} is not set, so no provider can be built and deposits to it could never be credited`);
            continue;
        }
        if (catalogue && !catalogueCarriesNetwork(catalogue, chain, expected)) {
            const known = Object.keys((_c = (_a = catalogue[chain]) === null || _a === void 0 ? void 0 : _a.networks) !== null && _c !== void 0 ? _c : {});
            reasons.push(`${chain} has ${envVar}="${expected}" and ${rpcVar} set, but the chain defines no "${expected}" network` +
                (known.length ? ` (it has ${known.join(", ")})` : "") +
                ` — getProvider cannot pin a chain id for it, so deposits to it could never be credited`);
            continue;
        }
        reasons.push(`${chain} is configured and reachable`);
    }
    return reasons.join("; ");
}
