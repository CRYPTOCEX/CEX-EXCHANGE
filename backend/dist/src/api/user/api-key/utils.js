"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_API_KEY_PERMISSIONS = void 0;
exports.generateApiKey = generateApiKey;
exports.generateApiSecret = generateApiSecret;
exports.validateApiKeyPermissions = validateApiKeyPermissions;
const crypto_1 = __importDefault(require("crypto"));
const error_1 = require("@b/utils/error");
const API_KEY_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateApiKey(length = 64) {
    const charsLen = API_KEY_CHARACTERS.length;
    const max = 256 - (256 % charsLen);
    const out = [];
    while (out.length < length) {
        const buf = crypto_1.default.randomBytes(length * 2);
        for (let i = 0; i < buf.length && out.length < length; i++) {
            const b = buf[i];
            if (b >= max)
                continue;
            out.push(API_KEY_CHARACTERS.charAt(b % charsLen));
        }
    }
    return out.join("");
}
function generateApiSecret(byteLength = 48) {
    return crypto_1.default
        .randomBytes(byteLength)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
exports.ALLOWED_API_KEY_PERMISSIONS = [
    "trade",
    "futures",
    "deposit",
    "withdraw",
    "transfer",
];
function validateApiKeyPermissions(permissions) {
    if (permissions === undefined || permissions === null)
        return [];
    if (!Array.isArray(permissions)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "permissions must be an array of scope strings.",
        });
    }
    const invalid = permissions.filter((p) => typeof p !== "string" ||
        !exports.ALLOWED_API_KEY_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid API key permission(s): ${invalid.join(", ")}. Allowed: ${exports.ALLOWED_API_KEY_PERMISSIONS.join(", ")}.`,
        });
    }
    return Array.from(new Set(permissions));
}
