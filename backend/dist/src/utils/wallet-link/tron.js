"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTronAddress = isTronAddress;
exports.verifyTronMessage = verifyTronMessage;
const console_1 = require("@b/utils/console");
function tronLib() {
    try {
        return require("tronweb");
    }
    catch (error) {
        console_1.logger.error("WALLET", "tronweb is not resolvable; TRON linking is unavailable", error);
        return null;
    }
}
function isTronAddress(address) {
    if (typeof address !== "string" || !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
        return false;
    }
    const lib = tronLib();
    if (!lib)
        return false;
    try {
        return lib.TronWeb.isAddress(address);
    }
    catch (_a) {
        return false;
    }
}
function verifyTronMessage(args) {
    const lib = tronLib();
    if (!lib)
        return false;
    let recovered;
    try {
        recovered = lib.Trx.verifyMessageV2(args.message, args.signature);
    }
    catch (_a) {
        return false;
    }
    return typeof recovered === "string" && recovered === args.address;
}
