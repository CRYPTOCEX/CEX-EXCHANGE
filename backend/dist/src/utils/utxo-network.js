"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGuardedUtxoChain = isGuardedUtxoChain;
exports.utxoNetworkEnvVar = utxoNetworkEnvVar;
exports.resolveUtxoNetworkKind = resolveUtxoNetworkKind;
exports.detectUtxoAddressNetworks = detectUtxoAddressNetworks;
exports.checkUtxoAddressNetwork = checkUtxoAddressNetwork;
exports.isUtxoAddressOnConfiguredNetwork = isUtxoAddressOnConfiguredNetwork;
const console_1 = require("@b/utils/console");
const ADDRESS_RULES = {
    BTC: {
        mainnet: { base58: ["1", "3"], bech32: ["bc1"] },
        testnet: { base58: ["m", "n", "2"], bech32: ["tb1"] },
        regtest: { base58: ["m", "n", "2"], bech32: ["bcrt1"] },
    },
    LTC: {
        mainnet: { base58: ["L", "M", "3"], bech32: ["ltc1"] },
        testnet: { base58: ["m", "n", "Q", "2"], bech32: ["tltc1"] },
        regtest: { base58: ["m", "n", "Q", "2"], bech32: ["rltc1"] },
    },
    DOGE: {
        mainnet: { base58: ["D", "A", "9"], bech32: [] },
        testnet: { base58: ["n", "m", "2"], bech32: [] },
    },
    DASH: {
        mainnet: { base58: ["X", "7"], bech32: [] },
        testnet: { base58: ["y", "8", "9"], bech32: [] },
    },
};
function isGuardedUtxoChain(chain) {
    return !!ADDRESS_RULES[chain];
}
function utxoNetworkEnvVar(chain) {
    return `${chain.toUpperCase()}_NETWORK`;
}
function resolveUtxoNetworkKind(chain) {
    const raw = (process.env[utxoNetworkEnvVar(chain)] || "mainnet").toLowerCase();
    if (raw === "regtest")
        return "regtest";
    if (raw.includes("testnet") || raw === "test" || raw === "signet") {
        return "testnet";
    }
    return "mainnet";
}
function detectUtxoAddressNetworks(chain, address) {
    const rules = ADDRESS_RULES[chain];
    if (!rules || !address)
        return [];
    const lower = address.toLowerCase();
    const kinds = [];
    for (const [kind, rule] of Object.entries(rules)) {
        const matches = rule.bech32.some((hrp) => lower.startsWith(hrp)) ||
            rule.base58.some((prefix) => address.startsWith(prefix));
        if (matches)
            kinds.push(kind);
    }
    return kinds;
}
function checkUtxoAddressNetwork(chain, address) {
    const expected = resolveUtxoNetworkKind(chain);
    const detected = detectUtxoAddressNetworks(chain, address);
    return {
        ok: detected.length === 0 || detected.includes(expected),
        expected,
        detected,
        configured: process.env[utxoNetworkEnvVar(chain)] || "mainnet",
    };
}
const warned = new Set();
function isUtxoAddressOnConfiguredNetwork(chain, address, context) {
    const check = checkUtxoAddressNetwork(chain, address);
    if (check.ok)
        return true;
    const envVar = utxoNetworkEnvVar(chain);
    const message = `Skipping ${context}: ${chain} address ${address} is a ` +
        `${check.detected.join("/")} address but ${envVar}="${check.configured}" ` +
        `(${check.expected}). Every explorer request for it fails with ` +
        `"Address on invalid network". Regenerate the wallet on ${check.expected}, ` +
        `or point ${envVar} back at ${check.detected[0]}.`;
    const key = `${chain}:${address}`;
    if (warned.has(key)) {
        console_1.logger.debug("UTXO_NET", message);
    }
    else {
        warned.add(key);
        console_1.logger.warn("UTXO_NET", message);
    }
    return false;
}
