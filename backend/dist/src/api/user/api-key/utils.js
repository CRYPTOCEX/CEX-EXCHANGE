"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
const crypto = require("crypto");
const API_KEY_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateApiKey(length = 64) {
    // Use CSPRNG. Rejection sampling avoids modulo bias against the 62-char alphabet.
    const charactersLength = API_KEY_CHARACTERS.length;
    const maxByte = Math.floor(256 / charactersLength) * charactersLength; // 248 for 62 chars
    let apiKey = "";
    while (apiKey.length < length) {
        const bytes = crypto.randomBytes(length - apiKey.length);
        for (let i = 0; i < bytes.length && apiKey.length < length; i++) {
            if (bytes[i] < maxByte) {
                apiKey += API_KEY_CHARACTERS.charAt(bytes[i] % charactersLength);
            }
        }
    }
    return apiKey;
}
