"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedSiweDomain = expectedSiweDomain;
exports.parseAndValidateSiwe = parseAndValidateSiwe;
const error_1 = require("@b/utils/error");
function expectedSiweDomain() {
    var _a;
    const explicit = (_a = process.env.SIWE_DOMAIN) === null || _a === void 0 ? void 0 : _a.trim();
    if (explicit)
        return explicit;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "SIWE cannot be validated: set SIWE_DOMAIN, or NEXT_PUBLIC_SITE_URL, in .env.",
        });
    }
    try {
        return new URL(site).host;
    }
    catch (_b) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "SIWE cannot be validated: NEXT_PUBLIC_SITE_URL is not a valid absolute URL. " +
                "Set SIWE_DOMAIN to the bare host instead.",
        });
    }
}
function parseSiweFields(message) {
    var _a;
    const bad = () => (0, error_1.createError)({ statusCode: 400, message: "Malformed SIWE message" });
    if (typeof message !== "string" || message.length > 8192)
        throw bad();
    const lines = message.split(/\r?\n/);
    if (lines.length < 6)
        throw bad();
    const header = /^(?:[a-zA-Z][a-zA-Z0-9+\-.]*:\/\/)?(?<domain>[^\s/?#]+) wants you to sign in with your Ethereum account:$/u.exec(lines[0]);
    if (!((_a = header === null || header === void 0 ? void 0 : header.groups) === null || _a === void 0 ? void 0 : _a.domain))
        throw bad();
    if (!/^0x[a-fA-F0-9]{40}$/u.test(lines[1]))
        throw bad();
    if (lines[2] !== "")
        throw bad();
    let cursor = 3;
    if (lines[cursor] === "") {
        cursor += 1;
    }
    else if (!lines[cursor].startsWith("URI: ")) {
        cursor += 1;
        if (lines[cursor] !== "")
            throw bad();
        cursor += 1;
    }
    const fields = {};
    for (let i = cursor; i < lines.length; i++) {
        const line = lines[i];
        if (line === "" || line.startsWith("- ") || line === "Resources:")
            continue;
        const kv = /^(?<key>[A-Za-z][A-Za-z ]*): (?<value>.*)$/u.exec(line);
        if (!(kv === null || kv === void 0 ? void 0 : kv.groups))
            throw bad();
        fields[kv.groups.key] = kv.groups.value;
    }
    if (!fields["URI"])
        throw bad();
    return { ...fields, domain: header.groups.domain, address: lines[1] };
}
function parseAndValidateSiwe(message, expectedDomain) {
    const msg = parseSiweFields(message);
    if (msg.domain !== expectedDomain)
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "SIWE domain does not match this site",
        });
    let uriHost = "";
    try {
        uriHost = new URL(msg["URI"]).host;
    }
    catch (_a) {
    }
    if (uriHost !== expectedDomain)
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "SIWE uri does not match this site",
        });
    if (msg["Version"] !== "1")
        throw (0, error_1.createError)({ statusCode: 400, message: "Unsupported SIWE version" });
    if (!/^\d{1,10}$/u.test(msg["Chain ID"] || ""))
        throw (0, error_1.createError)({ statusCode: 400, message: "Malformed SIWE message" });
    if (!/^[A-Za-z0-9]{8,128}$/u.test(msg["Nonce"] || ""))
        throw (0, error_1.createError)({ statusCode: 400, message: "Malformed SIWE message" });
    const now = Date.now();
    const expirationTime = msg["Expiration Time"];
    const notBefore = msg["Not Before"];
    const issuedAt = msg["Issued At"];
    if (expirationTime && Date.parse(expirationTime) < now)
        throw (0, error_1.createError)({ statusCode: 401, message: "SIWE message has expired" });
    if (notBefore && Date.parse(notBefore) > now)
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "SIWE message is not yet valid",
        });
    if (!issuedAt || !(now - Date.parse(issuedAt) <= 10 * 60000))
        throw (0, error_1.createError)({ statusCode: 401, message: "SIWE message is stale" });
    return {
        address: msg.address.toLowerCase(),
        chainId: `eip155:${msg["Chain ID"]}`,
        nonce: msg["Nonce"],
    };
}
