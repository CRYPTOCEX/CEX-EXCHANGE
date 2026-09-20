"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLinkStatement = buildLinkStatement;
exports.parseAndValidateLinkStatement = parseAndValidateLinkStatement;
const error_1 = require("@b/utils/error");
const VM_LABEL = {
    SVM: "Solana",
    TVM: "TRON",
};
function buildLinkStatement(vm, fields) {
    return [
        `${fields.domain} wants you to link this wallet to your account.`,
        "",
        `Address: ${fields.address}`,
        `Network: ${VM_LABEL[vm]}`,
        `Nonce: ${fields.nonce}`,
        `Issued At: ${fields.issuedAt}`,
        `Expiration Time: ${fields.expirationTime}`,
        "",
        "Signing is free, moves no funds and grants no permissions.",
    ].join("\n");
}
function parseAndValidateLinkStatement(message, vm, expectedDomain) {
    var _a;
    const bad = () => (0, error_1.createError)({ statusCode: 400, message: "Malformed wallet-link message" });
    if (typeof message !== "string" || message.length > 4096)
        throw bad();
    const lines = message.split(/\r?\n/);
    if (lines.length !== 9)
        throw bad();
    const header = /^(?:[a-zA-Z][a-zA-Z0-9+\-.]*:\/\/)?(?<domain>[^\s/?#]+) wants you to link this wallet to your account\.$/u.exec(lines[0]);
    if (!((_a = header === null || header === void 0 ? void 0 : header.groups) === null || _a === void 0 ? void 0 : _a.domain))
        throw bad();
    if (lines[1] !== "")
        throw bad();
    if (lines[7] !== "")
        throw bad();
    if (lines[8] !== "Signing is free, moves no funds and grants no permissions.") {
        throw bad();
    }
    const field = (index, key) => {
        var _a;
        const re = new RegExp(`^${key}: (?<value>.+)$`, "u");
        const m = re.exec(lines[index]);
        if (!((_a = m === null || m === void 0 ? void 0 : m.groups) === null || _a === void 0 ? void 0 : _a.value))
            throw bad();
        return m.groups.value;
    };
    const address = field(2, "Address");
    const network = field(3, "Network");
    const nonce = field(4, "Nonce");
    const issuedAt = field(5, "Issued At");
    const expirationTime = field(6, "Expiration Time");
    const domain = header.groups.domain;
    if (domain !== expectedDomain) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "This message was signed for a different site.",
        });
    }
    if (network !== VM_LABEL[vm]) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This message was signed for a different network.",
        });
    }
    if (!/^[A-Za-z0-9]{8,128}$/u.test(nonce))
        throw bad();
    const now = Date.now();
    const issued = Date.parse(issuedAt);
    const expires = Date.parse(expirationTime);
    if (!Number.isFinite(issued) || !Number.isFinite(expires))
        throw bad();
    if (expires < now) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "This signature has expired. Please try linking again.",
        });
    }
    if (issued > now + 60000)
        throw bad();
    if (now - issued > 10 * 60000) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "This signature is too old. Please try linking again.",
        });
    }
    return { domain, address, network, nonce, issuedAt, expirationTime };
}
