"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_ADDRESS_COLUMN_WIDTH = exports.CHAIN_TX_ID_COLUMN_WIDTH = exports.DEX_VM_VALUES = exports.SVM_SIGNATURE_RE = exports.UTXO_ADDRESS_RE = exports.TON_ADDRESS_RE = exports.TVM_ADDRESS_RE = exports.SVM_ADDRESS_RE = exports.TX_HASH_RE = exports.EVM_ADDRESS_RE = exports.SIGNED_RAW_AMOUNT_RE = exports.RAW_AMOUNT_RE = void 0;
exports.isAddressValidForVm = isAddressValidForVm;
exports.isTxIdValidForVm = isTxIdValidForVm;
exports.normalizeChainAddressValue = normalizeChainAddressValue;
exports.normalizeChainTxIdValue = normalizeChainTxIdValue;
exports.RAW_AMOUNT_RE = /^[0-9]{1,78}$/;
exports.SIGNED_RAW_AMOUNT_RE = /^-?[0-9]{1,78}$/;
exports.EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
exports.TX_HASH_RE = /^0x[0-9a-f]{64}$/;
exports.SVM_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
exports.TVM_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
exports.TON_ADDRESS_RE = /^[A-Za-z0-9_+/=-]{48}$/;
exports.UTXO_ADDRESS_RE = /^([1-9A-HJ-NP-Za-km-z]{26,35}|(?:bc1|ltc1)[02-9ac-hj-np-z]{11,71})$/;
exports.SVM_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;
exports.DEX_VM_VALUES = ["EVM", "SVM", "TVM", "TON", "UTXO"];
function isAddressValidForVm(vm, value) {
    switch (String(vm)) {
        case "EVM":
            return exports.EVM_ADDRESS_RE.test(value);
        case "SVM":
            return exports.SVM_ADDRESS_RE.test(value);
        case "TVM":
            return exports.TVM_ADDRESS_RE.test(value);
        case "TON":
            return exports.TON_ADDRESS_RE.test(value);
        case "UTXO":
            return exports.UTXO_ADDRESS_RE.test(value);
        default:
            return false;
    }
}
function isTxIdValidForVm(vm, value) {
    switch (String(vm)) {
        case "EVM":
            return exports.TX_HASH_RE.test(value.toLowerCase());
        case "SVM":
            return exports.SVM_SIGNATURE_RE.test(value);
        case "TVM":
        case "UTXO":
            return /^[0-9a-f]{64}$/.test(value.toLowerCase());
        case "TON":
            return (/^[A-Za-z0-9_+/=-]{44}$/.test(value) || /^[0-9a-f]{64}$/.test(value.toLowerCase()));
        default:
            return false;
    }
}
function normalizeChainAddressValue(value) {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed))
        return trimmed.toLowerCase();
    return trimmed;
}
function normalizeChainTxIdValue(value) {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed))
        return trimmed.toLowerCase();
    return trimmed;
}
exports.CHAIN_TX_ID_COLUMN_WIDTH = 128;
exports.CHAIN_ADDRESS_COLUMN_WIDTH = 64;
