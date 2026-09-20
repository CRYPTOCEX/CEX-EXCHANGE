"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEd25519 = verifyEd25519;
exports.isSolanaAddress = isSolanaAddress;
exports.verifySolanaMessage = verifySolanaMessage;
const crypto_1 = __importDefault(require("crypto"));
const web3_js_1 = require("@solana/web3.js");
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
function verifyEd25519(message, signature, publicKey) {
    if (publicKey.length !== 32)
        return false;
    if (signature.length !== 64)
        return false;
    try {
        const key = crypto_1.default.createPublicKey({
            key: Buffer.concat([ED25519_SPKI_PREFIX, publicKey]),
            format: "der",
            type: "spki",
        });
        return crypto_1.default.verify(null, message, key, signature);
    }
    catch (_a) {
        return false;
    }
}
function isSolanaAddress(address) {
    try {
        const key = new web3_js_1.PublicKey(address);
        return key.toBytes().length === 32 && web3_js_1.PublicKey.isOnCurve(key.toBytes());
    }
    catch (_a) {
        return false;
    }
}
function verifySolanaMessage(args) {
    let publicKey;
    try {
        publicKey = Buffer.from(new web3_js_1.PublicKey(args.address).toBytes());
    }
    catch (_a) {
        return false;
    }
    let signature;
    try {
        signature = Buffer.from(args.signature, "base64");
    }
    catch (_b) {
        return false;
    }
    return verifyEd25519(Buffer.from(args.message, "utf8"), signature, publicKey);
}
