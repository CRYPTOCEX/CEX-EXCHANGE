"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRemoteAddress = extractRemoteAddress;
exports.unwrapV4Mapped = unwrapV4Mapped;
exports.isValidIpAddress = isValidIpAddress;
exports.normalizeIpAddress = normalizeIpAddress;
exports.isPrivateAddress = isPrivateAddress;
exports.describeProxyTrust = describeProxyTrust;
exports.isTrustedProxyAddress = isTrustedProxyAddress;
exports.getClientIp = getClientIp;
exports.requestClientIp = requestClientIp;
const net_1 = __importDefault(require("net"));
const ip_1 = __importDefault(require("ip"));
function extractRemoteAddress(res) {
    const remoteAddressBuffer = res.getRemoteAddressAsText();
    const rawAddress = remoteAddressBuffer
        ? Buffer.from(remoteAddressBuffer).toString("utf-8")
        : "127.0.0.1";
    return normalizeIpAddress(rawAddress);
}
function unwrapV4Mapped(address) {
    const trimmed = String(address !== null && address !== void 0 ? address : "").trim().replace(/^\[|\]$/g, "");
    if (!trimmed)
        return trimmed;
    const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
    if (dotted)
        return dotted[1];
    try {
        const buf = ip_1.default.toBuffer(trimmed);
        if (buf.length === 16 &&
            buf[10] === 0xff &&
            buf[11] === 0xff &&
            buf.subarray(0, 10).every((b) => b === 0)) {
            return `${buf[12]}.${buf[13]}.${buf[14]}.${buf[15]}`;
        }
    }
    catch (_a) {
    }
    return trimmed;
}
function isValidIpAddress(value) {
    return net_1.default.isIP(String(value !== null && value !== void 0 ? value : "").trim().replace(/^\[|\]$/g, "")) !== 0;
}
function normalizeIpAddress(rawAddress) {
    const unwrapped = unwrapV4Mapped(rawAddress);
    if (unwrapped === "::1" ||
        unwrapped === "0000:0000:0000:0000:0000:0000:0000:0001") {
        return "127.0.0.1";
    }
    if (!isValidIpAddress(unwrapped))
        return unwrapped;
    return net_1.default.isIP(unwrapped) === 6
        ? ip_1.default.toString(ip_1.default.toBuffer(unwrapped))
        : unwrapped;
}
function isPrivateAddress(address) {
    try {
        return ip_1.default.isPrivate(unwrapV4Mapped(address));
    }
    catch (_a) {
        return false;
    }
}
const DEFAULT_TRUSTED_CIDRS = ["127.0.0.0/8", "::1/128"];
function describeProxyTrust() {
    var _a, _b;
    const raw = String((_a = process.env.TRUST_PROXY) !== null && _a !== void 0 ? _a : "").trim().toLowerCase();
    const declaredCidrs = String((_b = process.env.TRUST_PROXY_CIDRS) !== null && _b !== void 0 ? _b : "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    const mode = raw === "true" ? "all" : raw === "false" ? "none" : "default";
    return {
        mode,
        declaredCidrs,
        edgeHeaders: mode === "all" || declaredCidrs.length > 0,
    };
}
function withinCidr(address, cidr) {
    try {
        const slash = cidr.indexOf("/");
        if (slash === -1)
            return unwrapV4Mapped(cidr) === address;
        const network = unwrapV4Mapped(cidr.slice(0, slash));
        const prefix = Number(cidr.slice(slash + 1));
        if (!Number.isInteger(prefix) || prefix < 0)
            return false;
        const target = ip_1.default.toBuffer(address);
        const base = ip_1.default.toBuffer(network);
        if (target.length !== base.length)
            return false;
        if (prefix > target.length * 8)
            return false;
        const wholeBytes = prefix >> 3;
        const spareBits = prefix & 7;
        if (wholeBytes &&
            !target.subarray(0, wholeBytes).equals(base.subarray(0, wholeBytes))) {
            return false;
        }
        if (!spareBits)
            return true;
        const mask = 0xff << (8 - spareBits);
        return (target[wholeBytes] & mask) === (base[wholeBytes] & mask);
    }
    catch (_a) {
        return false;
    }
}
function isTrustedProxyAddress(address) {
    const policy = describeProxyTrust();
    if (policy.mode === "none")
        return false;
    const candidate = unwrapV4Mapped(address);
    if (!isValidIpAddress(candidate))
        return false;
    for (const cidr of DEFAULT_TRUSTED_CIDRS) {
        if (withinCidr(candidate, cidr))
            return true;
    }
    for (const cidr of policy.declaredCidrs) {
        if (withinCidr(candidate, cidr))
            return true;
    }
    return false;
}
function peerMaySpeakForOthers(peer) {
    const policy = describeProxyTrust();
    if (policy.mode === "none")
        return false;
    if (policy.mode === "all")
        return true;
    return isTrustedProxyAddress(peer);
}
function forwardedHops(value) {
    if (!value)
        return [];
    const raw = Array.isArray(value) ? value.join(",") : value;
    return raw.split(",").map((entry) => entry.trim().replace(/^\[|\]$/g, ""));
}
const EDGE_HEADERS = ["cf-connecting-ip", "true-client-ip", "x-real-ip"];
function getClientIp(peerAddress, forwardedFor, headers) {
    const peer = normalizeIpAddress(peerAddress);
    if (!peerMaySpeakForOthers(peer))
        return peer;
    const policy = describeProxyTrust();
    if (policy.edgeHeaders && headers) {
        for (const name of EDGE_HEADERS) {
            const value = headers[name];
            const candidate = Array.isArray(value) ? value[0] : value;
            const hops = forwardedHops(candidate);
            if (hops.length === 1 && isValidIpAddress(hops[0])) {
                return normalizeIpAddress(hops[0]);
            }
        }
    }
    const hops = forwardedHops(forwardedFor);
    for (let i = hops.length - 1; i >= 0; i--) {
        if (!isValidIpAddress(hops[i]))
            return peer;
        const hop = normalizeIpAddress(hops[i]);
        if (!isTrustedProxyAddress(hop))
            return hop;
    }
    return peer;
}
function requestClientIp(req) {
    var _a;
    if (typeof (req === null || req === void 0 ? void 0 : req.clientIp) === "string" && req.clientIp)
        return req.clientIp;
    const peer = (req === null || req === void 0 ? void 0 : req.remoteAddress)
        ? normalizeIpAddress(req.remoteAddress)
        : "unknown";
    return getClientIp(peer, (_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-for"], req === null || req === void 0 ? void 0 : req.headers);
}
