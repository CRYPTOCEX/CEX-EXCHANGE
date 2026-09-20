"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEO_CLIENT_IP_HEADER = void 0;
exports.resolveClientIp = resolveClientIp;
exports.isPrivateIp = isPrivateIp;
exports.matchesIpEntry = matchesIpEntry;
exports.matchesIpList = matchesIpList;
exports.validateIpEntry = validateIpEntry;
const ip_1 = __importDefault(require("ip"));
const address_parser_1 = require("@b/handler/utils/address-parser");
exports.GEO_CLIENT_IP_HEADER = "x-geo-client-ip";
function resolveClientIp(peerAddress, headers) {
    var _a;
    const peer = (0, address_parser_1.normalizeIpAddress)(peerAddress);
    if ((0, address_parser_1.isTrustedProxyAddress)(peer)) {
        const relayed = String((_a = headers === null || headers === void 0 ? void 0 : headers[exports.GEO_CLIENT_IP_HEADER]) !== null && _a !== void 0 ? _a : "").trim();
        if (relayed && (0, address_parser_1.isValidIpAddress)(relayed))
            return (0, address_parser_1.normalizeIpAddress)(relayed);
    }
    return (0, address_parser_1.getClientIp)(peer, headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"], headers);
}
function isPrivateIp(address) {
    return (0, address_parser_1.isPrivateAddress)(address);
}
const V4_MAPPED_PREFIX = Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff,
]);
function toComparableBuffer(address) {
    try {
        const buf = ip_1.default.toBuffer(address.trim());
        if (buf.length === 16 && buf.subarray(0, 12).equals(V4_MAPPED_PREFIX)) {
            return buf.subarray(12);
        }
        return buf;
    }
    catch (_a) {
        return null;
    }
}
function sharesPrefix(a, b, bits) {
    const wholeBytes = bits >> 3;
    const remainderBits = bits & 7;
    if (wholeBytes > a.length)
        return false;
    if (wholeBytes && !a.subarray(0, wholeBytes).equals(b.subarray(0, wholeBytes))) {
        return false;
    }
    if (!remainderBits)
        return true;
    if (wholeBytes >= a.length)
        return false;
    const mask = 0xff << (8 - remainderBits);
    return (a[wholeBytes] & mask) === (b[wholeBytes] & mask);
}
function matchesIpEntry(address, entry) {
    if (!address || !entry)
        return false;
    const candidate = entry.trim();
    if (!candidate)
        return false;
    const target = toComparableBuffer(address);
    if (!target)
        return false;
    const slashAt = candidate.indexOf("/");
    if (slashAt === -1) {
        const exact = toComparableBuffer(candidate);
        return !!exact && exact.length === target.length && exact.equals(target);
    }
    const network = toComparableBuffer(candidate.slice(0, slashAt));
    if (!network || network.length !== target.length)
        return false;
    const prefix = Number(candidate.slice(slashAt + 1));
    const maxBits = network.length * 8;
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxBits)
        return false;
    return sharesPrefix(network, target, prefix);
}
function matchesIpList(address, list) {
    if (!address || !(list === null || list === void 0 ? void 0 : list.length))
        return false;
    for (const entry of list) {
        if (matchesIpEntry(address, entry))
            return true;
    }
    return false;
}
function validateIpEntry(entry) {
    const candidate = String(entry !== null && entry !== void 0 ? entry : "").trim();
    if (!candidate)
        return "Entry is empty";
    const slashAt = candidate.indexOf("/");
    if (slashAt === -1) {
        return toComparableBuffer(candidate)
            ? null
            : `"${candidate}" is not a valid IP address`;
    }
    const network = toComparableBuffer(candidate.slice(0, slashAt));
    if (!network)
        return `"${candidate}" does not start with a valid IP address`;
    const prefix = Number(candidate.slice(slashAt + 1));
    const maxBits = network.length * 8;
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxBits) {
        return `"${candidate}" must end with a prefix length between 0 and ${maxBits}`;
    }
    return null;
}
