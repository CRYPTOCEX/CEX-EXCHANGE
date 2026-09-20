"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__testing = void 0;
exports.isTonRawAddress = isTonRawAddress;
exports.verifyTonProof = verifyTonProof;
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
const solana_1 = require("./solana");
const MAX_PROOF_AGE_MS = 10 * 60000;
function sha256(buf) {
    return crypto_1.default.createHash("sha256").update(buf).digest();
}
function parseRawAddress(address) {
    const m = /^(-?\d+):([0-9a-fA-F]{64})$/.exec(String(address !== null && address !== void 0 ? address : "").trim());
    if (!m)
        return null;
    const workchain = Number(m[1]);
    if (!Number.isInteger(workchain))
        return null;
    return { workchain, hash: Buffer.from(m[2], "hex") };
}
function isTonRawAddress(address) {
    return parseRawAddress(address) !== null;
}
function proveKeyOwnsAddress(publicKey, workchain, hash) {
    let contracts;
    try {
        const ton = require("@ton/ton");
        contracts = [
            ton.WalletContractV5R1,
            ton.WalletContractV4,
            ton.WalletContractV3R2,
            ton.WalletContractV3R1,
            ton.WalletContractV5Beta,
            ton.WalletContractV2R2,
            ton.WalletContractV2R1,
        ].filter(Boolean);
    }
    catch (error) {
        console_1.logger.error("WALLET", "@ton/ton is not resolvable; TON linking is unavailable", error);
        return false;
    }
    for (const Contract of contracts) {
        try {
            const wallet = Contract.create({ workchain, publicKey });
            if (Buffer.from(wallet.address.hash).equals(hash))
                return true;
        }
        catch (_a) {
            continue;
        }
    }
    return false;
}
function stateInitProvesKey(stateInitBase64, publicKey, hash) {
    var _a;
    try {
        const ton = require("@ton/ton");
        const cell = ton.Cell.fromBase64(stateInitBase64);
        if (!Buffer.from(cell.hash()).equals(hash))
            return false;
        const refs = (_a = cell.refs) !== null && _a !== void 0 ? _a : [];
        for (const dataCell of refs) {
            const layouts = [
                64,
                65,
            ];
            for (const skip of layouts) {
                try {
                    const slice = dataCell.beginParse();
                    if (slice.remainingBits < skip + 256)
                        continue;
                    slice.skip(skip);
                    const candidate = slice.loadBuffer(32);
                    if (Buffer.from(candidate).equals(publicKey))
                        return true;
                }
                catch (_b) {
                    continue;
                }
            }
        }
        return false;
    }
    catch (_c) {
        return false;
    }
}
function buildProofDigest(args) {
    const workchain = Buffer.alloc(4);
    workchain.writeUInt32BE(args.workchain >>> 0, 0);
    const domainBytes = Buffer.from(args.domain, "utf8");
    const domainLength = Buffer.alloc(4);
    domainLength.writeUInt32LE(domainBytes.length, 0);
    const timestamp = Buffer.alloc(8);
    timestamp.writeBigUInt64LE(BigInt(args.timestamp), 0);
    const message = Buffer.concat([
        Buffer.from("ton-proof-item-v2/", "utf8"),
        workchain,
        args.addressHash,
        domainLength,
        domainBytes,
        timestamp,
        Buffer.from(args.payload, "utf8"),
    ]);
    return sha256(Buffer.concat([
        Buffer.from([0xff, 0xff]),
        Buffer.from("ton-connect", "utf8"),
        sha256(message),
    ]));
}
function verifyTonProof(proof, expectedDomain, expectedNonce, walletStateInit) {
    var _a;
    var _b, _c, _d, _e;
    const parsed = parseRawAddress(proof === null || proof === void 0 ? void 0 : proof.address);
    if (!parsed)
        return { ok: false, reason: "That is not a valid TON address." };
    if (!/^[0-9a-fA-F]{64}$/.test(String((_b = proof === null || proof === void 0 ? void 0 : proof.publicKey) !== null && _b !== void 0 ? _b : ""))) {
        return { ok: false, reason: "The wallet did not report a usable public key." };
    }
    const publicKey = Buffer.from(proof.publicKey, "hex");
    if (String((_c = (_a = proof === null || proof === void 0 ? void 0 : proof.domain) === null || _a === void 0 ? void 0 : _a.value) !== null && _c !== void 0 ? _c : "") !== expectedDomain) {
        return { ok: false, reason: "This proof was signed for a different site." };
    }
    if (String((_d = proof === null || proof === void 0 ? void 0 : proof.payload) !== null && _d !== void 0 ? _d : "") !== expectedNonce) {
        return { ok: false, reason: "This proof does not carry the nonce we issued." };
    }
    const timestamp = Number(proof === null || proof === void 0 ? void 0 : proof.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return { ok: false, reason: "This proof carries no usable timestamp." };
    }
    const ageMs = Date.now() - timestamp * 1000;
    if (ageMs < -60000 || ageMs > MAX_PROOF_AGE_MS) {
        return { ok: false, reason: "This proof has expired. Please try linking again." };
    }
    const proved = proveKeyOwnsAddress(publicKey, parsed.workchain, parsed.hash) ||
        (typeof walletStateInit === "string" &&
            stateInitProvesKey(walletStateInit, publicKey, parsed.hash));
    if (!proved) {
        return {
            ok: false,
            reason: "We could not confirm that this key controls this TON address.",
        };
    }
    let signature;
    try {
        signature = Buffer.from(String((_e = proof.signature) !== null && _e !== void 0 ? _e : ""), "base64");
    }
    catch (_f) {
        return { ok: false, reason: "The wallet returned an unreadable signature." };
    }
    const digest = buildProofDigest({
        workchain: parsed.workchain,
        addressHash: parsed.hash,
        domain: expectedDomain,
        timestamp,
        payload: expectedNonce,
    });
    if (!(0, solana_1.verifyEd25519)(digest, signature, publicKey)) {
        return { ok: false, reason: "The signature did not match this wallet." };
    }
    return { ok: true, address: `${parsed.workchain}:${parsed.hash.toString("hex")}` };
}
exports.__testing = { buildProofDigest, parseRawAddress };
