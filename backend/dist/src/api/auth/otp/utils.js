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
exports.resolveTwoFactorSecret = resolveTwoFactorSecret;
exports.validateOtpRequest = validateOtpRequest;
exports.verifyOtp = verifyOtp;
exports.consumeEnrolledOtp = consumeEnrolledOtp;
exports.assertDisableProof = assertDisableProof;
exports.assertRebindProof = assertRebindProof;
exports.assertPhoneChangeProof = assertPhoneChangeProof;
exports.normalizeCode = normalizeCode;
exports.hashRecoveryCodes = hashRecoveryCodes;
exports.consumeRecoveryCode = consumeRecoveryCode;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const console_1 = require("@b/utils/console");
const passwords_1 = require("@b/utils/passwords");
const two_factor_replay_1 = require("@b/utils/two-factor-replay");
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
function resolveTwoFactorSecret(twoFactor) {
    const secret = twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.secret;
    if (!secret) {
        throw (0, error_1.createError)({ statusCode: 400, message: "2FA is not configured" });
    }
    if (!isEncrypted(secret))
        return secret;
    try {
        return decrypt(secret);
    }
    catch (err) {
        console_1.logger.error("AUTH", "Failed to decrypt 2FA secret", err);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not decrypt 2FA secret. User data may be corrupted.",
        });
    }
}
function validateOtpRequest(id, otp) {
    if (!id || !otp) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required parameters: 'id' and 'otp'",
        });
    }
}
function verifyOtp(secret, token, type) {
    return (0, two_factor_code_1.verifyTwoFactorCode)(secret, token, type);
}
async function consumeEnrolledOtp(userId, secret, token, type) {
    if (!verifyOtp(secret, token, type))
        return false;
    return await (0, two_factor_replay_1.claimTwoFactorCode)(userId, token);
}
async function assertDisableProof(userId, twoFactor, body) {
    const { otp, password } = body;
    if (otp) {
        if (await consumeEnrolledOtp(userId, resolveTwoFactorSecret(twoFactor), String(otp), twoFactor.type))
            return;
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "That code is not valid. Please try the current one.",
        });
    }
    if (password) {
        const account = await db_1.models.user.findByPk(userId);
        if (!(account === null || account === void 0 ? void 0 : account.password)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This account has no password set. Enter a code from your two-factor method instead.",
            });
        }
        if (await (0, passwords_1.verifyPassword)(account.password, String(password)))
            return;
        throw (0, error_1.createError)({ statusCode: 401, message: "Incorrect password" });
    }
    throw (0, error_1.createError)({
        statusCode: 400,
        message: "Disabling two-factor authentication requires a current code from your two-factor method, or your account password.",
    });
}
async function assertRebindProof(userId, newSecret, currentOtp, ctx) {
    const enrolled = await db_1.models.twoFactor.findOne({ where: { userId } });
    if (!enrolled || !enrolled.enabled)
        return;
    let enrolledSecret = null;
    try {
        enrolledSecret = resolveTwoFactorSecret(enrolled);
    }
    catch (_a) {
        enrolledSecret = null;
    }
    if (enrolledSecret !== null && enrolledSecret === newSecret)
        return;
    await requireEnrolledFactorProof(enrolled, enrolledSecret, currentOtp, "Two-factor authentication is already enabled on this account. To " +
        "replace it, enter a current code from your existing method or one " +
        "of your recovery codes — or turn two-factor off first, then set " +
        "the new method up.", "Verifying the existing factor before replacing it", ctx);
}
async function assertPhoneChangeProof(userId, newPhone, currentOtp, ctx) {
    if (typeof newPhone !== "string" && typeof newPhone !== "number")
        return;
    const enrolled = await db_1.models.twoFactor.findOne({ where: { userId } });
    if (!enrolled || !enrolled.enabled || enrolled.type !== "SMS")
        return;
    const digits = (value) => String(value !== null && value !== void 0 ? value : "").replace(/\D/g, "");
    const account = await db_1.models.user.findByPk(userId);
    if (digits(account === null || account === void 0 ? void 0 : account.phone) === digits(newPhone))
        return;
    let enrolledSecret = null;
    try {
        enrolledSecret = resolveTwoFactorSecret(enrolled);
    }
    catch (_a) {
        enrolledSecret = null;
    }
    await requireEnrolledFactorProof(enrolled, enrolledSecret, currentOtp, "This account uses SMS two-factor authentication, so its phone number " +
        "can only be changed with a current code from that number or one of " +
        "your recovery codes — or turn two-factor off first, change the " +
        "number, then set it up again.", "Verifying the SMS factor before moving where its codes are sent", ctx);
}
async function requireEnrolledFactorProof(enrolled, enrolledSecret, currentOtp, missingMessage, step, ctx) {
    var _a;
    if (currentOtp === undefined || currentOtp === null || currentOtp === "") {
        throw (0, error_1.createError)({ statusCode: 401, message: missingMessage });
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, step);
    const token = String(currentOtp);
    if (enrolledSecret !== null &&
        (await consumeEnrolledOtp(enrolled.userId, enrolledSecret, token, enrolled.type))) {
        return;
    }
    await consumeRecoveryCode({ id: enrolled.id, recoveryCodes: enrolled.recoveryCodes }, token);
}
function normalizeCode(code) {
    return code.replace(/-/g, "").toUpperCase();
}
const RECOVERY_CODE_SHAPE = /^[0-9A-F]{12}$/;
function isHashedRecoveryCode(entry) {
    return typeof entry === "string" && entry.startsWith("$argon2");
}
function isHashableRecoveryCode(entry) {
    return typeof entry === "string" && RECOVERY_CODE_SHAPE.test(normalizeCode(entry));
}
async function hashRecoveryCodes(codes) {
    const hashed = [];
    for (const code of codes) {
        hashed.push(await (0, passwords_1.hashPassword)(normalizeCode(code)));
    }
    return hashed;
}
async function consumeRecoveryCode(twoFactor, providedCode) {
    if (!(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid OTP" });
    }
    const normalizedInput = normalizeCode(providedCode);
    const couldBeARecoveryCode = RECOVERY_CODE_SHAPE.test(normalizedInput);
    await db_1.sequelize.transaction(async (t) => {
        const row = await db_1.models.twoFactor.findByPk(twoFactor.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!(row === null || row === void 0 ? void 0 : row.recoveryCodes)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Invalid OTP" });
        }
        let recoveryCodes;
        try {
            recoveryCodes = JSON.parse(row.recoveryCodes);
        }
        catch (e) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Invalid recovery codes format",
            });
        }
        let codeIndex = -1;
        for (let i = 0; i < recoveryCodes.length; i++) {
            const entry = recoveryCodes[i];
            if (isHashedRecoveryCode(entry)) {
                if (!couldBeARecoveryCode)
                    continue;
                let matched = false;
                try {
                    matched = await (0, passwords_1.verifyPassword)(entry, normalizedInput);
                }
                catch (_a) {
                    matched = false;
                }
                if (matched) {
                    codeIndex = i;
                    break;
                }
            }
            else if (typeof entry === "string" &&
                normalizeCode(entry) === normalizedInput) {
                codeIndex = i;
                break;
            }
        }
        if (codeIndex === -1) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid OTP or recovery code",
            });
        }
        recoveryCodes.splice(codeIndex, 1);
        const stored = [];
        for (const entry of recoveryCodes) {
            stored.push(isHashedRecoveryCode(entry) || !isHashableRecoveryCode(entry)
                ? entry
                : await (0, passwords_1.hashPassword)(normalizeCode(entry)));
        }
        await db_1.models.twoFactor.update({ recoveryCodes: JSON.stringify(stored) }, { where: { id: row.id }, transaction: t });
    });
}
