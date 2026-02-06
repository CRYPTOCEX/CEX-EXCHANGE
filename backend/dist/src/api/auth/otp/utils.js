"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isEncrypted = isEncrypted;
exports.getUserById = getUserById;
exports.getUserWith2FA = getUserWith2FA;
exports.validateOtpRequest = validateOtpRequest;
exports.verifyOtp = verifyOtp;
exports.normalizeCode = normalizeCode;
exports.consumeRecoveryCode = consumeRecoveryCode;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const otplib_1 = require("otplib");
const console_1 = require("@b/utils/console");
const crypto = __importStar(require("crypto"));
const ENC_ALGO = "aes-256-gcm";
const APP_VERIFY_TOKEN_SECRET = process.env.APP_VERIFY_TOKEN_SECRET || "";
let ENC_KEY;
try {
    if (APP_VERIFY_TOKEN_SECRET.length === 64) {
        ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET, "hex");
    }
    else if (APP_VERIFY_TOKEN_SECRET.length === 32) {
        ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET, "utf8");
    }
    else if (APP_VERIFY_TOKEN_SECRET.length > 32) {
        ENC_KEY = Buffer.from(APP_VERIFY_TOKEN_SECRET.slice(0, 32), "utf8");
    }
    else {
        const padded = APP_VERIFY_TOKEN_SECRET.padEnd(32, "0");
        ENC_KEY = Buffer.from(padded, "utf8");
    }
    if (ENC_KEY.length !== 32) {
        ENC_KEY = crypto.createHash("sha256").update(APP_VERIFY_TOKEN_SECRET || "fallback-secret").digest();
    }
}
catch (error) {
    console_1.logger.warn("AUTH", "Failed to process APP_VERIFY_TOKEN_SECRET, using fallback key generation");
    ENC_KEY = crypto.createHash("sha256").update(APP_VERIFY_TOKEN_SECRET || "fallback-secret").digest();
}
function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
    const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}
function decrypt(data) {
    const [ivHex, tagHex, encHex] = data.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
}
function isEncrypted(secret) {
    if (typeof secret !== "string")
        return false;
    const parts = secret.split(":");
    return (parts.length === 3 && parts.every((part) => /^[0-9a-fA-F]{16,}$/.test(part)));
}
async function getUserById(userId) {
    const user = await db_1.models.user.findByPk(userId);
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 400, message: "User not found" });
    }
    return user;
}
async function getUserWith2FA(userId) {
    var _a;
    const user = await db_1.models.user.findOne({
        where: { id: userId },
        include: {
            model: db_1.models.twoFactor,
            as: "twoFactor",
        },
    });
    if (!user || !((_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.secret)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User not found or 2FA not enabled",
        });
    }
    return user;
}
function validateOtpRequest(id, otp) {
    if (!id || !otp) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters: 'id' and 'otp'",
        });
    }
}
function verifyOtp(secret, token) {
    return otplib_1.authenticator.verify({ token, secret });
}
function normalizeCode(code) {
    return code.replace(/-/g, "").toUpperCase();
}
async function consumeRecoveryCode(twoFactor, providedCode) {
    if (!twoFactor.recoveryCodes) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid OTP" });
    }
    let recoveryCodes;
    try {
        recoveryCodes = JSON.parse(twoFactor.recoveryCodes);
    }
    catch (e) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Invalid recovery codes format",
        });
    }
    const normalizedInput = normalizeCode(providedCode);
    const codeIndex = recoveryCodes.findIndex((code) => normalizeCode(code) === normalizedInput);
    if (codeIndex === -1) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Invalid OTP or recovery code",
        });
    }
    recoveryCodes.splice(codeIndex, 1);
    await db_1.models.twoFactor.update({ recoveryCodes: JSON.stringify(recoveryCodes) }, { where: { id: twoFactor.id } });
}
