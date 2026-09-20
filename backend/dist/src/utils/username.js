"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERNAME_PATTERN = exports.USERNAME_MAX = exports.USERNAME_MIN = void 0;
exports.isAbusiveUsername = isAbusiveUsername;
exports.normalizeUsername = normalizeUsername;
exports.validateUsernameShape = validateUsernameShape;
exports.isUsernameFree = isUsernameFree;
exports.suggestUsernames = suggestUsernames;
exports.checkUsername = checkUsername;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.USERNAME_MIN = 3;
exports.USERNAME_MAX = 32;
exports.USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)*$/;
const RESERVED = new Set([
    "admin", "administrator", "root", "superadmin", "sysadmin", "staff", "team",
    "support", "help", "helpdesk", "helpcenter", "customerservice", "service",
    "moderator", "mod", "official", "verified", "security", "system", "bot",
    "operator", "compliance", "kyc", "billing", "finance", "payments", "payment",
    "escrow", "noreply", "no_reply", "postmaster", "abuse", "legal",
    "api", "auth", "login", "logout", "register", "signup", "signin", "settings",
    "account", "profile", "user", "users", "me", "home", "dashboard", "wallet",
    "trade", "trades", "offer", "offers", "market", "p2p", "exchange", "blog",
    "news", "about", "terms", "privacy", "contact", "faq", "docs", "status",
    "static", "assets", "public", "uploads", "img", "images", "cdn", "www",
    "null", "undefined", "none", "anonymous", "unknown", "deleted",
    ...system_accounts_1.SYSTEM_ACCOUNT_USERNAMES,
]);
const PROFANITY = new Set([
    "fuck", "fucker", "fucking", "motherfucker", "shit", "shite", "bullshit",
    "cunt", "bitch", "bastard", "wanker", "bollocks", "prick", "twat",
    "dick", "cock", "penis", "vagina", "pussy", "arsehole", "asshole", "arse",
    "whore", "slut", "rape", "rapist", "paedo", "pedo", "paedophile", "pedophile",
    "nazi", "hitler", "kkk", "isis",
]);
const ALWAYS_BANNED = ["nigger", "nigga", "faggot", "chink", "spic", "kike"];
function deleetify(value) {
    return value
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/7/g, "t")
        .replace(/8/g, "b");
}
function isAbusiveUsername(input) {
    const key = String(input !== null && input !== void 0 ? input : "").trim().toLowerCase();
    if (!key)
        return false;
    const folded = deleetify(key);
    for (const term of ALWAYS_BANNED) {
        if (folded.includes(term) || key.includes(term))
            return true;
    }
    const tokens = new Set([key, folded]);
    for (const segment of key.split("_")) {
        if (segment) {
            tokens.add(segment);
            tokens.add(deleetify(segment));
        }
    }
    for (const token of tokens) {
        if (PROFANITY.has(token))
            return true;
    }
    return false;
}
function normalizeUsername(input) {
    return String(input !== null && input !== void 0 ? input : "").trim().toLowerCase();
}
function validateUsernameShape(input) {
    const raw = String(input !== null && input !== void 0 ? input : "").trim();
    const key = raw.toLowerCase();
    if (key.length < exports.USERNAME_MIN) {
        return {
            ok: false,
            reason: "TOO_SHORT",
            message: `Usernames are at least ${exports.USERNAME_MIN} characters.`,
        };
    }
    if (key.length > exports.USERNAME_MAX) {
        return {
            ok: false,
            reason: "TOO_LONG",
            message: `Usernames are at most ${exports.USERNAME_MAX} characters.`,
        };
    }
    if (!exports.USERNAME_PATTERN.test(raw)) {
        return {
            ok: false,
            reason: "BAD_SHAPE",
            message: "Use letters, numbers and single underscores. Start with a letter, and don't end with an underscore.",
        };
    }
    if (RESERVED.has(key)) {
        return {
            ok: false,
            reason: "RESERVED",
            message: "That one is reserved by the platform. Pick something else.",
        };
    }
    if (isAbusiveUsername(raw)) {
        return {
            ok: false,
            reason: "ABUSIVE",
            message: "Pick a different handle — that one is not allowed here.",
        };
    }
    return { ok: true, value: raw };
}
async function isUsernameFree(candidate, exceptUserId) {
    const key = normalizeUsername(candidate);
    if (!key)
        return false;
    const where = { username: key };
    if (exceptUserId)
        where.id = { [sequelize_1.Op.ne]: exceptUserId };
    const existing = await db_1.models.user.findOne({
        attributes: ["id"],
        where,
        paranoid: false,
    });
    return !existing;
}
async function suggestUsernames(base, limit = 5, exceptUserId) {
    const stem = String(base !== null && base !== void 0 ? base : "")
        .trim()
        .replace(/[^A-Za-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, exports.USERNAME_MAX - 3);
    if (stem.length < 1 || !/^[A-Za-z]/.test(stem))
        return [];
    const candidates = [];
    const push = (value) => {
        if (value.length > exports.USERNAME_MAX)
            return;
        if (!exports.USERNAME_PATTERN.test(value))
            return;
        if (RESERVED.has(value.toLowerCase()))
            return;
        if (isAbusiveUsername(value))
            return;
        if (!candidates.includes(value))
            candidates.push(value);
    };
    for (let n = 1; n <= 9; n++)
        push(`${stem}0${n}`);
    for (let n = 10; n <= 30; n++)
        push(`${stem}${n}`);
    push(`${stem}_p2p`);
    push(`${stem}_trades`);
    push(`real_${stem}`);
    const free = [];
    for (const candidate of candidates) {
        if (free.length >= limit)
            break;
        if (await isUsernameFree(candidate, exceptUserId))
            free.push(candidate);
    }
    return free;
}
async function checkUsername(input, exceptUserId) {
    const shape = validateUsernameShape(input);
    if (!shape.ok)
        return shape;
    const free = await isUsernameFree(shape.value, exceptUserId);
    if (!free) {
        return {
            ok: false,
            reason: "TAKEN",
            message: "That username is taken.",
        };
    }
    return shape;
}
