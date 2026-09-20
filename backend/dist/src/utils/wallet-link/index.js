"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndValidateLinkStatement = exports.buildLinkStatement = exports.WALLET_VMS = void 0;
exports.isWalletVm = isWalletVm;
exports.isVmAddress = isVmAddress;
exports.normaliseVmAddress = normaliseVmAddress;
exports.readProofNonce = readProofNonce;
exports.verifyWalletProof = verifyWalletProof;
const error_1 = require("@b/utils/error");
const message_1 = require("./message");
const solana_1 = require("./solana");
const tron_1 = require("./tron");
const ton_1 = require("./ton");
exports.WALLET_VMS = ["EVM", "SVM", "TVM", "TON"];
function isWalletVm(value) {
    return typeof value === "string" && exports.WALLET_VMS.includes(value);
}
function isVmAddress(vm, address) {
    const value = String(address !== null && address !== void 0 ? address : "").trim();
    if (!value)
        return false;
    switch (vm) {
        case "EVM":
            return /^0x[0-9a-fA-F]{40}$/.test(value);
        case "SVM":
            return (0, solana_1.isSolanaAddress)(value);
        case "TVM":
            return (0, tron_1.isTronAddress)(value);
        case "TON":
            return (0, ton_1.isTonRawAddress)(value);
    }
}
function normaliseVmAddress(vm, address) {
    const value = String(address !== null && address !== void 0 ? address : "").trim();
    return vm === "EVM" || vm === "TON" ? value.toLowerCase() : value;
}
function readProofNonce(request, expectedDomain) {
    var _a;
    var _b;
    switch (request.vm) {
        case "SVM":
        case "TVM":
            return (0, message_1.parseAndValidateLinkStatement)(request.message, request.vm, expectedDomain).nonce;
        case "TON": {
            const nonce = String((_b = (_a = request.proof) === null || _a === void 0 ? void 0 : _a.payload) !== null && _b !== void 0 ? _b : "");
            if (!/^[A-Za-z0-9]{8,128}$/u.test(nonce)) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Malformed wallet-link proof" });
            }
            return nonce;
        }
        case "EVM":
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "EVM links are proved through the SIWE path, not this one.",
            });
    }
}
function verifyWalletProof(request, expectedDomain, expectedNonce) {
    var _a, _b;
    const { vm } = request;
    if (vm === "EVM") {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "EVM links are proved through the SIWE path, not this one.",
        });
    }
    const address = String((_a = request.address) !== null && _a !== void 0 ? _a : "").trim();
    if (!isVmAddress(vm, address)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That is not a valid wallet address for this network.",
        });
    }
    if (vm === "TON") {
        const result = (0, ton_1.verifyTonProof)(request.proof, expectedDomain, expectedNonce, request.walletStateInit);
        if (!result.ok)
            throw (0, error_1.createError)({ statusCode: 401, message: result.reason });
        if (normaliseVmAddress("TON", result.address) !== normaliseVmAddress("TON", address)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This proof is for a different address than the one submitted.",
            });
        }
        return { address: result.address, nonce: expectedNonce };
    }
    const statement = (0, message_1.parseAndValidateLinkStatement)(request.message, vm, expectedDomain);
    if (statement.address !== address) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This signature is for a different address than the one submitted.",
        });
    }
    if (statement.nonce !== expectedNonce) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "This signature does not carry the nonce we issued.",
        });
    }
    const signature = String((_b = request.signature) !== null && _b !== void 0 ? _b : "");
    const verified = vm === "SVM"
        ? (0, solana_1.verifySolanaMessage)({ address, message: request.message, signature })
        : (0, tron_1.verifyTronMessage)({ address, message: request.message, signature });
    if (!verified) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "The signature did not match this wallet.",
        });
    }
    return { address: normaliseVmAddress(vm, address), nonce: expectedNonce };
}
var message_2 = require("./message");
Object.defineProperty(exports, "buildLinkStatement", { enumerable: true, get: function () { return message_2.buildLinkStatement; } });
Object.defineProperty(exports, "parseAndValidateLinkStatement", { enumerable: true, get: function () { return message_2.parseAndValidateLinkStatement; } });
