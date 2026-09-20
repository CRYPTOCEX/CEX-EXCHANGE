"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256File = sha256File;
exports.expectedHashFrom = expectedHashFrom;
exports.verifyUpdateArtifact = verifyUpdateArtifact;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const promises_1 = __importDefault(require("fs/promises"));
const SHA256_HEX = /^[a-f0-9]{64}$/;
async function sha256File(filePath) {
    const hash = (0, crypto_1.createHash)("sha256");
    const stream = (0, fs_1.createReadStream)(filePath);
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}
function expectedHashFrom(headers) {
    var _a, _b;
    if (!headers)
        return null;
    const first = (v) => { var _a; return Array.isArray(v) ? ((_a = v[0]) !== null && _a !== void 0 ? _a : null) : (v !== null && v !== void 0 ? v : null); };
    const explicit = (_a = first(headers["x-update-sha256"])) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (explicit && SHA256_HEX.test(explicit))
        return explicit;
    const etag = (_b = first(headers["etag"])) === null || _b === void 0 ? void 0 : _b.trim().replace(/^W\//, "").replace(/^"|"$/g, "").toLowerCase();
    if (etag && SHA256_HEX.test(etag))
        return etag;
    return null;
}
async function verifyUpdateArtifact(opts) {
    const { filePath, expected, label } = opts;
    const what = label ? ` for ${label}` : "";
    if (!expected) {
        await discard(filePath);
        return {
            ok: false,
            actual: null,
            expected: null,
            reason: "no_expected_hash",
            detail: `The update server did not supply a SHA-256 for this archive${what}. ` +
                `Refusing to extract an unverified update. Every published update has a ` +
                `hash, so this means the response did not come from the update server ` +
                `intact — check for a proxy or cache between this server and the publisher.`,
        };
    }
    let actual;
    try {
        actual = await sha256File(filePath);
    }
    catch (e) {
        await discard(filePath);
        return {
            ok: false,
            actual: null,
            expected,
            reason: "unreadable",
            detail: `Could not read the downloaded archive${what} to verify it: ${e.message}`,
        };
    }
    if (actual !== expected) {
        await discard(filePath);
        return {
            ok: false,
            actual,
            expected,
            reason: "mismatch",
            detail: `The downloaded archive${what} does not match the publisher's checksum. ` +
                `Expected ${expected}, got ${actual}. The file has been discarded and ` +
                `nothing was extracted. This is either a corrupted or truncated download, ` +
                `or the archive was modified in transit — retry, and if it repeats, report it.`,
        };
    }
    return {
        ok: true,
        actual,
        expected,
        detail: `Archive${what} verified against publisher checksum ${expected}.`,
    };
}
async function discard(filePath) {
    try {
        await promises_1.default.unlink(filePath);
    }
    catch (_a) {
    }
}
