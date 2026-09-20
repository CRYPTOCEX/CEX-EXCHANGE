"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExchangeTxHash = extractExchangeTxHash;
const INFO_HASH_KEYS = [
    "txId",
    "txid",
    "tx_id",
    "txHash",
    "txhash",
    "tx_hash",
    "transactionHash",
    "transaction_hash",
    "transactionId",
    "transaction_id",
    "blockchainTxId",
    "chainTxId",
    "hash",
];
const PLAUSIBLE_HASH = /^(?:0x[0-9a-fA-F]{64}|[0-9a-fA-F]{64}|[1-9A-HJ-NP-Za-km-z]{86,90})$/;
function pick(value) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (!trimmed || !PLAUSIBLE_HASH.test(trimmed))
        return null;
    return trimmed;
}
function extractExchangeTxHash(withdrawal) {
    if (!withdrawal || typeof withdrawal !== "object")
        return null;
    const unified = pick(withdrawal.txid);
    if (unified)
        return unified;
    const info = withdrawal.info;
    if (info && typeof info === "object") {
        for (const key of INFO_HASH_KEYS) {
            const candidate = pick(info[key]);
            if (candidate)
                return candidate;
        }
    }
    return null;
}
