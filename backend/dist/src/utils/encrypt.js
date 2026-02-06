"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEncryptionKey = setEncryptionKey;
exports.setDynamicEncryptionKey = setDynamicEncryptionKey;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isUnlockedEcosystemVault = isUnlockedEcosystemVault;
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
let dynamicEncryptionKey = null;
const encryptedKey = process.env.ENCRYPTED_ENCRYPTION_KEY;
const passphrase = process.env.ENCRYPTION_KEY_PASSPHRASE;
if (encryptedKey && passphrase) {
    setEncryptionKey(passphrase);
}
function decryptEncryptionKey(encryptedKey, passphrase) {
    if (!encryptedKey || !passphrase) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Encrypted key or passphrase is missing" });
    }
    try {
        const [iv, authTag, cipherText, salt] = encryptedKey
            .split(":")
            .map((part) => Buffer.from(part, "hex"));
        const key = crypto_1.default.pbkdf2Sync(passphrase, salt, 100000, 32, "sha512");
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(cipherText, undefined, "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    catch (error) {
        console_1.logger.error("ENCRYPT", "Decryption failed", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Decryption failed" });
    }
}
async function setEncryptionKey(passphrase) {
    if (!passphrase) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Passphrase is required to set encryption key" });
    }
    if (!encryptedKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Encrypted key is required to set encryption key" });
    }
    try {
        const decryptedKey = decryptEncryptionKey(encryptedKey, passphrase);
        setDynamicEncryptionKey(decryptedKey);
        return true;
    }
    catch (error) {
        console_1.logger.error("ENCRYPT", "Failed to set the encryption key", error);
        return false;
    }
}
function setDynamicEncryptionKey(key) {
    if (!key) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Encryption key is required" });
    }
    dynamicEncryptionKey = Buffer.from(key, "hex");
}
function encrypt(text) {
    if (!dynamicEncryptionKey) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Encryption key is not set" });
    }
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", dynamicEncryptionKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}
function decrypt(text) {
    if (!dynamicEncryptionKey) {
        console_1.logger.error("ENCRYPT", "Encryption key is not set");
        throw (0, error_1.createError)({ statusCode: 500, message: "Encryption key is not set" });
    }
    try {
        const parts = text.split(":");
        if (parts.length !== 3) {
            console_1.logger.error("ENCRYPT", `Invalid encrypted text format, expected 3 parts, got ${parts.length}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid encrypted text format" });
        }
        const [ivHex, authTagHex, encryptedText] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", dynamicEncryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    catch (error) {
        console_1.logger.error("ENCRYPT", "Decryption failed", error);
        if (error.message.includes("Unsupported state")) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid encryption data or wrong encryption key" });
        }
        throw error;
    }
}
function isUnlockedEcosystemVault() {
    return !!dynamicEncryptionKey;
}
