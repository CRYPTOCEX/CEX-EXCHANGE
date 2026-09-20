"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMoneroBase58 = decodeMoneroBase58;
exports.parseMoneroAddress = parseMoneroAddress;
exports.xmrNetworkFromAddress = xmrNetworkFromAddress;
exports.configuredXmrNetwork = configuredXmrNetwork;
const ethers_1 = require("ethers");
const token_network_1 = require("@b/utils/token-network");
const MONERO_NETWORK_BYTES = {
    18: { network: "mainnet", kind: "standard" },
    19: { network: "mainnet", kind: "integrated" },
    42: { network: "mainnet", kind: "subaddress" },
    24: { network: "stagenet", kind: "standard" },
    25: { network: "stagenet", kind: "integrated" },
    36: { network: "stagenet", kind: "subaddress" },
    53: { network: "testnet", kind: "standard" },
    54: { network: "testnet", kind: "integrated" },
    63: { network: "testnet", kind: "subaddress" },
};
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DECODED_BLOCK_SIZE = {
    0: 0,
    2: 1,
    3: 2,
    5: 3,
    6: 4,
    7: 5,
    9: 6,
    10: 7,
    11: 8,
};
const FULL_BLOCK_ENCODED = 11;
const B58_ZERO = BigInt(0);
const B58_ONE = BigInt(1);
const B58_BASE = BigInt(58);
const BYTE_MASK = BigInt(255);
const BYTE_BITS = BigInt(8);
function decodeMoneroBase58(input) {
    if (!input || typeof input !== "string")
        return null;
    const blocks = [];
    for (let i = 0; i < input.length; i += FULL_BLOCK_ENCODED) {
        const chunk = input.slice(i, i + FULL_BLOCK_ENCODED);
        const size = DECODED_BLOCK_SIZE[chunk.length];
        if (size === undefined)
            return null;
        let value = B58_ZERO;
        for (const ch of chunk) {
            const digit = B58_ALPHABET.indexOf(ch);
            if (digit < 0)
                return null;
            value = value * B58_BASE + BigInt(digit);
        }
        if (value >= B58_ONE << BigInt(8 * size))
            return null;
        const out = Buffer.alloc(size);
        for (let b = size - 1; b >= 0; b--) {
            out[b] = Number(value & BYTE_MASK);
            value >>= BYTE_BITS;
        }
        blocks.push(out);
    }
    return Buffer.concat(blocks);
}
function parseMoneroAddress(address) {
    if (!address || typeof address !== "string")
        return null;
    if (address.length !== 95 && address.length !== 106)
        return null;
    const raw = decodeMoneroBase58(address);
    if (!raw || raw.length < 5)
        return null;
    const networkByte = raw[0];
    if (networkByte & 0x80)
        return null;
    const info = MONERO_NETWORK_BYTES[networkByte];
    if (!info)
        return null;
    const expectedLength = info.kind === "integrated" ? 77 : 69;
    if (raw.length !== expectedLength)
        return null;
    const body = raw.subarray(0, raw.length - 4);
    const checksum = raw.subarray(raw.length - 4);
    const digest = Buffer.from(ethers_1.ethers.keccak256(body).slice(2), "hex");
    if (!digest.subarray(0, 4).equals(checksum))
        return null;
    return { network: info.network, kind: info.kind, networkByte };
}
function xmrNetworkFromAddress(address) {
    const parsed = parseMoneroAddress(address);
    if (parsed)
        return parsed.network;
    if (!address || typeof address !== "string")
        return null;
    const prefix = address[0];
    if (prefix === "4" || prefix === "8")
        return "mainnet";
    if (prefix === "5" || prefix === "7")
        return "stagenet";
    if (prefix === "9" || prefix === "A" || prefix === "B")
        return "testnet";
    return null;
}
function configuredXmrNetwork() {
    const resolved = ((0, token_network_1.resolveConfiguredNetwork)("XMR") || "").toLowerCase();
    if (resolved === "mainnet" ||
        resolved === "stagenet" ||
        resolved === "testnet") {
        return resolved;
    }
    return null;
}
