"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTECTED_SYSTEM_ACCOUNT_FIELDS = exports.SYSTEM_ACCOUNT_SIGN_IN_MESSAGE = exports.UNDELIVERABLE_EMAIL_DOMAINS = exports.RESERVED_EMAIL_DOMAINS = exports.SYSTEM_ACCOUNT_USERNAMES = exports.SYSTEM_ACCOUNT_EMAILS = exports.SYSTEM_ACCOUNT_IDS = exports.SYSTEM_ACCOUNTS = exports.AI_POOL_USERNAME = exports.AI_POOL_EMAIL = exports.AI_POOL_USER_ID = exports.POOL_BACKING_TREASURY_USERNAME = exports.POOL_BACKING_TREASURY_EMAIL = exports.POOL_BACKING_TREASURY_USER_ID = void 0;
exports.isSystemAccountId = isSystemAccountId;
exports.isSystemAccountEmail = isSystemAccountEmail;
exports.isSystemAccountUsername = isSystemAccountUsername;
exports.isReservedEmailDomain = isReservedEmailDomain;
exports.isReservedEmail = isReservedEmail;
exports.isUndeliverableEmail = isUndeliverableEmail;
exports.isUnmailableRecipient = isUnmailableRecipient;
exports.isSystemAccount = isSystemAccount;
exports.systemAccountFor = systemAccountFor;
exports.describeSystemAccount = describeSystemAccount;
exports.systemAccountRefusal = systemAccountRefusal;
exports.assertNotSystemAccount = assertNotSystemAccount;
exports.assertNoneAreSystemAccounts = assertNoneAreSystemAccounts;
exports.systemAccountSignInRefusal = systemAccountSignInRefusal;
const error_1 = require("@b/utils/error");
exports.POOL_BACKING_TREASURY_USER_ID = "b0000000-0000-4000-b000-000000000001";
exports.POOL_BACKING_TREASURY_EMAIL = "pool-backing@treasury.invalid";
exports.POOL_BACKING_TREASURY_USERNAME = "pool_backing_treasury";
exports.AI_POOL_USER_ID = "a1000000-0000-4000-a000-000000000001";
exports.AI_POOL_EMAIL = "ai-market-maker@pool.invalid";
exports.AI_POOL_USERNAME = "ai_market_maker";
exports.SYSTEM_ACCOUNTS = Object.freeze([
    {
        id: exports.POOL_BACKING_TREASURY_USER_ID,
        email: exports.POOL_BACKING_TREASURY_EMAIL,
        username: exports.POOL_BACKING_TREASURY_USERNAME,
        name: "pool-backing treasury",
    },
    {
        id: exports.AI_POOL_USER_ID,
        email: exports.AI_POOL_EMAIL,
        username: exports.AI_POOL_USERNAME,
        name: "AI market maker pool",
    },
]);
exports.SYSTEM_ACCOUNT_IDS = new Set(exports.SYSTEM_ACCOUNTS.map((account) => account.id));
exports.SYSTEM_ACCOUNT_EMAILS = new Set(exports.SYSTEM_ACCOUNTS.map((account) => account.email));
exports.SYSTEM_ACCOUNT_USERNAMES = new Set(exports.SYSTEM_ACCOUNTS.map((account) => account.username));
exports.RESERVED_EMAIL_DOMAINS = Object.freeze([".invalid"]);
exports.UNDELIVERABLE_EMAIL_DOMAINS = Object.freeze([
    ".invalid",
    ".test",
    ".example",
    ".localhost",
]);
const normalizeEmail = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";
function isSystemAccountId(id) {
    return typeof id === "string" ? exports.SYSTEM_ACCOUNT_IDS.has(id) : false;
}
function isSystemAccountEmail(email) {
    const normalized = normalizeEmail(email);
    return normalized !== "" && exports.SYSTEM_ACCOUNT_EMAILS.has(normalized);
}
function isSystemAccountUsername(username) {
    return typeof username === "string"
        ? exports.SYSTEM_ACCOUNT_USERNAMES.has(username.trim().toLowerCase())
        : false;
}
function isReservedEmailDomain(email) {
    const normalized = normalizeEmail(email);
    if (!normalized)
        return false;
    return exports.RESERVED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
}
function isReservedEmail(email) {
    return isSystemAccountEmail(email) || isReservedEmailDomain(email);
}
function isUndeliverableEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized)
        return false;
    return exports.UNDELIVERABLE_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
}
function isUnmailableRecipient(email) {
    return isSystemAccountEmail(email) || isUndeliverableEmail(email);
}
function isSystemAccount(subject) {
    if (subject == null)
        return false;
    if (typeof subject === "string") {
        return isSystemAccountId(subject) || isSystemAccountEmail(subject);
    }
    if (typeof subject === "object") {
        const row = subject;
        return (isSystemAccountId(row.id) ||
            isSystemAccountEmail(row.email) ||
            isSystemAccountId(row.userId));
    }
    return false;
}
function systemAccountFor(subject) {
    var _a, _b;
    if (subject == null)
        return null;
    const id = typeof subject === "string"
        ? subject
        : typeof subject === "object"
            ? ((_a = subject.id) !== null && _a !== void 0 ? _a : subject.userId)
            : undefined;
    const email = typeof subject === "string"
        ? subject
        : typeof subject === "object"
            ? subject.email
            : undefined;
    const normalizedEmail = normalizeEmail(email);
    return ((_b = exports.SYSTEM_ACCOUNTS.find((account) => account.id === id || (normalizedEmail !== "" && account.email === normalizedEmail))) !== null && _b !== void 0 ? _b : null);
}
function describeSystemAccount(subject) {
    var _a;
    const account = systemAccountFor(subject);
    return `the platform's own ${(_a = account === null || account === void 0 ? void 0 : account.name) !== null && _a !== void 0 ? _a : "system"} account`;
}
function systemAccountRefusal(subject, action) {
    return (0, error_1.createError)({
        statusCode: 403,
        message: `This is ${describeSystemAccount(subject)}; it cannot be ${action}.`,
    });
}
function assertNotSystemAccount(subject, action) {
    if (isSystemAccount(subject))
        throw systemAccountRefusal(subject, action);
}
function assertNoneAreSystemAccounts(subjects, action) {
    if (!Array.isArray(subjects))
        return;
    for (const subject of subjects)
        assertNotSystemAccount(subject, action);
}
exports.SYSTEM_ACCOUNT_SIGN_IN_MESSAGE = "Incorrect email or password";
function systemAccountSignInRefusal() {
    return (0, error_1.createError)({ statusCode: 401, message: exports.SYSTEM_ACCOUNT_SIGN_IN_MESSAGE });
}
exports.PROTECTED_SYSTEM_ACCOUNT_FIELDS = Object.freeze([
    "email",
    "password",
    "username",
    "roleId",
    "status",
    "emailVerified",
    "phone",
    "phoneVerified",
    "walletAddress",
    "walletProvider",
    "deletedAt",
]);
